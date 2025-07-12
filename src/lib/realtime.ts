'use client';

export interface RealtimeEvent {
  type: 'connected' | 'file-updated' | 'container-status' | 'preview-updated' | 'project-state';
  data: Record<string, unknown>;
}

export interface RealtimeCallbacks {
  onFileUpdated?: (data: { projectId: string; filename: string; content: string; timestamp: number }) => void;
  onContainerStatus?: (data: { projectId: string; status: string; message?: string; timestamp: number }) => void;
  onPreviewUpdated?: (data: { projectId: string; timestamp: number }) => void;
  onProjectState?: (data: { projectId: string; files: Record<string, unknown>; containerStatus: string; timestamp: number }) => void;
  onConnected?: (data: { projectId: string; timestamp: number; message: string }) => void;
  onError?: (error: Error) => void;
  onDisconnected?: () => void;
}

export class RealtimeClient {
  private eventSource: EventSource | null = null;
  private projectId: string;
  private callbacks: RealtimeCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1秒

  constructor(projectId: string, callbacks: RealtimeCallbacks) {
    this.projectId = projectId;
    this.callbacks = callbacks;
  }

  connect() {
    if (this.eventSource) {
      this.disconnect();
    }

    const url = `/api/events?projectId=${encodeURIComponent(this.projectId)}`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const message: RealtimeEvent = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('解析 SSE 消息失败:', error);
        this.callbacks.onError?.(error as Error);
      }
    };

    this.eventSource.onopen = () => {
      console.log(`SSE 连接已建立: 项目 ${this.projectId}`);
      this.reconnectAttempts = 0; // 重置重连计数
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE 连接错误:', error);
      
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.callbacks.onDisconnected?.();
        this.attemptReconnect();
      } else {
        this.callbacks.onError?.(new Error('SSE 连接错误'));
      }
    };
  }

  private handleMessage(message: RealtimeEvent) {
    switch (message.type) {
      case 'connected':
        this.callbacks.onConnected?.(message.data as { projectId: string; timestamp: number; message: string });
        break;
      
      case 'file-updated':
        this.callbacks.onFileUpdated?.(message.data as { projectId: string; filename: string; content: string; timestamp: number });
        break;
      
      case 'container-status':
        this.callbacks.onContainerStatus?.(message.data as { projectId: string; status: string; message?: string; timestamp: number });
        break;
      
      case 'preview-updated':
        this.callbacks.onPreviewUpdated?.(message.data as { projectId: string; timestamp: number });
        break;
      
      case 'project-state':
        this.callbacks.onProjectState?.(message.data as { projectId: string; files: Record<string, unknown>; containerStatus: string; timestamp: number });
        break;
      
      default:
        console.warn('未知的 SSE 消息类型:', message.type);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('超过最大重连次数，停止重连');
      this.callbacks.onError?.(new Error('连接失败，请刷新页面重试'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避

    console.log(`${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log(`SSE 连接已断开: 项目 ${this.projectId}`);
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// 发送文件更新到服务器
export async function syncFileUpdate(
  projectId: string,
  filename: string,
  content: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/files/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        filename,
        content,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`文件同步失败: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('同步文件更新失败:', error);
    return false;
  }
}

// 发送容器操作到服务器
export async function sendContainerOperation(
  projectId: string,
  operation: 'start' | 'stop' | 'restart' | 'sync'
): Promise<boolean> {
  try {
    const response = await fetch(`/api/containers/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        timestamp: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`容器操作失败: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('容器操作失败:', error);
    return false;
  }
}

// 获取容器状态
export async function getContainerStatus(projectId: string): Promise<{
  status: string;
  message: string;
  details?: Record<string, unknown>;
} | null> {
  try {
    const response = await fetch(`/api/containers/status?projectId=${encodeURIComponent(projectId)}`);
    
    if (!response.ok) {
      throw new Error(`获取容器状态失败: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('获取容器状态失败:', error);
    return null;
  }
}

// 防抖函数，用于减少频繁的同步请求
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}