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

    // 通知开始重启容器
    updateContainerStatus(projectId, 'creating', '正在重启容器...');

    try {
      // 先尝试删除现有容器
      await containerManager.deleteCodeEditorPod(projectId);
      console.log(`删除现有容器: ${projectId}`);
      
      // 等待一段时间确保容器完全删除
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch {
      console.log('没有找到现有容器，或删除失败，继续创建新容器');
    }

    // 创建新容器
    const pod = await containerManager.createCodeEditorPod(projectId, runtime);
    
    // 创建服务以暴露容器
    try {
      await containerManager.createService(projectId);
    } catch {
      console.log('服务可能已存在，继续执行');
    }

    // 模拟容器启动过程
    setTimeout(() => {
      updateContainerStatus(projectId, 'running', '容器重启成功');
      notifyPreviewUpdate(projectId);
    }, 5000); // 重启需要更长时间

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        podName: pod.metadata?.name,
        status: 'creating',
        runtime,
        restartedAt: new Date().toISOString(),
        message: '容器正在重启中',
      },
    });

  } catch (error) {
    console.error('重启容器失败:', error);
    
    // 通知容器重启失败
    const { projectId } = await request.json().catch(() => ({}));
    if (projectId) {
      updateContainerStatus(projectId, 'error', '容器重启失败');
    }

    return NextResponse.json(
      { error: '重启容器失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}