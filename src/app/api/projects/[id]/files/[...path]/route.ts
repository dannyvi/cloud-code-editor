import { NextRequest, NextResponse } from 'next/server';
import { FileManager } from '@/lib/file-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path } = await params;
    const filePath = path.join('/');
    const file = await FileManager.getFile(id, filePath);
    
    if (!file) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error('获取文件失败:', error);
    return NextResponse.json(
      { error: '获取文件失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path } = await params;
    const { content, mimeType } = await request.json();
    const filePath = path.join('/');

    const success = await FileManager.saveFile(
      id,
      filePath,
      content,
      mimeType
    );

    if (!success) {
      return NextResponse.json(
        { error: '更新文件失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新文件失败:', error);
    return NextResponse.json(
      { error: '更新文件失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const { id, path } = await params;
    const filePath = path.join('/');
    const success = await FileManager.deleteFile(id, filePath);

    if (!success) {
      return NextResponse.json(
        { error: '删除文件失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除文件失败:', error);
    return NextResponse.json(
      { error: '删除文件失败' },
      { status: 500 }
    );
  }
}