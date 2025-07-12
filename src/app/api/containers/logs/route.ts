import { NextRequest, NextResponse } from 'next/server';
import { containerManager } from '@/lib/kubernetes';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const tailLines = parseInt(searchParams.get('tailLines') || '100');

    if (!projectId) {
      return NextResponse.json(
        { error: '项目 ID 是必需的' },
        { status: 400 }
      );
    }

    try {
      const logs = await containerManager.getPodLogs(projectId, tailLines);
      
      return NextResponse.json({
        success: true,
        logs: logs,
        projectId: projectId,
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('获取容器日志失败:', error);
      
      return NextResponse.json(
        { error: '获取容器日志失败', details: error instanceof Error ? error.message : '未知错误' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('日志请求处理失败:', error);
    
    return NextResponse.json(
      { error: '日志请求处理失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}