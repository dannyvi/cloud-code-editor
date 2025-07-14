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

    // 检查容器是否运行
    try {
      const pod = await containerManager.getPodStatus(projectId);
      if (!pod || pod.status?.phase !== 'Running') {
        return NextResponse.json(
          { error: '容器未运行，请先启动容器' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: '容器未找到，请先启动容器' },
        { status: 404 }
      );
    }

    // 通知开始同步
    updateContainerStatus(projectId, 'syncing', '正在同步项目文件...');

    try {
      // 智能文件同步 - 检查是否有文件变更
      const syncResult = await containerManager.syncProjectFilesToContainerSmart(projectId);
      
      if (syncResult.hasChanges) {
        // 只有文件变更时才重启应用
        await containerManager.restartContainerApp(projectId);
        
        // 等待应用重启
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        updateContainerStatus(projectId, 'running', `文件同步完成，${syncResult.changedFiles}个文件更新，应用已重启`);
      } else {
        updateContainerStatus(projectId, 'running', '无文件变更，跳过同步');
      }

      return NextResponse.json({
        success: true,
        message: syncResult.hasChanges ? '项目文件同步成功' : '无需同步，文件无变更',
        hasChanges: syncResult.hasChanges,
        changedFiles: syncResult.changedFiles,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('同步项目文件失败:', error);
      updateContainerStatus(projectId, 'error', '文件同步失败');
      
      return NextResponse.json(
        { error: '文件同步失败', details: error instanceof Error ? error.message : '未知错误' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('同步请求处理失败:', error);
    
    return NextResponse.json(
      { error: '同步请求处理失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}