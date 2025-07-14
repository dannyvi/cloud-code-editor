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
  CheckCircle2
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getContainerStatus } from '@/lib/realtime';

interface PreviewFrameProps {
  projectId?: string;
}

interface ContainerStatusData {
  status: string;
  message: string;
  url?: string;
  details?: Record<string, unknown>;
}

export function PreviewFrame({ projectId }: PreviewFrameProps) {
  const [containerStatus, setContainerStatus] = useState<ContainerStatusData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [logs, setLogs] = useState<string[]>([]);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

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
          
          // 检查日志中是否有应用启动成功的标志
          const hasSuccessLog = logLines.some((line: string) => 
            line.includes('ready') || 
            line.includes('started') || 
            line.includes('listening') ||
            line.includes('server running') ||
            line.includes('Local:') ||
            line.includes('ready on')
          );
          
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
      
      return () => clearTimeout(loadingTimeout);
    }
  }, [previewUrl]);

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
      <div className="h-full flex items-center justify-center bg-gray-50 p-4 relative">
        <div 
          className={`${isFullWidth ? 'w-full h-full' : ''} relative`}
          style={isFullWidth ? {} : { width, height }}
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
          {!isFullWidth && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
              {viewMode === 'tablet' && '768×1024'}
              {viewMode === 'mobile' && '375×667'}
            </div>
          )}
        </div>
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
      {/* 工具栏 - 只有在容器运行时显示 */}
      {isContainerRunning && (
        <div className="border-b p-4 space-y-4">
          {/* URL栏和按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Globe className="h-4 w-4 text-green-500" />
              <Input
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="应用地址"
                className="h-8 text-xs font-mono"
                readOnly
                title={previewUrl}
              />
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button
                onClick={refreshPreview}
                size="sm"
                variant="outline"
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={openInNewTab}
                size="sm"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 视图模式切换 */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'desktop' | 'tablet' | 'mobile')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="desktop" className="text-xs">
                <Monitor className="h-3 w-3 mr-1" />
                桌面
              </TabsTrigger>
              <TabsTrigger value="tablet" className="text-xs">
                <Tablet className="h-3 w-3 mr-1" />
                平板
              </TabsTrigger>
              <TabsTrigger value="mobile" className="text-xs">
                <Smartphone className="h-3 w-3 mr-1" />
                手机
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* 预览内容 */}
      <div className="flex-1 overflow-hidden">
        {renderPreviewContent()}
      </div>

      {/* 状态栏 - 只有在容器运行时显示 */}
      {isContainerRunning && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              {viewMode === 'desktop' && '桌面视图'}
              {viewMode === 'tablet' && '平板视图 (768×1024)'}
              {viewMode === 'mobile' && '手机视图 (375×667)'}
            </span>
            <span className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>应用运行中</span>
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}