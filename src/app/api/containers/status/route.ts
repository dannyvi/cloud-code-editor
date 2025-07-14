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

    try {
      // 获取 Pod 状态
      const pod = await containerManager.getPodStatus(projectId);
      
      const status = pod.status?.phase?.toLowerCase() || 'unknown';
      const conditions = pod.status?.conditions || [];
      const containerStatuses = pod.status?.containerStatuses || [];

      // 分析容器状态
      let detailedStatus = status;
      let message = '';
      
      if (status === 'pending') {
        detailedStatus = 'creating';
        message = '容器正在创建中';
      } else if (status === 'running') {
        detailedStatus = 'running';
        message = '容器运行正常';
        
        // 检查容器是否真的准备好了
        const readyCondition = conditions.find(c => c.type === 'Ready');
        if (!readyCondition?.status || readyCondition.status !== 'True') {
          detailedStatus = 'creating';
          message = '容器正在启动中';
        }
      } else if (status === 'failed' || status === 'unknown') {
        detailedStatus = 'error';
        message = '容器出现错误';
      } else {
        detailedStatus = 'stopped';
        message = '容器已停止';
      }

      // 获取容器日志或错误信息
      const containerInfo = containerStatuses.length > 0 ? containerStatuses[0] : null;
      if (containerInfo?.state?.waiting?.reason) {
        message += ` (${containerInfo.state.waiting.reason})`;
      }

      // 获取项目访问 URL（当容器运行时）
      let projectUrl = '';
      if (detailedStatus === 'running') {
        projectUrl = containerManager.getProjectUrl(projectId);
      }

      return NextResponse.json({
        success: true,
        data: {
          projectId,
          status: detailedStatus,
          message,
          url: projectUrl,
          phase: status,
          podName: pod.metadata?.name,
          createdAt: pod.metadata?.creationTimestamp,
          conditions: conditions.map(c => ({
            type: c.type,
            status: c.status,
            reason: c.reason,
            message: c.message,
          })),
          containerStatuses: containerStatuses.map(cs => ({
            name: cs.name,
            ready: cs.ready,
            restartCount: cs.restartCount,
            state: cs.state,
          })),
          timestamp: Date.now(),
        },
      });

    } catch (error) {
      // 容器不存在
      if (error instanceof Error && error.message.includes('NotFound')) {
        return NextResponse.json({
          success: true,
          data: {
            projectId,
            status: 'stopped',
            message: '容器未创建',
            timestamp: Date.now(),
          },
        });
      }
      
      throw error;
    }

  } catch (error) {
    console.error('获取容器状态失败:', error);
    
    return NextResponse.json(
      { 
        error: '获取容器状态失败', 
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, action } = await request.json();

    if (!projectId || !action) {
      return NextResponse.json(
        { error: '项目 ID 和操作类型是必需的' },
        { status: 400 }
      );
    }

    // 根据操作类型调用相应的 API
    const baseUrl = request.url.replace('/status', '');
    let apiUrl = '';
    
    switch (action) {
      case 'start':
        apiUrl = `${baseUrl}/start`;
        break;
      case 'stop':
        apiUrl = `${baseUrl}/stop`;
        break;
      case 'restart':
        apiUrl = `${baseUrl}/restart`;
        break;
      default:
        return NextResponse.json(
          { error: '无效的操作类型' },
          { status: 400 }
        );
    }

    // 转发请求到相应的操作端点
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('容器操作失败:', error);
    
    return NextResponse.json(
      { 
        error: '容器操作失败', 
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}