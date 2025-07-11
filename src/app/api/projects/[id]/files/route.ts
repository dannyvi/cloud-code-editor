import { NextRequest, NextResponse } from 'next/server';
import { FileManager } from '@/lib/file-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const files = await FileManager.getProjectFiles(id);
    return NextResponse.json(files);
  } catch (error) {
    console.error('获取项目文件失败:', error);
    return NextResponse.json(
      { error: '获取项目文件失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { path, content, mimeType } = await request.json();

    if (!path) {
      return NextResponse.json(
        { error: '文件路径是必需的' },
        { status: 400 }
      );
    }

    const success = await FileManager.saveFile(
      id,
      path,
      content || '',
      mimeType
    );

    if (!success) {
      return NextResponse.json(
        { error: '保存文件失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存文件失败:', error);
    return NextResponse.json(
      { error: '保存文件失败' },
      { status: 500 }
    );
  }
}