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

  // 生成启动脚本
  private generateStartupScript(runtime: string): string {
    switch (runtime) {
      case 'node':
        return `#!/bin/sh
echo "🚀 启动 Node.js 项目..."

# 确保工作目录存在
mkdir -p /workspace
cd /workspace

# 等待项目文件同步完成
echo "⏳ 等待项目文件同步..."
timeout=120
while [ $timeout -gt 0 ]; do
  # 检查是否有项目文件标识
  if [ -f "package.json" ] || [ -f "index.html" ] || [ -f "index.js" ] || [ -f "src/App.js" ] || [ -f "src/App.jsx" ] || [ -f "src/App.tsx" ]; then
    echo "✅ 检测到项目文件"
    break
  fi
  sleep 1
  timeout=$((timeout-1))
  if [ $((timeout % 10)) -eq 0 ]; then
    echo "等待项目文件... 剩余 $timeout 秒"
  fi
done

if [ $timeout -eq 0 ]; then
  echo "⚠️  超时未检测到项目文件，创建默认项目"
fi

# 检测项目类型并启动
detect_and_start_project() {
  echo "🔍 检测项目类型..."
  
  if [ -f "package.json" ]; then
    echo "📦 发现 package.json，分析项目类型..."
    
    # 读取package.json中的脚本和依赖
    if grep -q '"react"' package.json; then
      echo "⚛️  检测到 React 项目"
      PROJECT_TYPE="react"
    elif grep -q '"next"' package.json; then
      echo "▲ 检测到 Next.js 项目" 
      PROJECT_TYPE="nextjs"
    elif grep -q '"vue"' package.json; then
      echo "🌿 检测到 Vue 项目"
      PROJECT_TYPE="vue"
    elif grep -q '"express"' package.json; then
      echo "🚂 检测到 Express 项目"
      PROJECT_TYPE="express"
    elif grep -q '"@angular"' package.json; then
      echo "🅰️  检测到 Angular 项目"
      PROJECT_TYPE="angular"
    else
      echo "📄 检测到普通 Node.js 项目"
      PROJECT_TYPE="nodejs"
    fi
    
    # 安装依赖
    echo "📦 安装项目依赖..."
    
    # 强制重新安装所有依赖
    rm -rf node_modules package-lock.json yarn.lock 2>/dev/null || true
    npm install --no-audit --no-fund --verbose
    
    # 验证依赖安装
    if [ ! -d "node_modules" ]; then
      echo "❌ 依赖安装失败"
      create_fallback_server
      return
    fi
    
    echo "✅ 依赖安装完成"
    
    # 根据项目类型和package.json脚本启动（优先dev命令）
    echo "🎯 启动项目..."
    
    # 检查React项目特殊处理
    if [ "$PROJECT_TYPE" = "react" ]; then
      if [ -f "node_modules/.bin/react-scripts" ]; then
        echo "运行: npm run start"
        exec npm run start
      elif grep -q '"dev"' package.json; then
        echo "运行: npm run dev"
        exec npm run dev
      else
        echo "⚠️  React项目但缺少启动脚本，尝试直接启动"
        exec npx react-scripts start
      fi
    elif [ "$PROJECT_TYPE" = "nextjs" ]; then
      if grep -q '"dev"' package.json; then
        echo "运行: npm run dev"
        exec npm run dev
      else
        echo "运行: npx next dev"
        exec npx next dev
      fi
    elif [ "$PROJECT_TYPE" = "vue" ]; then
      if grep -q '"dev"' package.json; then
        echo "运行: npm run dev"
        exec npm run dev
      elif grep -q '"serve"' package.json; then
        echo "运行: npm run serve"
        exec npm run serve
      else
        echo "运行: npx vue-cli-service serve"
        exec npx vue-cli-service serve
      fi
    else
      # 其他项目类型，优先dev命令
      if grep -q '"dev"' package.json; then
        echo "运行: npm run dev"
        exec npm run dev
      elif grep -q '"start"' package.json; then
        echo "运行: npm run start"  
        exec npm run start
      elif grep -q '"serve"' package.json; then
        echo "运行: npm run serve"
        exec npm run serve
      elif [ -f "index.js" ]; then
        echo "运行: node index.js"
        exec node index.js
      elif [ -f "app.js" ]; then
        echo "运行: node app.js"
        exec node app.js
      elif [ -f "server.js" ]; then
        echo "运行: node server.js"
        exec node server.js
      else
        echo "❌ 未找到合适的启动方式"
        create_fallback_server
      fi
    fi
    
  elif [ -f "index.html" ]; then
    echo "🌐 检测到静态网站项目"
    start_static_server
    
  else
    echo "❓ 未检测到已知项目类型，创建默认服务器"
    create_fallback_server
  fi
}

# 启动静态文件服务器
start_static_server() {
  echo "🌐 启动静态文件服务器..."
  
  # 创建简单的静态服务器
  cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 静态文件服务
app.use(express.static('.'));

// SPA支持 - 所有路由都返回index.html
app.get('*', (req, res) => {
  if (req.path.includes('.')) {
    res.status(404).send('File not found');
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`🌟 Static server running on http://0.0.0.0:\${PORT}\`);
});
EOF

  # 先安装express
  npm init -y > /dev/null 2>&1
  npm install express --no-audit --no-fund
  exec node server.js
}

