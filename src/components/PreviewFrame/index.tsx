'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  RefreshCw, 
  ExternalLink, 
  Globe, 
  AlertCircle,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Play,
  Power,
  Zap,
  Terminal,
  Rocket,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  X
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getContainerStatus } from '@/lib/realtime';

interface PreviewFrameProps {
  projectId?: string;
  onHidePreview?: () => void;
}

interface ContainerStatusData {
  status: string;
  message: string;
  url?: string;
  details?: Record<string, unknown>;
}

export function PreviewFrame({ projectId, onHidePreview }: PreviewFrameProps) {
  const [containerStatus, setContainerStatus] = useState<ContainerStatusData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [logs, setLogs] = useState<string[]>([]);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const prevViewModeRef = useRef<'desktop' | 'tablet' | 'mobile'>(viewMode);

  // 获取容器日志
  const fetchLogs = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/containers/logs?projectId=${encodeURIComponent(projectId)}&tailLines=50`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.logs) {
          const logLines = data.logs.split('\n').filter((line: string) => line.trim());
          setLogs(logLines);
          
          // 检查日志中是否有应用启动成功的标志 - 更精确的Next.js检测
          const hasSuccessLog = logLines.some((line: string) => {
            const lowerLine = line.toLowerCase();
            return lowerLine.includes('ready') || 
                   lowerLine.includes('started') || 
                   lowerLine.includes('listening') ||
                   lowerLine.includes('server running') ||
                   lowerLine.includes('local:') ||
                   lowerLine.includes('ready on') ||
                   lowerLine.includes('compiled') ||
                   lowerLine.includes('turbopack') ||
                   lowerLine.includes('next.js') ||
                   (lowerLine.includes('http') && lowerLine.includes('3000'));
          });
          
          if (hasSuccessLog && !isAppReady) {
            setIsAppReady(true);
            console.log('检测到应用启动成功');
          }
        }
      }
    } catch (error) {
      console.error('获取日志失败:', error);
    }
  };

  // 检查URL是否可访问
  const checkUrlAccessibility = async (url: string) => {
    try {
      // 使用fetch检查URL是否可访问
      const response = await fetch(url, { 
        method: 'HEAD', 
        mode: 'no-cors',
        cache: 'no-store'
      });
      
      // 如果能访问到（无论状态码），说明应用已经启动
      console.log('URL可访问性检查通过:', url);
      if (!isAppReady) {
        setIsAppReady(true);
        console.log('通过URL检测，应用已就绪');
      }
    } catch (error) {
      // 即使出错，我们也可以尝试其他方法
      console.log('URL检测失败，尝试其他方法:', error);
      
      // 如果有预览URL，尝试简单的超时后设置为就绪
      if (url && containerStatus?.status === 'running') {
        setTimeout(() => {
          if (!isAppReady && previewUrl) {
            console.log('超时后设置应用就绪');
            setIsAppReady(true);
          }
        }, 5000); // 5秒后自动设置为就绪
      }
    }
  };

  // 检查容器状态
  const checkContainerStatus = async () => {
    if (!projectId) return;
    
    try {
      const status = await getContainerStatus(projectId);
      console.log('PreviewFrame 容器状态:', status);
      setContainerStatus(status);
      
      // 如果容器正在运行且有URL，设置预览URL
      if (status?.status === 'running' && status?.url) {
        console.log('设置预览URL:', status.url);
        setPreviewUrl(status.url);
        
        // 尝试直接检测URL是否可访问
        checkUrlAccessibility(status.url);
      } else {
        console.log('清空预览URL, 状态:', status?.status, 'URL:', status?.url);
        setPreviewUrl('');
        setIsAppReady(false);
      }
    } catch (error) {
      console.error('检查容器状态失败:', error);
      setContainerStatus(null);
    }
  };

  // 初始检查和定时检查容器状态和日志
  useEffect(() => {
    if (projectId) {
      checkContainerStatus();
      fetchLogs();
      
      // 每3秒检查一次容器状态和日志
      const interval = setInterval(() => {
        checkContainerStatus();
        fetchLogs();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [projectId]);

  // 自动滚动日志到底部
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // 当预览URL更新时，自动加载到iframe
  useEffect(() => {
    if (previewUrl && iframeRef.current) {
      console.log('开始加载预览URL:', previewUrl);
      setIsLoading(true);
      setError('');
      // 添加时间戳避免缓存问题
      iframeRef.current.src = `${previewUrl}?t=${Date.now()}`;
      
      // 设置加载超时，如果15秒后还没加载完成，停止loading状态
      const loadingTimeout = setTimeout(() => {
        console.log('预览加载超时，停止loading状态');
        setIsLoading(false);
      }, 15000);
      
      // 如果有URL且容器在运行，3秒后直接设置为就绪（兜底策略）
      const readyTimeout = setTimeout(() => {
        if (containerStatus?.status === 'running' && previewUrl && !isAppReady) {
          console.log('兜底策略：强制设置应用就绪');
          setIsAppReady(true);
        }
      }, 3000);
      
      return () => {
        clearTimeout(loadingTimeout);
        clearTimeout(readyTimeout);
      };
    }
  }, [previewUrl, containerStatus?.status, isAppReady]);

  // 当视图模式切换时，刷新iframe以恢复初始大小
  useEffect(() => {
    if (prevViewModeRef.current !== viewMode && previewUrl && iframeRef.current) {
      console.log('视图模式切换，刷新iframe:', prevViewModeRef.current, '->', viewMode);
      // 重新设置iframe src以触发重新加载
      iframeRef.current.src = `${previewUrl}?t=${Date.now()}&mode=${viewMode}`;
      prevViewModeRef.current = viewMode;
    }
  }, [viewMode, previewUrl]);

  // 当应用就绪时，自动刷新预览
  useEffect(() => {
    if (isAppReady && previewUrl && iframeRef.current) {
      console.log('应用就绪，自动刷新预览');
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = `${previewUrl}?t=${Date.now()}`;
        }
      }, 2000); // 等待2秒确保应用完全启动
    }
  }, [isAppReady, previewUrl]);

  const refreshPreview = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await checkContainerStatus();
      
      // 强制刷新iframe
      if (iframeRef.current && previewUrl) {
        iframeRef.current.src = `${previewUrl}?t=${Date.now()}`;
      }
    } catch {
      setError('预览刷新失败');
    } finally {
      setIsLoading(false);
    }
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const getViewportSize = () => {
    switch (viewMode) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      default:
        return { width: '100%', height: '100%' };
    }
  };

  // 渲染酷炫的关闭状态页面
  const renderShutdownPage = () => {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* 背景动画效果 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-ping"></div>
        </div>

        {/* 网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        {/* 主要内容 */}
        <div className="relative z-10 text-center max-w-md mx-auto px-6">
          {/* 动画图标 */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <Power className="w-12 h-12 text-white animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
          </div>

          {/* 标题 */}
          <h2 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Container Offline
          </h2>

          {/* 状态信息 */}
          <div className="space-y-4 mb-8">
            <p className="text-slate-400 text-lg">
              {containerStatus?.message || '容器当前未运行'}
            </p>
            
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>状态: {containerStatus?.status || 'stopped'}</span>
            </div>
          </div>

          {/* 启动提示 */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-medium">Ready to Launch</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              点击顶部的 <span className="text-blue-400 font-mono">运行</span> 按钮来启动容器，
              然后您的应用就会在这里显示。
            </p>
          </div>

          {/* 装饰性元素 */}
          <div className="flex items-center justify-center space-x-2 text-slate-600">
            <div className="w-1 h-1 bg-slate-600 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-slate-600 rounded-full animate-bounce delay-100"></div>
            <div className="w-1 h-1 bg-slate-600 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>

        {/* 底部装饰线条 */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      </div>
    );
  };

  // 渲染美观的加载状态（包含实时日志）
  const renderLoadingState = () => {
    const isStarting = containerStatus?.status === 'creating' || containerStatus?.status === 'syncing';
    const isWaitingForApp = containerStatus?.status === 'running' && !isAppReady;
    
    return (
      <div className="h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        {/* 背景动画效果 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-ping"></div>
        </div>

        {/* 网格背景 */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        <div className="relative z-10 h-full flex flex-col">
          {/* 顶部状态区域 */}
          <div className="p-8 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25 animate-bounce">
                {isStarting ? (
                  <Rocket className="w-10 h-10 text-white" />
                ) : isAppReady ? (
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                ) : (
                  <Terminal className="w-10 h-10 text-white" />
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {isStarting && '🚀 正在启动容器...'}
              {isWaitingForApp && '⚡ 启动 Next.js 应用...'}
              {isAppReady && '✅ 应用就绪！正在加载...'}
            </h2>

            <p className="text-slate-300 mb-4">
              {containerStatus?.message || '请稍候，应用即将准备就绪'}
            </p>

            {/* 进度指示器 */}
            <div className="w-64 mx-auto mb-6">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span className={isStarting ? 'text-blue-400' : 'text-slate-600'}>启动容器</span>
                <span className={isWaitingForApp ? 'text-blue-400' : isAppReady ? 'text-green-400' : 'text-slate-600'}>启动应用</span>
                <span className={isAppReady ? 'text-blue-400' : 'text-slate-600'}>加载完成</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: isStarting ? '33%' : isWaitingForApp ? '66%' : isAppReady ? '100%' : '10%' 
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* 实时日志区域 */}
          <div className="flex-1 mx-8 mb-8">
            <div className="bg-black/50 backdrop-blur-sm border border-slate-700/50 rounded-xl h-full flex flex-col">
              <div className="flex items-center space-x-2 px-4 py-3 border-b border-slate-700/50">
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-white">实时日志</span>
                <div className="flex-1"></div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-400">实时更新</span>
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
                {logs.length > 0 ? (
                  <div className="space-y-1">
                    {logs.slice(-20).map((log, index) => {
                      const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('failed');
                      const isSuccess = log.toLowerCase().includes('ready') || log.toLowerCase().includes('started') || log.toLowerCase().includes('listening');
                      const isWarning = log.toLowerCase().includes('warn');
                      
                      return (
                        <div 
                          key={index}
                          className={`text-xs leading-relaxed ${
                            isError ? 'text-red-400' : 
                            isSuccess ? 'text-green-400' : 
                            isWarning ? 'text-yellow-400' : 
                            'text-slate-300'
                          }`}
                        >
                          {log}
                        </div>
                      );
                    })}
                    <div ref={logsEndRef} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-2 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                      <div className="text-slate-400 text-xs">等待日志输出...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 底部提示 */}
          <div className="px-8 pb-6 text-center">
            <div className="text-xs text-slate-500">
              应用启动完成后将自动显示预览
            </div>
          </div>
        </div>

        {/* 底部装饰线条 */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      </div>
    );
  };

  // 渲染错误状态
  const renderErrorState = () => {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">连接失败</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshPreview} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
        </div>
      </div>
    );
  };

  // 渲染应用预览
  const renderAppPreview = () => {
    const { width, height } = getViewportSize();
    const isFullWidth = width === '100%';
    
    return (
      <div className="h-full flex flex-col bg-gray-50 relative">
        {/* 预览容器 - 在固定高度内居中显示，如果超出则可滚动 */}
        <div className="h-full flex items-center justify-center p-4 overflow-auto">
          <div 
            className={`${isFullWidth ? 'w-full h-full' : 'flex-shrink-0'} relative`}
            style={isFullWidth 
              ? {} 
              : { 
                  width, 
                  height, 
                  maxWidth: '100%'
                }
            }
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className={`border-0 bg-white ${isFullWidth ? 'w-full h-full' : 'shadow-lg rounded-lg'}`}
              style={isFullWidth ? {} : { width: '100%', height: '100%' }}
              title="应用预览"
              onLoad={() => {
                console.log('iframe 加载完成');
                setIsLoading(false);
                // iframe成功加载也说明应用已就绪
                if (!isAppReady) {
                  setIsAppReady(true);
                  console.log('通过iframe加载检测，应用已就绪');
                }
              }}
              onError={() => {
                console.log('iframe 加载失败');
                setError('应用加载失败');
                setIsLoading(false);
              }}
              allow="camera; microphone; geolocation; encrypted-media; fullscreen"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
            {/* 加载状态覆盖层 */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-sm text-gray-600">加载应用中...</div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 设备模式提示 - 只在非桌面模式显示 */}
        {!isFullWidth && (
          <div className="text-center py-2 text-xs text-gray-500 bg-gray-100 border-t">
            {viewMode === 'tablet' && '📱 平板模式 768×1024'}
            {viewMode === 'mobile' && '📱 手机模式 375×667'}
          </div>
        )}
      </div>
    );
  };

  // 主渲染逻辑
  const renderPreviewContent = () => {
    if (error) {
      return renderErrorState();
    }

    // 如果容器运行且应用就绪，显示预览
    if (containerStatus?.status === 'running' && previewUrl && isAppReady) {
      return renderAppPreview();
    }

    // 如果容器正在创建、同步，或者运行中但应用未就绪，显示加载状态（包含日志）
    if (containerStatus?.status === 'creating' || 
        containerStatus?.status === 'syncing' || 
        (containerStatus?.status === 'running' && !isAppReady)) {
      return renderLoadingState();
    }

    return renderShutdownPage();
  };

  const isContainerRunning = containerStatus?.status === 'running';

  return (
    <Card className="h-full border-0 rounded-none flex flex-col">
      {/* 极简工具栏 - 只有在容器运行时显示 */}
      {isContainerRunning && (
        <div className="border-b px-2 py-0.5 bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center justify-between gap-1">
            {/* 左侧：状态和URL */}
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Globe className="h-3 w-3 text-green-500 flex-shrink-0" />
              <Input
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="应用地址"
                className="h-5 text-xs font-mono bg-transparent border-0 px-1 py-0 flex-1"
                readOnly
                title={previewUrl}
              />
            </div>
            
            {/* 右侧：操作按钮 */}
            <div className="flex items-center gap-1">
              {/* 刷新 */}
              <Button
                onClick={refreshPreview}
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                disabled={isLoading}
                title="刷新预览"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              {/* 新窗口打开 */}
              <Button
                onClick={openInNewTab}
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                title="在新标签页打开"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              
              {/* 视图模式切换 */}
              <div className="flex border rounded overflow-hidden">
                <Button
                  onClick={() => setViewMode('desktop')}
                  size="sm"
                  variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                  className="h-6 w-6 p-0 rounded-none"
                  title="桌面视图"
                >
                  <Monitor className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => setViewMode('tablet')}
                  size="sm"
                  variant={viewMode === 'tablet' ? 'default' : 'ghost'}
                  className="h-6 w-6 p-0 rounded-none border-l"
                  title="平板视图"
                >
                  <Tablet className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => setViewMode('mobile')}
                  size="sm"
                  variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                  className="h-6 w-6 p-0 rounded-none border-l"
                  title="手机视图"
                >
                  <Smartphone className="h-3 w-3" />
                </Button>
              </div>
              
              {/* 隐藏预览 */}
              {onHidePreview && (
                <Button 
                  onClick={onHidePreview}
                  size="sm" 
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title="隐藏预览面板"
                >
                  <ExternalLink className="h-3 w-3 rotate-180" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 预览内容区域 - 使用calc确保为控制台预留空间 */}
      <div 
        className="overflow-hidden"
        style={{ 
          height: isContainerRunning 
            ? 'calc(100% - 32px - 48px)' // 减去工具栏(32px)和控制台最小高度(48px)
            : 'calc(100% - 32px)' // 只减去工具栏高度
        }}
      >
        {renderPreviewContent()}
      </div>
      
      {/* 固定在底部的状态/控制台tabs */}
      {isContainerRunning && (
        <div className="flex-shrink-0">
          <BottomTabs viewMode={viewMode} />
        </div>
      )}
    </Card>
  );
}

// 可隐藏的底部状态/控制台tabs组件
interface BottomTabsProps {
  viewMode: 'desktop' | 'tablet' | 'mobile';
}

function BottomTabs({ viewMode }: BottomTabsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('status');

  const getViewModeInfo = () => {
    switch (viewMode) {
      case 'tablet':
        return '平板 768×1024';
      case 'mobile':
        return '手机 375×667';
      default:
        return '桌面 100%';
    }
  };

  return (
    <div className="border-t bg-gray-50/50 flex-shrink-0">
      {/* Tab栏 - 始终可见，更紧凑 */}
      <div className="flex items-center justify-between px-2 py-0.5 text-xs min-h-[24px]">
        <div className="flex items-center gap-1">
          <Button
            onClick={() => setActiveTab('status')}
            size="sm"
            variant={activeTab === 'status' ? 'default' : 'ghost'}
            className="h-4 px-1.5 text-xs"
          >
            状态
          </Button>
          <Button
            onClick={() => setActiveTab('console')}
            size="sm"
            variant={activeTab === 'console' ? 'default' : 'ghost'}
            className="h-4 px-1.5 text-xs"
          >
            <Terminal className="h-2.5 w-2.5 mr-1" />
            控制台
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-gray-500 text-xs">{getViewModeInfo()}</span>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0"
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />}
          </Button>
        </div>
      </div>

      {/* Tab内容区域 - 可隐藏，限制最大高度 */}
      {isExpanded && (
        <div className="border-t bg-white px-2 py-1.5 text-xs max-h-24 overflow-y-auto flex-shrink-0">
          {activeTab === 'status' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700">应用运行中</span>
              </div>
              <div className="text-gray-500">
                视图: {getViewModeInfo()}
              </div>
              <div className="text-gray-500">
                更新: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
          
          {activeTab === 'console' && (
            <div className="font-mono text-xs space-y-0.5 text-gray-600">
              <div>Console logs will appear here...</div>
              <div className="text-gray-400">// Future: Real-time console output</div>
              <div className="text-gray-400">// Future: Error logs and warnings</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}