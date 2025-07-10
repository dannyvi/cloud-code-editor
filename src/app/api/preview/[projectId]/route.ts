import { NextRequest, NextResponse } from 'next/server';
// import { k8sApi } from '@/lib/kubernetes';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: '项目 ID 是必需的' },
        { status: 400 }
      );
    }

    // TODO: 检查容器状态
    // const podName = `code-editor-${projectId}`;
    // const podStatus = await k8sApi.readNamespacedPod(podName, 'default');

    // 模拟预览页面内容
    const previewHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>预览 - ${projectId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .status {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            margin-bottom: 20px;
        }
        .info {
            color: #666;
            margin-bottom: 20px;
        }
        .live-indicator {
            width: 10px;
            height: 10px;
            background: #4CAF50;
            border-radius: 50%;
            display: inline-block;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .code-block {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            text-align: left;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Cloud Code Editor</h1>
        <div class="status">
            <span class="live-indicator"></span>
            实时预览
        </div>
        <div class="info">
            <p><strong>项目 ID:</strong> ${projectId}</p>
            <p><strong>状态:</strong> 运行中</p>
            <p><strong>更新时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
        </div>
        <div class="code-block">
            // 你的代码将在这里实时预览<br>
            console.log("Hello from ${projectId}!");
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
            编辑器中的代码修改会实时反映在这里
        </p>
    </div>
    
    <script>
        // 模拟实时更新
        setInterval(() => {
            const timeElement = document.querySelector('.info p:last-child');
            if (timeElement) {
                timeElement.innerHTML = '<strong>更新时间:</strong> ' + new Date().toLocaleString('zh-CN');
            }
        }, 1000);
        
        // TODO: 实现 WebSocket 连接用于实时同步
        // const socket = io();
        // socket.on('code-update', (data) => {
        //     // 更新预览内容
        // });
    </script>
</body>
</html>`;

    return new NextResponse(previewHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('预览生成失败:', error);
    return NextResponse.json(
      { error: '预览生成失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { action } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: '项目 ID 是必需的' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'rebuild':
        // TODO: 重新构建项目
        return NextResponse.json({
          success: true,
          message: '重新构建成功',
          data: {
            projectId,
            rebuiltAt: new Date().toISOString(),
          },
        });

      case 'restart':
        // TODO: 重启容器
        return NextResponse.json({
          success: true,
          message: '容器重启成功',
          data: {
            projectId,
            restartedAt: new Date().toISOString(),
          },
        });

      default:
        return NextResponse.json(
          { error: '未知操作' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('预览操作失败:', error);
    return NextResponse.json(
      { error: '预览操作失败' },
      { status: 500 }
    );
  }
}