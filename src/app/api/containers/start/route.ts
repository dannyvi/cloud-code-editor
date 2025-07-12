import { NextRequest, NextResponse } from 'next/server';
import { containerManager } from '@/lib/kubernetes';
import { updateContainerStatus, notifyPreviewUpdate } from '@/lib/events';

export async function POST(request: NextRequest) {
  try {
    const { projectId, runtime = 'node' } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: '项目 ID 是必需的' },
        { status: 400 }
      );
    }

    // 通知开始创建容器
    updateContainerStatus(projectId, 'creating', '正在启动容器...');

    try {
      // 检查容器是否已存在
      const existingPod = await containerManager.getPodStatus(projectId);
      
      if (existingPod && existingPod.status?.phase === 'Running') {
        updateContainerStatus(projectId, 'running', '容器已在运行');
        
        // 确保服务存在，并在生产环境创建 Ingress
        await containerManager.createService(projectId);
        if (process.env.NODE_ENV !== 'development') {
          await containerManager.createIngress(projectId);
        }
        const projectUrl = containerManager.getProjectUrl(projectId);
        
        return NextResponse.json({
          success: true,
          data: {
            projectId,
            status: 'running',
            url: projectUrl,
            message: '容器已在运行',
            timestamp: Date.now(),
          },
        });
      }
    } catch {
      // 容器不存在，继续创建
      console.log('容器不存在，创建新容器');
    }

    // 创建新容器
    const pod = await containerManager.createCodeEditorPod(projectId, runtime);
    
    // 创建服务以暴露容器
    await containerManager.createService(projectId);

    // 只在生产环境创建 Ingress，开发环境使用 NodePort
    if (process.env.NODE_ENV !== 'development') {
      await containerManager.createIngress(projectId);
    }

    // 异步处理容器启动和文件同步
    setTimeout(async () => {
      try {
        updateContainerStatus(projectId, 'syncing', '正在同步项目文件...');
        
        // 等待容器完全启动
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 同步项目文件到容器
        await containerManager.syncProjectFilesToContainer(projectId);
        
        updateContainerStatus(projectId, 'running', '容器启动成功');
        notifyPreviewUpdate(projectId);
        
        console.log(`项目 ${projectId} 启动完成`);
      } catch (error) {
        console.error(`项目 ${projectId} 启动失败:`, error);
        updateContainerStatus(projectId, 'error', '项目启动失败');
      }
    }, 1000);

    // 获取项目访问URL
    const projectUrl = containerManager.getProjectUrl(projectId);

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        podName: pod.metadata?.name,
        status: 'creating',
        runtime,
        url: projectUrl,
        createdAt: new Date().toISOString(),
        message: '容器正在创建中',
      },
    });

  } catch (error) {
    console.error('启动容器失败:', error);
    
    // 通知容器启动失败
    const { projectId } = await request.json().catch(() => ({}));
    if (projectId) {
      updateContainerStatus(projectId, 'error', '容器启动失败');
    }

    return NextResponse.json(
      { error: '启动容器失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}