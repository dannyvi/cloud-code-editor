'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { CodeEditor } from '@/components/CodeEditor';
import { FileExplorer } from '@/components/FileExplorer';
import { PreviewFrame } from '@/components/PreviewFrame';
import { Button } from '@/components/ui/button';
import { Play, Save, Settings, Wifi, WifiOff, Square, RotateCcw, ArrowLeft, CheckCircle, Clock, ExternalLink, Copy, RefreshCw, X } from 'lucide-react';
import { RealtimeClient, syncFileUpdate, debounce, sendContainerOperation, getContainerStatus } from '@/lib/realtime';
import { FileManager, FileTreeNode } from '@/lib/file-manager';
import { ProjectManager, Project } from '@/lib/supabase';
import Link from 'next/link';

export default function EditorPageContent() {
  const searchParams = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'open' | 'collapsed' | 'hidden'>('open');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [containerStatus, setContainerStatus] = useState<string>('stopped');
  const [containerUrl, setContainerUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // 面板宽度状态
  const [fileExplorerWidth, setFileExplorerWidth] = useState<number>(256); // 256px
  const [previewWidth, setPreviewWidth] = useState<number>(50); // 50%
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isFileExplorerCollapsed, setIsFileExplorerCollapsed] = useState<boolean>(false);
  
  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const lastSyncRef = useRef<string>(''); // 防止循环同步
  const isEditingRef = useRef<boolean>(false); // 跟踪编辑状态
  const lastEditTimeRef = useRef<number>(0); // 最后编辑时间
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 同步定时器
  const editorVersionRef = useRef<number>(0); // 编辑器版本号
  const containerRef = useRef<HTMLDivElement>(null); // 容器引用

  // 优化的拖拽处理函数，使用 useCallback 避免重复创建
  const handleMouseDown = useCallback((type: 'fileExplorer' | 'preview') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(type);
    // Y2K 风格的拖拽光标
    document.body.style.cursor = 'url("data:image/svg+xml,%3csvg width=\'32\' height=\'32\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cg fill=\'none\' stroke=\'%23d8b4fe\' stroke-width=\'2\'%3e%3cline x1=\'16\' y1=\'8\' x2=\'16\' y2=\'24\'/%3e%3cline x1=\'8\' y1=\'16\' x2=\'24\' y2=\'16\'/%3e%3c/g%3e%3c/svg%3e") 16 16, col-resize';
    document.body.style.userSelect = 'none';
    // 禁用页面过渡动画以提高拖拽性能
    document.body.style.pointerEvents = 'none';
  }, []);

  // 双击折叠/展开
  const handleDoubleClick = useCallback((type: 'fileExplorer' | 'preview') => () => {
    if (type === 'fileExplorer') {
      setIsFileExplorerCollapsed(!isFileExplorerCollapsed);
    }
  }, [isFileExplorerCollapsed]);

  // 高性能拖拽移动处理函数
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;

    if (isDragging === 'fileExplorer') {
      // 文件浏览器宽度约束：最小200px，最大500px
      const newWidth = Math.max(200, Math.min(500, e.clientX - containerRect.left));
      // 使用 requestAnimationFrame 确保平滑更新
      requestAnimationFrame(() => {
        setFileExplorerWidth(newWidth);
      });
    } else if (isDragging === 'preview') {
      const rightEdge = containerRect.right;
      const previewPixelWidth = rightEdge - e.clientX;
      // 预览面板宽度约束：最小25%，最大70%
      const newPreviewWidth = Math.max(25, Math.min(70, (previewPixelWidth / containerWidth) * 100));
      // 使用 requestAnimationFrame 确保平滑更新
      requestAnimationFrame(() => {
        setPreviewWidth(newPreviewWidth);
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
  }, []);

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // 加载项目文件的函数
  const loadProjectFiles = async (projectIdParam: string) => {
    try {
      const files = await FileManager.getProjectFiles(projectIdParam);
      const tree = FileManager.buildFileTree(files);
      setFileTree(tree);
      
      // 如果还没有选择文件，设置默认文件
      if (!currentFile && files.length > 0) {
        const defaultFile = files.find(f => 
          f.path === 'index.html' || 
          f.path === 'src/App.js' || 
          f.path === 'src/App.vue' || 
          f.path === 'app.py' ||
          f.path === 'index.js'
        ) || files[0];
        
        setCurrentFile(defaultFile.path);
        setCode(defaultFile.content);
      }
    } catch (error) {
      console.error('加载项目文件失败:', error);
    }
  };

  // 初始化项目数据
  useEffect(() => {
    const initializeProject = async () => {
      try {
        const projectIdParam = searchParams.get('project');
        if (!projectIdParam) {
          setError('缺少项目ID参数');
          return;
        }

        setProjectId(projectIdParam);
        
        // 获取项目信息
        const projectData = await ProjectManager.getProject(projectIdParam);
        if (!projectData) {
          setError('项目不存在');
          return;
        }
        setProject(projectData);

        // 获取项目文件
        await loadProjectFiles(projectIdParam);

      } catch (error) {
        console.error('初始化项目失败:', error);
        setError('加载项目失败');
      } finally {
        setLoading(false);
      }
    };

    initializeProject();
  }, [searchParams]); // loadProjectFiles 是稳定的函数，不需要添加到依赖中

  // 初始化实时连接
  useEffect(() => {
    if (!projectId) return;

    const realtimeClient = new RealtimeClient(projectId, {
      onConnected: () => {
        setIsConnected(true);
        console.log('实时同步已连接');
      },
      onDisconnected: () => {
        setIsConnected(false);
        console.log('实时同步已断开');
      },
      onFileUpdated: (data) => {
        // 智能同步：只在用户不在编辑时更新
        if (data.filename === currentFile && data.content !== lastSyncRef.current) {
          const now = Date.now();
          const timeSinceLastEdit = now - lastEditTimeRef.current;
          
          // 如果用户正在编辑且距离最后编辑不到3秒，忽略外部更新
          if (isEditingRef.current && timeSinceLastEdit < 3000) {
            console.log('用户正在编辑，忽略外部更新');
            return;
          }
          
          // 检查内容是否真的不同（忽略空白字符差异）
          const currentContentTrimmed = code.trim();
          const newContentTrimmed = data.content.trim();
          
          if (currentContentTrimmed !== newContentTrimmed) {
            console.log(`收到文件更新: ${data.filename}`);
            editorVersionRef.current++;
            setCode(data.content);
            lastSyncRef.current = data.content;
          }
        }
      },
      onContainerStatus: (data) => {
        setContainerStatus(data.status);
        console.log(`容器状态更新: ${data.status}`);
        
        // 如果容器启动成功，获取URL
        if (data.status === 'running' && projectId) {
          checkContainerUrl();
        }
      },
      onPreviewUpdated: () => {
        console.log('预览已更新');
      },
      onError: (error) => {
        console.error('实时同步错误:', error);
        setIsConnected(false);
      },
    });

    realtimeClientRef.current = realtimeClient;
    realtimeClient.connect();

    return () => {
      realtimeClient.disconnect();
      // 清理定时器
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [projectId, currentFile]);

  // 智能同步函数 - 避免编辑冲突
  const smartSync = async (content: string) => {
    if (!projectId) return;
    
    // 更新最后编辑时间和内容引用
    lastEditTimeRef.current = Date.now();
    lastSyncRef.current = content;
    
    try {
      setIsSaving(true);
      // 保存到 Supabase（只保存，不触发实时同步）
      await FileManager.saveFile(projectId, currentFile, content);
      console.log('文件已静默保存到数据库');
    } catch (error) {
      console.error('文件保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 防抖的同步函数
  const debouncedSync = debounce(smartSync, 800); // 减少到800ms提高响应性

  const handleFileSelect = async (filename: string) => {
    if (!projectId) return;
    
    try {
      // 切换文件时重置编辑状态
      isEditingRef.current = false;
      lastEditTimeRef.current = 0;
      editorVersionRef.current++;
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      
      const file = await FileManager.getFile(projectId, filename);
      if (file) {
        setCurrentFile(filename);
        setCode(file.content);
        lastSyncRef.current = file.content;
      }
    } catch (error) {
      console.error('加载文件失败:', error);
    }
  };

  const handleCodeChange = (newCode: string | undefined) => {
    if (newCode !== undefined) {
      // 标记用户正在编辑
      isEditingRef.current = true;
      lastEditTimeRef.current = Date.now();
      editorVersionRef.current++;
      
      setCode(newCode);
      
      // 清除之前的编辑结束定时器
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      // 设置编辑结束定时器（2秒后标记编辑结束）
      syncTimeoutRef.current = setTimeout(() => {
        isEditingRef.current = false;
        console.log('编辑会话结束');
      }, 2000);
      
      // 防抖同步到后端
      debouncedSync(newCode);
    }
  };

  const handleSave = async () => {
    if (!projectId) return;
    
    try {
      // 立即标记编辑结束
      isEditingRef.current = false;
      lastEditTimeRef.current = Date.now();
      
      // 保存到 Supabase
      const success = await FileManager.saveFile(projectId, currentFile, code);
      if (success) {
        console.log('文件保存成功:', currentFile);
        // 手动保存时才同步到实时系统，通知其他用户
        lastSyncRef.current = code;
        await syncFileUpdate(projectId, currentFile, code);
      } else {
        console.error('文件保存失败:', currentFile);
      }
    } catch (error) {
      console.error('保存文件异常:', error);
    }
  };

  const handleRun = async () => {
    if (!projectId) return;
    const success = await sendContainerOperation(projectId, 'start');
    if (success) {
      console.log('容器启动请求已发送');
    } else {
      console.error('容器启动失败');
    }
  };

  const handleStop = async () => {
    if (!projectId) return;
    const success = await sendContainerOperation(projectId, 'stop');
    if (success) {
      console.log('容器停止请求已发送');
    } else {
      console.error('容器停止失败');
    }
  };

  const handleRestart = async () => {
    if (!projectId) return;
    const success = await sendContainerOperation(projectId, 'restart');
    if (success) {
      console.log('容器重启请求已发送');
    } else {
      console.error('容器重启失败');
    }
  };

  const handleSync = async () => {
    if (!projectId) return;
    const success = await sendContainerOperation(projectId, 'sync');
    if (success) {
      console.log('项目文件同步请求已发送');
    } else {
      console.error('项目文件同步失败');
    }
  };

  // 检查容器URL
  const checkContainerUrl = async () => {
    if (!projectId) return;
    
    try {
      const status = await getContainerStatus(projectId);
      if (status && status.status === 'running') {
        // 从containerManager获取URL
        const response = await fetch(`/api/containers/url?projectId=${encodeURIComponent(projectId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.url) {
            setContainerUrl(data.url);
          }
        }
      } else {
        setContainerUrl('');
      }
    } catch (error) {
      console.error('获取容器URL失败:', error);
    }
  };

  // 定期检查容器状态
  useEffect(() => {
    if (!projectId) return;
    
    const checkContainerStatus = async () => {
      const status = await getContainerStatus(projectId);
      if (status) {
        setContainerStatus(status.status);
        
        // 如果容器运行中，同时检查URL
        if (status.status === 'running') {
          checkContainerUrl();
        } else {
          setContainerUrl('');
        }
      }
    };

    checkContainerStatus();
    const interval = setInterval(checkContainerStatus, 10000); // 每10秒检查一次

    return () => clearInterval(interval);
  }, [projectId]);

  const getLanguageFromFile = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'py': 'python',
      'vue': 'html',
      'md': 'markdown',
      'txt': 'plaintext',
    };
    return languageMap[ext || ''] || 'javascript';
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载项目中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">加载失败</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">{project?.name || 'Cloud Code Editor'}</h1>
          {currentFile && (
            <span className="text-sm text-muted-foreground">
              {currentFile}
            </span>
          )}
          <div className="flex items-center space-x-1">
            {isConnected ? (
              <div title="实时同步已连接">
                <Wifi className="h-4 w-4 text-green-500" />
              </div>
            ) : (
              <div title="实时同步断开">
                <WifiOff className="h-4 w-4 text-red-500" />
              </div>
            )}
            
            {/* 保存状态指示器 */}
            {isSaving ? (
              <div title="正在保存..." className="flex items-center">
                <Clock className="h-3 w-3 text-blue-500 animate-spin" />
                <span className="text-xs text-blue-600 ml-1">保存中</span>
              </div>
            ) : (
              <div title="已保存" className="flex items-center">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600 ml-1">已保存</span>
              </div>
            )}
            
            <span className={`text-xs px-2 py-1 rounded ${
              containerStatus === 'running' ? 'bg-green-100 text-green-800' :
              containerStatus === 'creating' ? 'bg-yellow-100 text-yellow-800' :
              containerStatus === 'syncing' ? 'bg-blue-100 text-blue-800' :
              containerStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {containerStatus === 'syncing' ? '同步中' : containerStatus}
            </span>

            {/* 项目URL显示 */}
            {containerStatus === 'running' && containerUrl && (
              <div className="flex items-center space-x-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-700 font-mono max-w-48 truncate" title={containerUrl}>
                  {containerUrl}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800"
                  onClick={() => navigator.clipboard.writeText(containerUrl)}
                  title="复制URL"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800"
                  onClick={() => window.open(containerUrl, '_blank')}
                  title="在新窗口打开"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSave} size="sm" variant="outline">
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
          
          {containerStatus === 'running' ? (
            <>
              <Button onClick={handleSync} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                部署
              </Button>
              <Button onClick={handleStop} size="sm" variant="outline">
                <Square className="h-4 w-4 mr-2" />
                停止
              </Button>
              <Button onClick={handleRestart} size="sm" variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                重启
              </Button>
            </>
          ) : (
            <Button onClick={handleRun} size="sm">
              <Play className="h-4 w-4 mr-2" />
              {containerStatus === 'creating' ? '启动中...' : 
               containerStatus === 'syncing' ? '同步中...' : '运行'}
            </Button>
          )}
          
          {previewMode === 'hidden' && (
            <Button 
              onClick={() => setPreviewMode('open')}
              size="sm" 
              variant="outline"
              title="显示预览面板"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex" ref={containerRef}>
        {/* File Explorer */}
        <div 
          className={`border-r bg-muted/10 flex-shrink-0 ${
            isDragging ? '' : 'transition-all duration-300 ease-in-out'
          }`}
          style={{ width: isFileExplorerCollapsed ? '0px' : `${fileExplorerWidth}px` }}
        >
          {!isFileExplorerCollapsed && (
            <FileExplorer 
              fileTree={fileTree} 
              onFileSelect={handleFileSelect} 
              currentFile={currentFile}
              projectId={projectId || ''}
              onFileCreated={() => projectId && loadProjectFiles(projectId)}
            />
          )}
        </div>

        {/* File Explorer Resize Handle */}
        <div 
          className={`relative flex-shrink-0 group ${
            isDragging === 'fileExplorer' ? 'w-2' : 'w-1'
          } transition-all duration-200`}
          title="拖拽调整宽度，双击折叠/展开"
        >
          {/* 扩展的拖拽区域 - 左右各延伸3px，使拖拽更容易 */}
          <div 
            className="absolute inset-0 -left-3 -right-3 cursor-col-resize"
            onMouseDown={handleMouseDown('fileExplorer')}
            onDoubleClick={handleDoubleClick('fileExplorer')}
          />
          {/* 主拖拽区域 */}
          <div className={`h-full cursor-col-resize transition-all duration-200 ${
            isDragging === 'fileExplorer' 
              ? 'bg-gradient-to-b from-cyan-300 via-purple-300 to-pink-300 w-full' 
              : 'bg-border hover:bg-gradient-to-b hover:from-cyan-200 hover:to-purple-200 group-hover:w-1.5 w-full'
          }`} />
          
          {/* 悬停时的视觉增强 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
            <div className="flex flex-col space-y-1">
              <div className="w-0.5 h-2 bg-gradient-to-t from-pink-200 to-cyan-200 rounded-full shadow-sm"></div>
              <div className="w-0.5 h-2 bg-gradient-to-t from-purple-200 to-blue-200 rounded-full shadow-sm"></div>
              <div className="w-0.5 h-2 bg-gradient-to-t from-cyan-200 to-pink-200 rounded-full shadow-sm"></div>
            </div>
          </div>
          
          {/* 拖拽时的高亮边框和尺寸提示 */}
          {isDragging === 'fileExplorer' && (
            <>
              <div className="absolute inset-0 border-2 border-gradient-to-r from-cyan-200 via-purple-200 to-pink-200 rounded-sm animate-pulse shadow-lg" 
                   style={{
                     borderImage: 'linear-gradient(45deg, #a5f3fc, #d8b4fe, #fbb6ce) 1',
                     boxShadow: '0 0 20px rgba(165, 243, 252, 0.3), 0 0 40px rgba(216, 180, 254, 0.2)'
                   }} />
              {/* 梦幻星星效果 */}
              <div className="absolute -top-1 -left-1 w-1 h-1 bg-cyan-300 rounded-full animate-ping opacity-75"></div>
              <div className="absolute -bottom-1 -right-1 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-75 delay-300"></div>
              <div className="absolute top-1/2 -left-1 w-0.5 h-0.5 bg-purple-300 rounded-full animate-pulse delay-150"></div>
              <div className="absolute top-1/4 -right-1 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-pulse delay-500"></div>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-200 via-purple-200 to-pink-200 text-gray-800 text-xs px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap z-50 font-medium backdrop-blur-sm border border-white/30">
                ✨ {fileExplorerWidth}px
              </div>
            </>
          )}
        </div>

        {/* Code Editor */}
        <div 
          className={`flex flex-col flex-1 min-w-0 ${
            isDragging ? '' : 'transition-all duration-300 ease-in-out'
          }`}
          style={{ 
            width: previewMode === 'open' 
              ? `calc(${100 - previewWidth}% - ${isFileExplorerCollapsed ? 0 : fileExplorerWidth}px - 2px)` 
              : previewMode === 'collapsed'
              ? `calc(100% - ${isFileExplorerCollapsed ? 0 : fileExplorerWidth}px - 48px - 2px)` 
              : `calc(100% - ${isFileExplorerCollapsed ? 0 : fileExplorerWidth}px - 1px)` 
          }}
        >
          <CodeEditor
            value={code}
            onChange={handleCodeChange}
            language={getLanguageFromFile(currentFile)}
            theme="custom-light"
          />
        </div>

        {/* Preview Panel */}
        {previewMode !== 'hidden' && (
          <>
            {/* Preview Resize Handle - 只在展开时显示 */}
            {previewMode === 'open' && (
              <div 
                className={`relative flex-shrink-0 group ${
                  isDragging === 'preview' ? 'w-2' : 'w-1'
                } transition-all duration-200`}
                title="拖拽调整预览面板宽度"
              >
                {/* 扩展的拖拽区域 - 左右各延伸3px，使拖拽更容易 */}
                <div 
                  className="absolute inset-0 -left-3 -right-3 cursor-col-resize"
                  onMouseDown={handleMouseDown('preview')}
                />
                {/* 主拖拽区域 */}
                <div className={`h-full cursor-col-resize transition-all duration-200 ${
                  isDragging === 'preview' 
                    ? 'bg-gradient-to-b from-pink-300 via-purple-300 to-cyan-300 w-full' 
                    : 'bg-border hover:bg-gradient-to-b hover:from-pink-200 hover:to-cyan-200 group-hover:w-1.5 w-full'
                }`} />
                
                {/* 悬停时的视觉增强 */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="flex flex-col space-y-1">
                    <div className="w-0.5 h-2 bg-gradient-to-t from-cyan-200 to-pink-200 rounded-full shadow-sm"></div>
                    <div className="w-0.5 h-2 bg-gradient-to-t from-purple-200 to-blue-200 rounded-full shadow-sm"></div>
                    <div className="w-0.5 h-2 bg-gradient-to-t from-pink-200 to-cyan-200 rounded-full shadow-sm"></div>
                  </div>
                </div>
                
                {/* 拖拽时的高亮边框和尺寸提示 */}
                {isDragging === 'preview' && (
                  <>
                    <div className="absolute inset-0 border-2 border-gradient-to-r from-pink-200 via-purple-200 to-cyan-200 rounded-sm animate-pulse shadow-lg" 
                         style={{
                           borderImage: 'linear-gradient(45deg, #fbb6ce, #d8b4fe, #a5f3fc) 1',
                           boxShadow: '0 0 20px rgba(251, 182, 206, 0.3), 0 0 40px rgba(216, 180, 254, 0.2)'
                         }} />
                    {/* 梦幻星星效果 */}
                    <div className="absolute -top-1 -left-1 w-1 h-1 bg-pink-300 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute -bottom-1 -right-1 w-1 h-1 bg-cyan-300 rounded-full animate-ping opacity-75 delay-300"></div>
                    <div className="absolute top-1/2 -left-1 w-0.5 h-0.5 bg-purple-300 rounded-full animate-pulse delay-150"></div>
                    <div className="absolute top-3/4 -right-1 w-0.5 h-0.5 bg-pink-300 rounded-full animate-pulse delay-500"></div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-200 via-purple-200 to-cyan-200 text-gray-800 text-xs px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap z-50 font-medium backdrop-blur-sm border border-white/30">
                      💫 {Math.round(previewWidth)}%
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div 
              className={`bg-background flex-shrink-0 ${
                isDragging ? '' : 'transition-all duration-300 ease-in-out'
              }`}
              style={{ 
                width: previewMode === 'open' 
                  ? `${previewWidth}%` 
                  : '48px' // 折叠时的窄边栏宽度
              }}
            >
              {previewMode === 'open' ? (
                <PreviewFrame 
                  projectId={projectId || ''} 
                  onHidePreview={() => setPreviewMode('collapsed')}
                />
              ) : (
                <CollapsedPreviewPanel 
                  onExpand={() => setPreviewMode('open')}
                  onHide={() => setPreviewMode('hidden')}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 折叠的预览面板组件
interface CollapsedPreviewPanelProps {
  onExpand: () => void;
  onHide: () => void;
}

function CollapsedPreviewPanel({ onExpand, onHide }: CollapsedPreviewPanelProps) {
  return (
    <div className="h-full w-full bg-gray-50 border-l flex flex-col items-center justify-start py-4 gap-2">
      {/* 展开按钮 */}
      <Button
        onClick={onExpand}
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 rotate-90"
        title="展开预览面板"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      
      {/* 预览标识 */}
      <div 
        className="text-xs text-gray-500 font-medium tracking-wider"
        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
      >
        预览
      </div>
      
      {/* 完全隐藏按钮 */}
      <Button
        onClick={onHide}
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 mt-auto mb-4"
        title="完全隐藏预览面板"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}