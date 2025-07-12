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
  Zap
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 检查容器状态
  const checkContainerStatus = async () => {
    if (!projectId) return;
    
    try {
      const status = await getContainerStatus(projectId);
      setContainerStatus(status);
      
      // 如果容器正在运行且有URL，设置预览URL
      if (status?.status === 'running' && status?.url) {
        setPreviewUrl(status.url);
      } else {
        setPreviewUrl('');
      }
    } catch (error) {
      console.error('检查容器状态失败:', error);
      setContainerStatus(null);
    }
  };

  // 初始检查和定时检查容器状态
  useEffect(() => {
    if (projectId) {
      checkContainerStatus();
      
      // 每5秒检查一次容器状态
      const interval = setInterval(checkContainerStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [projectId]);

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

  // 渲染加载状态
  const renderLoadingState = () => {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-blue-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {containerStatus?.status === 'creating' ? '正在启动容器...' : '正在加载预览...'}
          </h3>
          <p className="text-sm text-gray-500">
            {containerStatus?.message || '请稍候，应用即将准备就绪'}
          </p>
        </div>
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
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="border-0 bg-white shadow-lg rounded-lg"
          style={getViewportSize()}
          title="应用预览"
          onLoad={() => setIsLoading(false)}
          onError={() => setError('应用加载失败')}
        />
      </div>
    );
  };

  // 主渲染逻辑
  const renderPreviewContent = () => {
    if (error) {
      return renderErrorState();
    }

    if (isLoading || containerStatus?.status === 'creating') {
      return renderLoadingState();
    }

    if (containerStatus?.status === 'running' && previewUrl) {
      return renderAppPreview();
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
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Input
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                placeholder="应用地址"
                className="h-8 text-xs"
                readOnly
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