# 创建回退服务器
create_fallback_server() {
  echo "📝 创建默认服务器..."
  
  cat > package.json << 'EOF'
{
  "name": "cloud-code-fallback",
  "version": "1.0.0",
  "scripts": { "start": "node index.js" },
  "dependencies": { "express": "^4.18.2" }
}
EOF

  cat > index.js << 'EOF'
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('.'));

app.get('/', (req, res) => {
  res.send(\`
<!DOCTYPE html>
<html>
<head><title>Cloud Code Editor - 等待项目文件</title>
<style>body{font-family:Arial;margin:40px;background:#f5f5f5;}
.container{max-width:600px;margin:0 auto;background:white;padding:40px;border-radius:8px;text-align:center;}</style>
</head>
<body>
<div class="container">
<h1>🌟 Cloud Code Editor</h1>
<p>容器已启动，等待项目文件部署...</p>
<p>请点击编辑器中的"部署"按钮来同步您的项目文件。</p>
<p><small>项目ID: \${process.env.PROJECT_ID}</small></p>
</div></body></html>
  \`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`🌟 Fallback server running on http://0.0.0.0:\${PORT}\`);
});
EOF

  npm install --no-audit --no-fund --silent
  exec node index.js
}

# 执行检测和启动
detect_and_start_project
`;

      case 'python':
        return `#!/bin/sh
set -e

echo "🚀 启动 Python 项目..."

cd /workspace

# 等待项目文件
timeout=60
while [ $timeout -gt 0 ] && [ ! -f "requirements.txt" ] && [ ! -f "app.py" ] && [ ! -f "main.py" ]; do
  sleep 1
  timeout=$((timeout-1))
done

# 安装依赖
if [ -f "requirements.txt" ]; then
  echo "📦 安装依赖..."
  pip install -r requirements.txt
fi

# 启动项目
if [ -f "app.py" ]; then
  python app.py
elif [ -f "main.py" ]; then
  python main.py
else
  echo "创建默认 Flask 应用"
  cat > app.py << 'EOF'
from flask import Flask, jsonify
import os
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({
        'message': 'Hello from Cloud Code Editor!',
        'timestamp': datetime.now().isoformat(),
        'project': os.getenv('PROJECT_ID')
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)
EOF
  pip install flask
  python app.py
fi
`;

      default:
        return `#!/bin/sh
echo "🚀 启动项目..."
cd /workspace
tail -f /dev/null
`;
    }
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
            command: ['/bin/sh'],
            args: ['/scripts/startup.sh'],
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

  // 同步项目文件到容器
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
      // 确保目录存在
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
      if (dirPath) {
        const mkdirCommand = ['mkdir', '-p', dirPath];
        await this.execInPod(projectId, mkdirCommand);
      }
      
      // 写入文件内容
      const writeCommand = ['sh', '-c', `cat > "${filePath}" << 'EOF'\n${content}\nEOF`];
      await this.execInPod(projectId, writeCommand);
      
      console.log(`文件写入成功: ${filePath}`);
    } catch (error) {
      console.error(`写入文件失败 ${filePath}:`, error);
      throw error;
    }
  }

  // 从容器读取文件
  async readFileFromContainer(projectId: string, filePath: string): Promise<string> {
    const command = ['cat', filePath];
    return await this.execInPod(projectId, command);
  }

  // 重启容器中的应用（发送重启信号）
  async restartContainerApp(projectId: string): Promise<void> {
    try {
      // 尝试通过信号重启应用
      const restartCommand = ['pkill', '-f', 'node|python'];
      await this.execInPod(projectId, restartCommand);
      
      // 等待一下让进程重启
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`容器应用重启完成: ${projectId}`);
    } catch (error) {
      console.log(`应用重启信号发送失败（可能进程不存在）: ${error}`);
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