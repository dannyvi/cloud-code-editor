import { NextRequest } from 'next/server';
import { 
  addConnection, 
  removeConnection, 
  getProjectState 
} from '@/lib/events';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return new Response('Project ID is required', { status: 400 });
  }

  // 创建 SSE 流
  let streamController: ReadableStreamDefaultController;
  
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
      // 添加连接到项目
      addConnection(projectId, controller);

      // 发送初始连接消息
      const welcomeMessage = {
        type: 'connected',
        data: {
          projectId,
          timestamp: Date.now(),
          message: '已连接到实时同步服务',
        },
      };

      controller.enqueue(`data: ${JSON.stringify(welcomeMessage)}\n\n`);

      // 发送当前项目状态
      const projectState = getProjectState(projectId);
      if (projectState) {
        const stateMessage = {
          type: 'project-state',
          data: {
            projectId,
            files: projectState.files,
            containerStatus: projectState.containerStatus,
            timestamp: Date.now(),
          },
        };
        controller.enqueue(`data: ${JSON.stringify(stateMessage)}\n\n`);
      }

      console.log(`SSE 连接建立: 项目 ${projectId}`);
    },

    cancel() {
      // 移除连接
      removeConnection(projectId, streamController);
      console.log(`SSE 连接断开: 项目 ${projectId}`);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}