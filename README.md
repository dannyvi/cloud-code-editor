# Cloud Code Editor

一个基于 Next.js 的在线代码编辑器，类似 CodeSandbox，支持实时预览和容器化运行环境。

## 🚀 功能特性

- **实时代码编辑**: 基于 Monaco Editor 的强大代码编辑器
- **实时预览**: 代码修改立即在预览窗口中反映
- **容器化运行**: 基于 Kubernetes 的安全隔离环境
- **多语言支持**: JavaScript、Python、Java 等多种语言
- **文件管理**: 完整的文件浏览和管理功能
- **响应式设计**: 支持桌面、平板和手机视图

## 🛠️ 技术栈

### 前端
- **Next.js 15**: React 全栈框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **shadcn/ui**: 组件库
- **Monaco Editor**: 代码编辑器
- **Lucide React**: 图标库

### 后端
- **Next.js API Routes**: 后端 API
- **Kubernetes Client**: 容器管理
- **Socket.io**: 实时通信（计划中）

### 基础设施
- **Kubernetes**: 容器编排
- **Docker**: 容器化

## 📁 项目结构

```
cloud-code-editor/
├── src/
│   ├── app/
│   │   ├── api/                  # API Routes
│   │   │   ├── containers/       # 容器管理 API
│   │   │   ├── files/           # 文件操作 API
│   │   │   └── preview/         # 预览相关 API
│   │   ├── editor/              # 编辑器页面
│   │   └── page.tsx             # 主页
│   ├── components/
│   │   ├── CodeEditor/          # Monaco Editor 组件
│   │   ├── FileExplorer/        # 文件浏览器
│   │   ├── PreviewFrame/        # 预览窗口
│   │   └── ui/                  # shadcn/ui 组件
│   └── lib/
│       ├── kubernetes.ts        # Kubernetes 客户端
│       └── utils.ts             # 工具函数
├── docker/                      # Docker 配置
└── package.json
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📝 使用方法

### 基本使用

1. **访问主页**: 打开浏览器访问主页
2. **进入编辑器**: 点击"开始编码"按钮
3. **编写代码**: 在左侧编辑器中编写代码
4. **文件管理**: 使用左侧文件浏览器管理文件
5. **实时预览**: 在右侧预览窗口查看结果

### 快捷键

- `Ctrl/Cmd + S`: 保存文件
- `Ctrl/Cmd + Enter`: 运行代码

## 🔧 配置

### Kubernetes 配置

1. **开发环境**: 配置本地 kubectl
2. **生产环境**: 配置集群内服务账户

### 环境变量

创建 `.env.local` 文件：

```env
# Kubernetes 配置
KUBE_CONFIG_PATH=/path/to/kubeconfig
KUBE_NAMESPACE=default

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端 (React)   │    │  后端 (Next.js)  │    │ K8s 容器集群    │
│                 │    │                 │    │                │
│ - Monaco Editor │◄──►│ - API Routes    │◄──►│ - Code Runner  │
│ - File Explorer │    │ - K8s Client    │    │ - File System  │
│ - Preview Frame │    │ - WebSocket     │    │ - Hot Reload   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 工作流程

1. **用户编辑代码** → 前端 Monaco Editor
2. **代码同步** → Next.js API Routes
3. **文件写入** → Kubernetes Pod
4. **触发重载** → 容器内应用重启
5. **更新预览** → 预览窗口刷新

## 📦 部署

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm start
```

### 生产环境

1. **构建 Docker 镜像**
2. **部署到 Kubernetes**
3. **配置 Ingress 和服务发现**

## 🔐 安全性

- **容器隔离**: 每个项目运行在独立的容器中
- **资源限制**: 严格的 CPU 和内存限制
- **网络隔离**: 容器间网络隔离
- **权限控制**: 最小权限原则

## 🚧 待实现功能

- [ ] **实时协作**: 多人同时编辑
- [ ] **版本控制**: Git 集成
- [ ] **插件系统**: 扩展功能
- [ ] **模板市场**: 项目模板
- [ ] **用户系统**: 登录和项目管理
- [ ] **性能监控**: 容器资源监控

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

## 📄 许可证

MIT License

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Kubernetes 文档](https://kubernetes.io/docs/)
- [shadcn/ui](https://ui.shadcn.com/)

## 💡 灵感来源

这个项目受到以下工具的启发：
- [CodeSandbox](https://codesandbox.io/)
- [StackBlitz](https://stackblitz.com/)
- [Replit](https://replit.com/)
- [GitHub Codespaces](https://github.com/features/codespaces)
