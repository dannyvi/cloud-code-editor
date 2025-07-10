import { NextRequest, NextResponse } from 'next/server';
// import { k8sApi } from '@/lib/kubernetes';

export async function POST(request: NextRequest) {
  try {
    const { projectId, runtime = 'node' } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: '项目 ID 是必需的' },
        { status: 400 }
      );
    }

    // 创建容器配置
    // const containerConfig = {
    //   apiVersion: 'v1',
    //   kind: 'Pod',
    //   metadata: {
    //     name: `code-editor-${projectId}`,
    //     namespace: 'default',
    //     labels: {
    //       app: 'code-editor',
    //       projectId: projectId,
    //       runtime: runtime,
    //     },
    //   },
    //   spec: {
    //     containers: [
    //       {
    //         name: 'code-runner',
    //         image: runtime === 'node' ? 'node:18-alpine' : 'python:3.9-alpine',
    //         command: ['sh', '-c'],
    //         args: ['tail -f /dev/null'], // 保持容器运行
    //         workingDir: '/workspace',
    //         ports: [
    //           {
    //             containerPort: 3000,
    //             name: 'web',
    //           },
    //         ],
    //         env: [
    //           {
    //             name: 'PROJECT_ID',
    //             value: projectId,
    //           },
    //         ],
    //         resources: {
    //           requests: {
    //             memory: '256Mi',
    //             cpu: '200m',
    //           },
    //           limits: {
    //             memory: '512Mi',
    //             cpu: '500m',
    //           },
    //         },
    //         volumeMounts: [
    //           {
    //             name: 'workspace',
    //             mountPath: '/workspace',
    //           },
    //         ],
    //       },
    //     ],
    //     volumes: [
    //       {
    //         name: 'workspace',
    //         emptyDir: {},
    //       },
    //     ],
    //     restartPolicy: 'Always',
    //   },
    // };

    // TODO: 实际创建 Kubernetes Pod
    // const response = await k8sApi.createNamespacedPod('default', containerConfig);
    
    // 模拟创建成功
    const mockResponse = {
      id: `pod-${projectId}`,
      projectId,
      status: 'creating',
      runtime,
      createdAt: new Date().toISOString(),
      url: `http://localhost:3000/preview/${projectId}`,
    };

    return NextResponse.json({
      success: true,
      data: mockResponse,
    });

  } catch (error) {
    console.error('创建容器失败:', error);
    return NextResponse.json(
      { error: '创建容器失败' },
      { status: 500 }
    );
  }
}