import { NextRequest, NextResponse } from 'next/server';
// import { k8sApi } from '@/lib/kubernetes';

export async function POST(request: NextRequest) {
  try {
    const { projectId, filename, content, language } = await request.json();

    if (!projectId || !filename) {
      return NextResponse.json(
        { error: '项目 ID 和文件名是必需的' },
        { status: 400 }
      );
    }

    // TODO: 实际同步文件到 Kubernetes Pod
    // 这里应该将文件内容写入到对应的 Pod 中
    // const podName = `code-editor-${projectId}`;
    
    // 模拟文件同步
    const syncResult = {
      projectId,
      filename,
      status: 'synced',
      syncedAt: new Date().toISOString(),
      size: content?.length || 0,
      language,
    };

    // TODO: 触发热重载
    // await triggerHotReload(projectId);

    return NextResponse.json({
      success: true,
      data: syncResult,
    });

  } catch (error) {
    console.error('文件同步失败:', error);
    return NextResponse.json(
      { error: '文件同步失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const filename = searchParams.get('filename');

    if (!projectId || !filename) {
      return NextResponse.json(
        { error: '项目 ID 和文件名是必需的' },
        { status: 400 }
      );
    }

    // TODO: 从 Kubernetes Pod 读取文件内容
    // const podName = `code-editor-${projectId}`;
    
    // 模拟文件内容
    const mockContent = filename.endsWith('.js') 
      ? '// Hello World\nconsole.log("Hello from container!");'
      : filename.endsWith('.html')
      ? '<!DOCTYPE html>\n<html>\n<head><title>Hello</title></head>\n<body><h1>Hello World</h1></body>\n</html>'
      : '';

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        filename,
        content: mockContent,
        language: getLanguageFromFilename(filename),
        lastModified: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('文件读取失败:', error);
    return NextResponse.json(
      { error: '文件读取失败' },
      { status: 500 }
    );
  }
}

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
  };
  return languageMap[ext || ''] || 'plaintext';
}