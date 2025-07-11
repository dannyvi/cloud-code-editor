'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { CodeEditor } from '@/components/CodeEditor';
import { FileExplorer } from '@/components/FileExplorer';
import { PreviewFrame } from '@/components/PreviewFrame';
import { Button } from '@/components/ui/button';
import { Play, Save, Settings, Wifi, WifiOff, Square, RotateCcw, ArrowLeft } from 'lucide-react';
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
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [containerStatus, setContainerStatus] = useState<string>('stopped');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const lastSyncRef = useRef<string>(''); // 防止循环同步

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
        // 防止循环同步
        if (data.content !== lastSyncRef.current && data.filename === currentFile) {
          setCode(data.content);
          console.log(`收到文件更新: ${data.filename}`);
        }
      },
      onContainerStatus: (data) => {
        setContainerStatus(data.status);
        console.log(`容器状态更新: ${data.status}`);
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
    };
  }, [projectId, currentFile]);

  // 防抖的文件同步函数
  const debouncedSync = debounce(async (content: string) => {
    if (!projectId) return;
    
    lastSyncRef.current = content;
    
    try {
      // 保存到 Supabase
      await FileManager.saveFile(projectId, currentFile, content);
      // 同步到实时系统
      const success = await syncFileUpdate(projectId, currentFile, content);
      if (!success) {
        console.error('实时同步失败');
      }
    } catch (error) {
      console.error('文件同步失败:', error);
    }
  }, 1000); // 1秒防抖

  const handleFileSelect = async (filename: string) => {
    if (!projectId) return;
    
    try {
      const file = await FileManager.getFile(projectId, filename);
      if (file) {
        setCurrentFile(filename);
        setCode(file.content);
      }
    } catch (error) {
      console.error('加载文件失败:', error);
    }
  };

  const handleCodeChange = (newCode: string | undefined) => {
    if (newCode !== undefined) {
      setCode(newCode);
      // 实时同步到后端
      debouncedSync(newCode);
    }
  };

  const handleSave = async () => {
    if (!projectId) return;
    
    try {
      // 保存到 Supabase
      const success = await FileManager.saveFile(projectId, currentFile, code);
      if (success) {
        console.log('文件保存成功:', currentFile);
        // 同时同步到实时系统
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

  // 定期检查容器状态
  useEffect(() => {
    if (!projectId) return;
    
    const checkContainerStatus = async () => {
      const status = await getContainerStatus(projectId);
      if (status) {
        setContainerStatus(status.status);
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
            <span className={`text-xs px-2 py-1 rounded ${
              containerStatus === 'running' ? 'bg-green-100 text-green-800' :
              containerStatus === 'creating' ? 'bg-yellow-100 text-yellow-800' :
              containerStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {containerStatus}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSave} size="sm" variant="outline">
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
          
          {containerStatus === 'running' ? (
            <>
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
              {containerStatus === 'creating' ? '启动中...' : '运行'}
            </Button>
          )}
          
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* File Explorer */}
        <div className="w-64 border-r bg-muted/10">
          <FileExplorer 
            fileTree={fileTree} 
            onFileSelect={handleFileSelect} 
            currentFile={currentFile}
            projectId={projectId || ''}
            onFileCreated={() => projectId && loadProjectFiles(projectId)}
          />
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <CodeEditor
            value={code}
            onChange={handleCodeChange}
            language={getLanguageFromFile(currentFile)}
            theme="vs-dark"
          />
        </div>

        {/* Preview Panel */}
        {isPreviewOpen && (
          <div className="w-1/2 border-l bg-background">
            <div className="h-full flex flex-col">
              <div className="border-b px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">预览</span>
                <Button 
                  onClick={() => setIsPreviewOpen(false)}
                  size="sm" 
                  variant="outline"
                >
                  隐藏
                </Button>
              </div>
              <PreviewFrame projectId={projectId || ''} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}