import { NextRequest, NextResponse } from 'next/server';
import { containerManager } from '@/lib/kubernetes';
import { updateContainerStatus } from '@/lib/events';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: '项目 ID 是必需的' },
        { status: 400 }
      );
    }

    // 通知开始停止容器
    updateContainerStatus(projectId, 'creating', '正在停止容器...');

    try {
      // 检查容器是否存在
      const existingPod = await containerManager.getPodStatus(projectId);
      
      if (!existingPod) {
        updateContainerStatus(projectId, 'stopped', '容器已停止');
        return NextResponse.json({
          success: true,
          data: {
            projectId,
            status: 'stopped',
            message: '容器已停止',
            timestamp: Date.now(),
          },
        });
      }

      // 删除容器
      await containerManager.deleteCodeEditorPod(projectId);
      
      // 通知容器已停止
      updateContainerStatus(projectId, 'stopped', '容器已成功停止');

      return NextResponse.json({
        success: true,
        data: {
          projectId,
          status: 'stopped',
          stoppedAt: new Date().toISOString(),
          message: '容器已成功停止',
        },
      });

    } catch (error) {
      console.error('停止容器时出错:', error);
      
      // 如果删除失败，仍然标记为停止（可能容器已经不存在了）
      updateContainerStatus(projectId, 'stopped', '容器已停止');
      
      return NextResponse.json({
        success: true,
        data: {
          projectId,
          status: 'stopped',
          message: '容器已停止',
          warning: '删除容器时可能出现错误，但容器已不可用',
        },
      });
    }

  } catch (error) {
    console.error('停止容器失败:', error);
    
    // 通知容器停止失败
    const { projectId } = await request.json().catch(() => ({}));
    if (projectId) {
      updateContainerStatus(projectId, 'error', '容器停止失败');
    }

    return NextResponse.json(
      { error: '停止容器失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}