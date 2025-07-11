import { NextRequest, NextResponse } from 'next/server';
import { ProjectManager } from '@/lib/supabase';

export async function GET() {
  try {
    const projects = await ProjectManager.getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return NextResponse.json(
      { error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, description, template } = data;

    if (!name || !template) {
      return NextResponse.json(
        { error: '项目名称和模板是必需的' },
        { status: 400 }
      );
    }

    const project = await ProjectManager.createProject({
      name,
      description,
      template,
    });

    if (!project) {
      return NextResponse.json(
        { error: '创建项目失败' },
        { status: 500 }
      );
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('创建项目失败:', error);
    return NextResponse.json(
      { error: '创建项目失败' },
      { status: 500 }
    );
  }
}