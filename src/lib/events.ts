// 存储活跃的连接
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

// 存储项目状态
const projectStates = new Map<string, {
  files: Record<string, { content: string; lastModified: number }>;
  containerStatus: 'creating' | 'running' | 'stopped' | 'error';
  lastActivity: number;
}>();

// 广播消息到项目的所有连接
export function broadcastToProject(
  projectId: string,
  message: {
    type: string;
    data: Record<string, unknown>;
  }
) {
  const projectConnections = connections.get(projectId);
  if (!projectConnections) return;

  const messageStr = `data: ${JSON.stringify(message)}\n\n`;
  
  // 发送给所有连接的客户端
  projectConnections.forEach((controller) => {
    try {
      controller.enqueue(messageStr);
    } catch (error) {
      console.error('发送 SSE 消息失败:', error);
      // 移除失效的连接
      projectConnections.delete(controller);
    }
  });

  // 清理空的项目连接
  if (projectConnections.size === 0) {
    connections.delete(projectId);
  }
}

// 更新项目文件状态
export function updateProjectFile(
  projectId: string,
  filename: string,
  content: string
) {
  if (!projectStates.has(projectId)) {
    projectStates.set(projectId, {
      files: {},
      containerStatus: 'stopped',
      lastActivity: Date.now(),
    });
  }

  const projectState = projectStates.get(projectId)!;
  projectState.files[filename] = {
    content,
    lastModified: Date.now(),
  };
  projectState.lastActivity = Date.now();

  // 广播文件更新
  broadcastToProject(projectId, {
    type: 'file-updated',
    data: {
      projectId,
      filename,
      content,
      timestamp: Date.now(),
    },
  });
}

// 更新容器状态
export function updateContainerStatus(
  projectId: string,
  status: 'creating' | 'running' | 'stopped' | 'error',
  message?: string
) {
  if (!projectStates.has(projectId)) {
    projectStates.set(projectId, {
      files: {},
      containerStatus: status,
      lastActivity: Date.now(),
    });
  } else {
    projectStates.get(projectId)!.containerStatus = status;
    projectStates.get(projectId)!.lastActivity = Date.now();
  }

  // 广播容器状态更新
  broadcastToProject(projectId, {
    type: 'container-status',
    data: {
      projectId,
      status,
      message,
      timestamp: Date.now(),
    },
  });
}

// 通知预览更新
export function notifyPreviewUpdate(projectId: string) {
  broadcastToProject(projectId, {
    type: 'preview-updated',
    data: {
      projectId,
      timestamp: Date.now(),
    },
  });
}

// 获取项目连接数
export function getProjectConnectionCount(projectId: string): number {
  const projectConnections = connections.get(projectId);
  return projectConnections ? projectConnections.size : 0;
}

// 清理过期的项目状态（可以定期调用）
export function cleanupExpiredProjects() {
  const now = Date.now();
  const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24小时

  projectStates.forEach((state, projectId) => {
    if (now - state.lastActivity > EXPIRY_TIME) {
      projectStates.delete(projectId);
      console.log(`清理过期项目状态: ${projectId}`);
    }
  });
}

// 获取项目状态
export function getProjectState(projectId: string) {
  return projectStates.get(projectId);
}

// 添加连接到项目
export function addConnection(projectId: string, controller: ReadableStreamDefaultController) {
  if (!connections.has(projectId)) {
    connections.set(projectId, new Set());
  }
  connections.get(projectId)!.add(controller);
}

// 移除连接
export function removeConnection(projectId: string, controller: ReadableStreamDefaultController) {
  const projectConnections = connections.get(projectId);
  if (projectConnections) {
    projectConnections.delete(controller);
    if (projectConnections.size === 0) {
      connections.delete(projectId);
    }
  }
}