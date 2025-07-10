'use client';

import { useState, useEffect, useRef } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { FileExplorer } from '@/components/FileExplorer';
import { PreviewFrame } from '@/components/PreviewFrame';
import { Button } from '@/components/ui/button';
import { Play, Save, Settings, Wifi, WifiOff, Square, RotateCcw } from 'lucide-react';
import { RealtimeClient, syncFileUpdate, debounce, sendContainerOperation, getContainerStatus } from '@/lib/realtime';

export default function EditorPage() {
  const [currentFile, setCurrentFile] = useState<string>('index.js');
  const [code, setCode] = useState<string>('// Welcome to Cloud Code Editor\nconsole.log("Hello World!");');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [projectId] = useState<string>(`project-${Date.now()}`); // 临时生成项目ID
  const [containerStatus, setContainerStatus] = useState<string>('stopped');
  
  const realtimeClientRef = useRef<RealtimeClient | null>(null);
  const lastSyncRef = useRef<string>(''); // 防止循环同步

  // 初始化实时连接
  useEffect(() => {
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
    lastSyncRef.current = content;
    const success = await syncFileUpdate(projectId, currentFile, content);
    if (!success) {
      console.error('文件同步失败');
    }
  }, 500); // 500ms 防抖

  const handleFileSelect = (filename: string) => {
    setCurrentFile(filename);
    // TODO: Load file content from API
  };

  const handleCodeChange = (newCode: string | undefined) => {
    if (newCode !== undefined) {
      setCode(newCode);
      // 实时同步到后端
      debouncedSync(newCode);
    }
  };

  const handleSave = async () => {
    const success = await syncFileUpdate(projectId, currentFile, code);
    if (success) {
      console.log('文件保存成功:', currentFile);
    } else {
      console.error('文件保存失败:', currentFile);
    }
  };

  const handleRun = async () => {
    const success = await sendContainerOperation(projectId, 'start');
    if (success) {
      console.log('容器启动请求已发送');
    } else {
      console.error('容器启动失败');
    }
  };

  const handleStop = async () => {
    const success = await sendContainerOperation(projectId, 'stop');
    if (success) {
      console.log('容器停止请求已发送');
    } else {
      console.error('容器停止失败');
    }
  };

  const handleRestart = async () => {
    const success = await sendContainerOperation(projectId, 'restart');
    if (success) {
      console.log('容器重启请求已发送');
    } else {
      console.error('容器重启失败');
    }
  };

  // 定期检查容器状态
  useEffect(() => {
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

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold">Cloud Code Editor</h1>
          <span className="text-sm text-muted-foreground">
            {currentFile}
          </span>
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
          <FileExplorer onFileSelect={handleFileSelect} />
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <CodeEditor
            value={code}
            onChange={handleCodeChange}
            language="javascript"
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
              <PreviewFrame projectId={projectId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}