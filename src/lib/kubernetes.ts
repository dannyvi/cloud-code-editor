import * as k8s from '@kubernetes/client-node';

// 创建 Kubernetes 配置
const kc = new k8s.KubeConfig();

// 根据环境加载配置
if (process.env.NODE_ENV === 'production') {
  // 生产环境：从集群内部加载配置
  kc.loadFromCluster();
} else {
  // 开发环境：从本地配置文件加载
  kc.loadFromDefault();
}

// 创建 API 客户端
export const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
export const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
export const k8sExtensionsApi = kc.makeApiClient(k8s.NetworkingV1Api);

// 容器管理类
export class ContainerManager {
  private coreApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;
  private namespace: string;

  constructor(namespace: string = 'default') {
    this.coreApi = k8sApi;
    this.appsApi = k8sAppsApi;
    this.namespace = namespace;
  }

  // 创建代码编辑器容器
  async createCodeEditorPod(projectId: string, runtime: string = 'node'): Promise<k8s.V1Pod> {
    const podSpec: k8s.V1Pod = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: `code-editor-${projectId}`,
        namespace: this.namespace,
        labels: {
          app: 'code-editor',
          projectId: projectId,
          runtime: runtime,
        },
      },
      spec: {
        containers: [
          {
            name: 'code-runner',
            image: this.getImageByRuntime(runtime),
            command: ['sh', '-c'],
            args: ['tail -f /dev/null'],
            workingDir: '/workspace',
            ports: [
              {
                containerPort: 3000,
                name: 'web',
              },
            ],
            env: [
              {
                name: 'PROJECT_ID',
                value: projectId,
              },
              {
                name: 'NODE_ENV',
                value: 'development',
              },
            ],
            resources: {
              requests: {
                memory: '256Mi',
                cpu: '200m',
              },
              limits: {
                memory: '512Mi',
                cpu: '500m',
              },
            },
            volumeMounts: [
              {
                name: 'workspace',
                mountPath: '/workspace',
              },
            ],
          },
        ],
        volumes: [
          {
            name: 'workspace',
            emptyDir: {},
          },
        ],
        restartPolicy: 'Always',
      },
    };

    const response = await this.coreApi.createNamespacedPod({
      namespace: this.namespace,
      body: podSpec,
    });
    return response;
  }

  // 删除容器
  async deleteCodeEditorPod(projectId: string): Promise<k8s.V1Pod> {
    const podName = `code-editor-${projectId}`;
    const response = await this.coreApi.deleteNamespacedPod({
      name: podName,
      namespace: this.namespace,
    });
    return response;
  }

  // 获取容器状态
  async getPodStatus(projectId: string): Promise<k8s.V1Pod> {
    const podName = `code-editor-${projectId}`;
    const response = await this.coreApi.readNamespacedPod({
      name: podName,
      namespace: this.namespace,
    });
    return response;
  }

  // 执行容器命令
  async execInPod(projectId: string, command: string[]): Promise<string> {
    const podName = `code-editor-${projectId}`;
    const exec = new k8s.Exec(kc);
    
    return new Promise((resolve, reject) => {
      const output = '';
      exec.exec(
        this.namespace,
        podName,
        'code-runner',
        command,
        process.stdout,
        process.stderr,
        process.stdin,
        true,
        (status) => {
          if (status.status === 'Success') {
            resolve(output);
          } else {
            reject(new Error(`命令执行失败: ${status.message}`));
          }
        }
      );
    });
  }

  // 将文件写入容器
  async writeFileToContainer(projectId: string, filePath: string, content: string): Promise<void> {
    const command = ['sh', '-c', `cat > ${filePath} << 'EOF'\n${content}\nEOF`];
    await this.execInPod(projectId, command);
  }

  // 从容器读取文件
  async readFileFromContainer(projectId: string, filePath: string): Promise<string> {
    const command = ['cat', filePath];
    return await this.execInPod(projectId, command);
  }

  // 创建服务以暴露容器
  async createService(projectId: string): Promise<k8s.V1Service> {
    const serviceSpec: k8s.V1Service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: `code-editor-service-${projectId}`,
        namespace: this.namespace,
        labels: {
          app: 'code-editor',
          projectId: projectId,
        },
      },
      spec: {
        selector: {
          app: 'code-editor',
          projectId: projectId,
        },
        ports: [
          {
            port: 3000,
            targetPort: 3000,
            name: 'web',
          },
        ],
        type: 'ClusterIP',
      },
    };

    const response = await this.coreApi.createNamespacedService({
      namespace: this.namespace,
      body: serviceSpec,
    });
    return response;
  }

  // 根据运行时选择镜像
  private getImageByRuntime(runtime: string): string {
    const imageMap: Record<string, string> = {
      'node': 'node:18-alpine',
      'python': 'python:3.9-alpine',
      'java': 'openjdk:11-jre-slim',
      'go': 'golang:1.19-alpine',
      'php': 'php:8.1-apache',
      'ruby': 'ruby:3.1-alpine',
    };

    return imageMap[runtime] || 'node:18-alpine';
  }
}

// 默认容器管理器实例
export const containerManager = new ContainerManager();

// 工具函数
export const k8sUtils = {
  // 检查集群连接
  async checkClusterConnection(): Promise<boolean> {
    try {
      await k8sApi.listNamespace();
      return true;
    } catch (error) {
      console.error('Kubernetes 集群连接失败:', error);
      return false;
    }
  },

  // 获取所有代码编辑器 Pod
  async listCodeEditorPods(): Promise<k8s.V1Pod[]> {
    const response = await k8sApi.listNamespacedPod({
      namespace: 'default',
      labelSelector: 'app=code-editor',
    });
    return response.items;
  },

  // 清理所有代码编辑器资源
  async cleanupAllCodeEditorResources(): Promise<void> {
    const pods = await this.listCodeEditorPods();
    
    for (const pod of pods) {
      if (pod.metadata?.name) {
        await k8sApi.deleteNamespacedPod({
          name: pod.metadata.name,
          namespace: 'default',
        });
      }
    }
  },
};