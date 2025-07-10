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
  Tablet
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PreviewFrameProps {
  projectId?: string;
}

export function PreviewFrame({ projectId }: PreviewFrameProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 模拟的预览 URL，实际应该从 API 获取
  useEffect(() => {
    if (projectId) {
      setPreviewUrl(`/api/preview/${projectId}`);
    } else {
      // 默认预览 URL
      setPreviewUrl('about:blank');
    }
  }, [projectId]);

  const refreshPreview = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // TODO: 调用 API 重新构建和部署
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟延迟
      
      if (iframeRef.current) {
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

  const renderPreviewContent = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshPreview} size="sm">
              重试
            </Button>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">正在加载预览...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="border-0 bg-white shadow-lg"
          style={getViewportSize()}
          title="预览窗口"
          onLoad={() => setIsLoading(false)}
          onError={() => setError('预览加载失败')}
        />
      </div>
    );
  };

  return (
    <Card className="h-full border-0 rounded-none flex flex-col">
      <div className="border-b p-4 space-y-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <Input
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="预览地址"
              className="h-8 text-xs"
              readOnly
            />
          </div>
          <div className="flex items-center space-x-2">
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

      {/* 预览内容 */}
      <div className="flex-1 overflow-hidden">
        {renderPreviewContent()}
      </div>

      {/* 状态栏 */}
      <div className="border-t px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            {viewMode === 'desktop' && '桌面视图'}
            {viewMode === 'tablet' && '平板视图 (768×1024)'}
            {viewMode === 'mobile' && '手机视图 (375×667)'}
          </span>
          <span className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>已连接</span>
          </span>
        </div>
      </div>
    </Card>
  );
}