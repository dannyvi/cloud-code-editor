import { NextRequest, NextResponse } from 'next/server';
import { containerManager } from '@/lib/kubernetes';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: '项目 ID 是必需的' },
        { status: 400 }
      );
    }

    // 获取项目访问URL
    const url = containerManager.getProjectUrl(projectId);

    return NextResponse.json({
      success: true,
      url: url,
      projectId: projectId,
    });

  } catch (error) {
    console.error('获取容器URL失败:', error);
    
    return NextResponse.json(
      { error: '获取容器URL失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}