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

  // 创建启动脚本 ConfigMap
  async createStartupConfigMap(projectId: string, runtime: string): Promise<k8s.V1ConfigMap> {
    const configMapName = `startup-script-${projectId}`;
    
    // 检查是否已存在
    try {
      const existing = await this.coreApi.readNamespacedConfigMap({
        name: configMapName,
        namespace: this.namespace,
      });
      console.log(`ConfigMap ${configMapName} 已存在`);
      return existing;
    } catch (error) {
      console.log(`创建新 ConfigMap ${configMapName}`);
    }

    const startupScript = this.generateStartupScript(runtime);
    
    const configMapSpec: k8s.V1ConfigMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: configMapName,
        namespace: this.namespace,
        labels: {
          app: 'code-editor',
          projectId: projectId,
        },
      },
      data: {
        'startup.sh': startupScript,
      },
    };

    try {
      return await this.coreApi.createNamespacedConfigMap({
        namespace: this.namespace,
        body: configMapSpec,
      });
    } catch (error: any) {
      if (error.statusCode === 409) {
        return await this.coreApi.readNamespacedConfigMap({
          name: configMapName,
          namespace: this.namespace,
        });
      }
      throw error;
    }
  }

  // 生成Next.js专用启动脚本
  private generateStartupScript(runtime: string): string {
    return `#!/bin/sh
echo "🚀 启动 Next.js Cloud Code Editor..."

# 确保工作目录存在
mkdir -p /app
cd /app

# 等待项目文件同步完成
echo "⏳ 等待项目文件同步..."
timeout=300
while [ $timeout -gt 0 ]; do
  # 检查是否有Next.js项目文件
  if [ -f "package.json" ]; then
    echo "✅ 检测到 package.json 文件"
    break
  fi
  sleep 2
  timeout=$((timeout-2))
  if [ $((timeout % 20)) -eq 0 ]; then
    echo "等待项目文件同步... 剩余 $timeout 秒"
  fi
done

if [ $timeout -eq 0 ]; then
  echo "❌ 超时未检测到项目文件，容器启动失败"
  echo "请确保项目文件已正确同步到容器"
  exit 1
fi

# Next.js 项目启动函数
start_nextjs_project() {
  echo "▲ Next.js Cloud Code Editor 专用环境"
    
  # 智能依赖缓存检查
  echo "📦 检查项目依赖..."
  
  PACKAGE_HASH=""
  if [ -f "package.json" ]; then
    PACKAGE_HASH=$(sha256sum package.json | cut -d' ' -f1)
  fi
  
  CACHE_FILE="/app/.deps-cache"
  NEED_INSTALL=true
  
  if [ -f "$CACHE_FILE" ] && [ -d "node_modules" ]; then
    CACHED_HASH=$(cat "$CACHE_FILE" 2>/dev/null || echo "")
    if [ "$PACKAGE_HASH" = "$CACHED_HASH" ]; then
      echo "✅ 依赖缓存命中，跳过安装"
      NEED_INSTALL=false
    fi
  fi
    
  if [ "$NEED_INSTALL" = true ]; then
    echo "📦 安装 Next.js 依赖..."
    
    # 配置npm镜像源和缓存优化
    echo "🌐 配置npm镜像源: 淘宝镜像源"
    npm config set registry https://registry.npmmirror.com/
    npm config set cache /app/.npm-cache
    npm config set prefer-offline true
    npm config set audit false
    npm config set fund false
    
    echo "当前工作目录: $(pwd)"
    echo "当前目录内容: $(ls -la)"
    
    # 再次确认package.json存在（防止竞争条件）
    if [ ! -f "package.json" ]; then
      echo "⚠️  package.json 不存在，等待文件同步完成..."
      sleep 10
      if [ ! -f "package.json" ]; then
        echo "❌ package.json 仍然不存在，无法安装依赖"
        echo "最终目录内容: $(ls -la)"
        exit 1
      fi
    fi

    # 创建缓存目录
    mkdir -p /app/.npm-cache
    
    # 智能安装依赖
    if [ -f "package-lock.json" ]; then
      npm ci --cache /app/.npm-cache
    else
      npm install --cache /app/.npm-cache
    fi
    
    # 验证依赖安装
    if [ ! -d "node_modules" ]; then
      echo "❌ 依赖安装失败"
      exit 1
    fi
    
    # 保存依赖缓存标记
    echo "$PACKAGE_HASH" > "$CACHE_FILE"
    echo "✅ Next.js 依赖安装完成"
  fi
    
  # 启动 Next.js 开发服务器（Turbopack）
  echo "🚀 启动 Next.js 应用 (Turbopack)..."
  
  while true; do
    echo "$(date): 启动 Next.js 开发服务器 (Turbopack)"
    
    # 优先使用package.json中的dev脚本
    if grep -q '"dev"' package.json; then
      npm run dev
    else
      # 后备启动命令
      npx next dev --turbopack --hostname 0.0.0.0 --port 3000
    fi
    
    echo "$(date): Next.js 应用已停止，3秒后自动重启..."
    sleep 3
  done
}

# 启动 Next.js 项目
start_nextjs_project
`;
  }

  // 创建代码编辑器容器
  async createCodeEditorPod(projectId: string, runtime: string = 'node'): Promise<k8s.V1Pod> {
    const podName = `code-editor-${projectId}`;
    
    // 先检查 Pod 是否已存在
    try {
      const existingPod = await this.coreApi.readNamespacedPod({
        name: podName,
        namespace: this.namespace,
      });
      
      // 如果 Pod 存在且状态正常，直接返回
      if (existingPod.status?.phase === 'Running' || existingPod.status?.phase === 'Pending') {
        console.log(`Pod ${podName} 已存在，状态: ${existingPod.status?.phase}`);
        return existingPod;
      }
      
      // 如果 Pod 存在但状态异常，先删除再重建
      if (existingPod.status?.phase === 'Failed' || existingPod.status?.phase === 'Succeeded') {
        console.log(`Pod ${podName} 状态异常 (${existingPod.status?.phase})，删除后重建`);
        await this.coreApi.deleteNamespacedPod({
          name: podName,
          namespace: this.namespace,
        });
        // 等待删除完成
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      // Pod 不存在，继续创建
      console.log(`Pod ${podName} 不存在，创建新 Pod`);
    }

    // 创建启动脚本 ConfigMap
    await this.createStartupConfigMap(projectId, runtime);

    const podSpec: k8s.V1Pod = {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: {
        name: podName,
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
            imagePullPolicy: 'IfNotPresent', // 优先使用本地镜像
            command: ['/bin/sh'],
            args: ['/scripts/startup.sh'],
            workingDir: '/app',
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
              {
                name: 'PORT',
                value: '3000',
              },
            ],
            resources: {
              requests: {
                memory: '512Mi',
                cpu: '500m',
              },
              limits: {
                memory: '1Gi',
                cpu: '1000m',
              },
            },
            volumeMounts: [
              {
                name: 'workspace',
                mountPath: '/workspace',
              },
              {
                name: 'startup-script',
                mountPath: '/scripts',
              },
            ],
          },
        ],
        volumes: [
          {
            name: 'workspace',
            emptyDir: {},
          },
          {
            name: 'startup-script',
            configMap: {
              name: `startup-script-${projectId}`,
              defaultMode: 0o755,
            },
          },
        ],
        restartPolicy: 'Always',
      },
    };

    try {
      const response = await this.coreApi.createNamespacedPod({
        namespace: this.namespace,
        body: podSpec,
      });
      return response;
    } catch (error: any) {
      // 如果是因为已存在而失败，尝试获取现有 Pod
      if (error.statusCode === 409) {
        console.log('Pod 创建失败（已存在），获取现有 Pod');
        const existingPod = await this.coreApi.readNamespacedPod({
          name: podName,
          namespace: this.namespace,
        });
        return existingPod;
      }
      throw error;
    }
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

  // 获取容器日志
  async getPodLogs(projectId: string, tailLines: number = 100): Promise<string> {
    const podName = `code-editor-${projectId}`;
    try {
      const logs = await this.coreApi.readNamespacedPodLog({
        name: podName,
        namespace: this.namespace,
        container: 'code-runner',
        tailLines: tailLines,
      });
      return logs;
    } catch (error) {
      console.error(`获取Pod日志失败: ${error}`);
      throw error;
    }
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

  // 智能文件同步 - 检查文件变更
  async syncProjectFilesToContainerSmart(projectId: string): Promise<{hasChanges: boolean, changedFiles: number}> {
    console.log(`开始智能同步项目 ${projectId} 的文件...`);
    
    try {
      // 从数据库获取项目文件
      const { FileManager } = await import('@/lib/file-manager');
      const files = await FileManager.getProjectFiles(projectId);
      
      if (!files || files.length === 0) {
        console.log('项目无文件，跳过同步');
        return { hasChanges: false, changedFiles: 0 };
      }

      const podName = `code-editor-${projectId}`;
      let changedFiles = 0;
      
      // 检查每个文件是否需要更新
      for (const file of files) {
        // 确保检查的路径也在 /app 目录下
        const targetPath = file.path.startsWith('/app/') ? file.path : `/app${file.path.startsWith('/') ? '' : '/'}${file.path}`;
        
        try {
          // 获取容器中文件的hash
          const containerHashCommand = ['sh', '-c', `sha256sum "${targetPath}" 2>/dev/null | cut -d' ' -f1 || echo "not_found"`];
          const containerHash = await this.execInPod(projectId, containerHashCommand);
          
          // 计算数据库中文件的hash
          const crypto = require('crypto');
          const dbHash = crypto.createHash('sha256').update(file.content).digest('hex');
          
          if (containerHash.trim() !== dbHash) {
            // 文件需要更新
            await this.writeFileToContainer(projectId, file.path, file.content);
            changedFiles++;
            console.log(`文件已更新: ${file.path}`);
          }
        } catch (error) {
          // 文件不存在或读取失败，直接写入
          await this.writeFileToContainer(projectId, file.path, file.content);
          changedFiles++;
          console.log(`文件已创建: ${file.path}`);
        }
      }
      
      console.log(`智能同步完成，${changedFiles}个文件有变更`);
      return { hasChanges: changedFiles > 0, changedFiles };
      
    } catch (error) {
      console.error(`智能同步项目文件失败:`, error);
      throw error;
    }
  }

  // 传统文件同步（保持向后兼容）
  async syncProjectFilesToContainer(projectId: string): Promise<void> {
    console.log(`开始同步项目 ${projectId} 的文件到容器...`);
    
    try {
      // 从数据库获取项目文件
      const { FileManager } = await import('@/lib/file-manager');
      const files = await FileManager.getProjectFiles(projectId);
      
      console.log(`找到 ${files.length} 个文件需要同步`);
      
      // 依次写入每个文件到容器
      for (const file of files) {
        console.log(`同步文件: ${file.path}`);
        await this.writeFileToContainer(projectId, file.path, file.content);
      }
      
      console.log(`项目 ${projectId} 文件同步完成`);
    } catch (error) {
      console.error(`同步项目文件失败:`, error);
      throw error;
    }
  }

  // 将文件写入容器
  async writeFileToContainer(projectId: string, filePath: string, content: string): Promise<void> {
    try {
      // 确保路径以 /app 开头
      const targetPath = filePath.startsWith('/app/') ? filePath : `/app${filePath.startsWith('/') ? '' : '/'}${filePath}`;
      
      // 确保目录存在
      const dirPath = targetPath.substring(0, targetPath.lastIndexOf('/'));
      if (dirPath) {
        const mkdirCommand = ['mkdir', '-p', dirPath];
        await this.execInPod(projectId, mkdirCommand);
      }
      
      // 写入文件内容
      const writeCommand = ['sh', '-c', `cat > "${targetPath}" << 'EOF'\n${content}\nEOF`];
      await this.execInPod(projectId, writeCommand);
      
      console.log(`文件写入成功: ${targetPath}`);
    } catch (error) {
      console.error(`写入文件失败 ${filePath}:`, error);
      throw error;
    }
  }

  // 从容器读取文件
  async readFileFromContainer(projectId: string, filePath: string): Promise<string> {
    // 确保路径以 /app 开头
    const targetPath = filePath.startsWith('/app/') ? filePath : `/app${filePath.startsWith('/') ? '' : '/'}${filePath}`;
    const command = ['cat', targetPath];
    return await this.execInPod(projectId, command);
  }

  // 安全重启容器中的应用
  async restartContainerApp(projectId: string): Promise<void> {
    try {
      console.log(`开始重启容器应用: ${projectId}`);
      
      // 1. 检查当前运行的进程
      const psCommand = ['ps', 'aux'];
      const processes = await this.execInPod(projectId, psCommand);
      console.log('当前运行进程:', processes);
      
      // 2. 智能识别应用进程并重启
      if (processes.includes('react-scripts')) {
        // React应用重启
        await this.restartReactApp(projectId);
      } else if (processes.includes('next')) {
        // Next.js应用重启
        await this.restartNextApp(projectId);
      } else if (processes.includes('npm run dev')) {
        // 通用开发服务器重启
        await this.restartDevServer(projectId);
      } else {
        // 最后尝试软重启
        await this.gracefulRestart(projectId);
      }
      
      console.log(`容器应用重启完成: ${projectId}`);
    } catch (error) {
      console.error(`应用重启失败: ${error}`);
      // 重启失败时，尝试重新启动整个容器
      await this.recoverContainer(projectId);
    }
  }

  // React应用专用重启
  private async restartReactApp(projectId: string): Promise<void> {
    try {
      // 查找react-scripts进程PID
      const findCommand = ['pgrep', '-f', 'react-scripts'];
      const pid = await this.execInPod(projectId, findCommand);
      
      if (pid.trim()) {
        // 发送SIGTERM信号而不是SIGKILL
        const killCommand = ['kill', '-TERM', pid.trim()];
        await this.execInPod(projectId, killCommand);
        
        // 等待进程优雅关闭
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.log('React应用重启信号发送完成');
    }
  }

  // Next.js应用专用重启
  private async restartNextApp(projectId: string): Promise<void> {
    try {
      const findCommand = ['pgrep', '-f', 'next'];
      const pid = await this.execInPod(projectId, findCommand);
      
      if (pid.trim()) {
        const killCommand = ['kill', '-TERM', pid.trim()];
        await this.execInPod(projectId, killCommand);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.log('Next.js应用重启信号发送完成');
    }
  }

  // 开发服务器重启
  private async restartDevServer(projectId: string): Promise<void> {
    try {
      // 查找npm进程但保留PID 1
      const findCommand = ['pgrep', '-f', 'npm.*dev'];
      const pid = await this.execInPod(projectId, findCommand);
      
      if (pid.trim() && pid.trim() !== '1') {
        const killCommand = ['kill', '-TERM', pid.trim()];
        await this.execInPod(projectId, killCommand);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.log('开发服务器重启信号发送完成');
    }
  }

  // 优雅重启
  private async gracefulRestart(projectId: string): Promise<void> {
    try {
      // 发送HUP信号尝试热重载
      const reloadCommand = ['pkill', '-HUP', '-f', 'node'];
      await this.execInPod(projectId, reloadCommand);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log('优雅重启完成');
    }
  }

  // 容器恢复机制
  private async recoverContainer(projectId: string): Promise<void> {
    try {
      console.log(`尝试恢复容器: ${projectId}`);
      
      // 检查容器状态
      const podStatus = await this.getPodStatus(projectId);
      if (podStatus?.status?.phase !== 'Running') {
        console.log('容器已停止，无需恢复');
        return;
      }

      // 尝试重新运行启动脚本
      const restartCommand = ['sh', '-c', 'cd /app && npm run dev 2>&1 &'];
      await this.execInPod(projectId, restartCommand);
      
      console.log('容器恢复完成');
    } catch (error) {
      console.error('容器恢复失败:', error);
      throw error;
    }
  }

  // 创建或获取服务以暴露容器
  async createService(projectId: string): Promise<k8s.V1Service> {
    const serviceName = `code-editor-service-${projectId}`;
    
    // 先检查服务是否已存在
    try {
      const existingService = await this.coreApi.readNamespacedService({
        name: serviceName,
        namespace: this.namespace,
      });
      console.log(`服务 ${serviceName} 已存在，跳过创建`);
      return existingService;
    } catch (error) {
      // 服务不存在，继续创建
      console.log(`服务 ${serviceName} 不存在，创建新服务`);
    }

    // 在开发环境使用NodePort，生产环境使用ClusterIP
    const isDevelopment = process.env.NODE_ENV === 'development';
    const nodePort = isDevelopment ? this.generatePortFromProjectId(projectId) : undefined;

    const portSpec: any = {
      port: 3000,
      targetPort: 3000,
      name: 'web',
    };

    // 只在NodePort类型时添加nodePort字段
    if (isDevelopment && nodePort) {
      portSpec.nodePort = nodePort;
    }

    const serviceSpec: k8s.V1Service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: serviceName,
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
        ports: [portSpec],
        type: isDevelopment ? 'NodePort' : 'ClusterIP',
      },
    };

    try {
      const response = await this.coreApi.createNamespacedService({
        namespace: this.namespace,
        body: serviceSpec,
      });
      return response;
    } catch (error: any) {
      // 如果是因为已存在而失败，尝试获取现有服务
      if (error.statusCode === 409) {
        console.log('服务创建失败（已存在），获取现有服务');
        const existingService = await this.coreApi.readNamespacedService({
          name: serviceName,
          namespace: this.namespace,
        });
        return existingService;
      }
      throw error;
    }
  }

  // 创建或获取 Ingress 以暴露服务
  async createIngress(projectId: string): Promise<k8s.V1Ingress> {
    const ingressName = `code-editor-ingress-${projectId}`;
    const serviceName = `code-editor-service-${projectId}`;
    const host = this.generateProjectHost(projectId);
    
    // 先检查 Ingress 是否已存在
    try {
      const existingIngress = await k8sExtensionsApi.readNamespacedIngress({
        name: ingressName,
        namespace: this.namespace,
      });
      console.log(`Ingress ${ingressName} 已存在，跳过创建`);
      return existingIngress;
    } catch (error) {
      // Ingress 不存在，继续创建
      console.log(`Ingress ${ingressName} 不存在，创建新 Ingress`);
    }

    const ingressSpec: k8s.V1Ingress = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: ingressName,
        namespace: this.namespace,
        labels: {
          app: 'code-editor',
          projectId: projectId,
        },
        annotations: {
          'nginx.ingress.kubernetes.io/rewrite-target': '/',
          'nginx.ingress.kubernetes.io/proxy-body-size': '50m',
          'nginx.ingress.kubernetes.io/proxy-read-timeout': '300',
          'nginx.ingress.kubernetes.io/proxy-send-timeout': '300',
        },
      },
      spec: {
        ingressClassName: 'nginx', // 假设使用 nginx-ingress
        rules: [
          {
            host: host,
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: serviceName,
                      port: {
                        number: 3000,
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    };

    try {
      const response = await k8sExtensionsApi.createNamespacedIngress({
        namespace: this.namespace,
        body: ingressSpec,
      });
      console.log(`Ingress 创建成功: ${host}`);
      return response;
    } catch (error: any) {
      // 如果是因为已存在而失败，尝试获取现有 Ingress
      if (error.statusCode === 409) {
        console.log('Ingress 创建失败（已存在），获取现有 Ingress');
        const existingIngress = await k8sExtensionsApi.readNamespacedIngress({
          name: ingressName,
          namespace: this.namespace,
        });
        return existingIngress;
      }
      throw error;
    }
  }

  // 删除 Ingress
  async deleteIngress(projectId: string): Promise<void> {
    const ingressName = `code-editor-ingress-${projectId}`;
    try {
      await k8sExtensionsApi.deleteNamespacedIngress({
        name: ingressName,
        namespace: this.namespace,
      });
      console.log(`Ingress ${ingressName} 删除成功`);
    } catch (error) {
      console.error(`删除 Ingress ${ingressName} 失败:`, error);
    }
  }

  // 获取项目访问 URL
  getProjectUrl(projectId: string): string {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // 开发环境使用NodePort直接访问
      const port = this.generatePortFromProjectId(projectId);
      const kubeHost = process.env.KUBERNETES_HOST || 'localhost';
      console.log(`为项目 ${projectId} 生成访问URL: http://${kubeHost}:${port}`);
      return `http://${kubeHost}:${port}`;
    } else {
      // 生产环境使用Ingress域名
      const host = this.generateProjectHost(projectId);
      return `https://${host}`;
    }
  }

  // 生成项目专用的主机名
  private generateProjectHost(projectId: string): string {
    // 生成基于项目ID的子域名
    const sanitizedProjectId = projectId.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const baseHost = process.env.INGRESS_BASE_HOST || 'code-editor.local';
    
    // Ingress host 不能包含端口号，所以统一使用子域名格式
    return `${sanitizedProjectId}.${baseHost}`;
  }

  // 根据项目ID生成唯一端口（NodePort范围：30000-32767）
  private generatePortFromProjectId(projectId: string): number {
    // 将项目ID转换为数字，然后映射到30000-32767范围
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      const char = projectId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    // NodePort 有效范围是 30000-32767，总共2768个端口
    return 30000 + Math.abs(hash % 2768);
  }

  // 根据运行时选择镜像 - 只支持Next.js
  private getImageByRuntime(runtime: string): string {
    // 只支持Next.js，使用预构建镜像
    return 'nextjs-base:latest';
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