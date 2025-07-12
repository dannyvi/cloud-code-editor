import { NextRequest, NextResponse } from 'next/server';
import { containerManager } from '@/lib/kubernetes';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: '项目 ID 是必需的' },
        { status: 400 }
      );
    }

    console.log(`清理项目 ${projectId} 的容器资源...`);

    try {
      // 删除Pod
      await containerManager.deleteCodeEditorPod(projectId);
      console.log(`Pod 删除成功: ${projectId}`);
    } catch (error) {
      console.log(`Pod 删除失败或不存在: ${error}`);
    }

    try {
      // 删除Service  
      const serviceName = `code-editor-service-${projectId}`;
      await containerManager['coreApi'].deleteNamespacedService({
        name: serviceName,
        namespace: 'default',
      });
      console.log(`Service 删除成功: ${projectId}`);
    } catch (error) {
      console.log(`Service 删除失败或不存在: ${error}`);
    }

    try {
      // 删除ConfigMap
      const configMapName = `startup-script-${projectId}`;
      await containerManager['coreApi'].deleteNamespacedConfigMap({
        name: configMapName,
        namespace: 'default',
      });
      console.log(`ConfigMap 删除成功: ${projectId}`);
    } catch (error) {
      console.log(`ConfigMap 删除失败或不存在: ${error}`);
    }

    try {
      // 删除Ingress（如果存在）
      await containerManager.deleteIngress(projectId);
      console.log(`Ingress 删除成功: ${projectId}`);
    } catch (error) {
      console.log(`Ingress 删除失败或不存在: ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: '容器资源清理完成',
      projectId: projectId,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('清理容器资源失败:', error);
    
    return NextResponse.json(
      { error: '清理容器资源失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}