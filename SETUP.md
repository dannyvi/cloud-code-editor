# Cloud Code Editor 设置指南

## 快速开始

### 1. 设置 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并创建新项目
2. 在项目设置中找到以下信息：
   - `Project URL`
   - `anon public` API 密钥

### 2. 配置环境变量

1. 复制环境变量模板：
   ```bash
   cp .env.local.example .env.local
   ```

2. 编辑 `.env.local` 文件，填入您的 Supabase 信息：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=您的_supabase_项目_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=您的_supabase_anon_密钥
   ```

### 3. 执行数据库迁移

1. 在 Supabase 项目的 SQL Editor 中执行：
   ```sql
   -- 复制并执行 supabase/migrations/001_initial_schema.sql 中的所有内容
   ```

2. 或者使用 Supabase CLI：
   ```bash
   npx supabase db reset
   ```

### 4. 启动应用

```bash
npm run dev
```

访问 http://localhost:3000 开始使用！

## 功能特性

✅ **已完成功能**
- 🏠 项目管理首页（创建、查看、删除项目）
- 📁 文件管理系统（支持文件树结构）
- 💾 Supabase 数据存储
- 🎨 6种项目模板（Vanilla JS、React、Vue、Node.js、Python、Next.js）
- 🔄 实时文件同步
- 🎯 Monaco 代码编辑器
- 🖥️ 实时预览窗口
- 🐳 Kubernetes 容器管理

⏳ **待完善功能**
- 用户认证系统
- 多用户协作
- 更多编程语言支持
- 高级容器配置

## 项目模板

系统预置了 6 种项目模板：

1. **Vanilla JavaScript** - 基础的 HTML/CSS/JS 项目
2. **React** - React 应用模板
3. **Vue.js** - Vue 3 应用模板
4. **Node.js** - Express.js 后端 API
5. **Python** - Flask Web 应用
6. **Next.js** - 全栈 React 框架

每个模板都包含完整的启动代码和样式。

## 使用指南

### 创建项目
1. 在首页点击"创建新项目"
2. 填入项目名称和描述
3. 选择项目模板
4. 点击"创建项目"

### 编辑代码
1. 在项目列表中点击"打开项目"
2. 使用左侧文件浏览器选择文件
3. 在中央编辑器中编写代码
4. 代码会自动保存并同步

### 运行项目
1. 点击"运行"按钮启动容器
2. 在右侧预览窗口查看结果
3. 使用"停止"或"重启"控制容器

## 故障排除

### 常见问题

1. **无法连接 Supabase**
   - 检查 `.env.local` 文件中的配置
   - 确认 Supabase 项目 URL 和 API 密钥正确

2. **数据库表不存在**
   - 确保已执行数据库迁移
   - 检查 Supabase 项目的表结构

3. **实时同步失败**
   - 检查网络连接
   - 查看浏览器控制台错误信息

### 开发调试

启用详细日志：
```bash
DEBUG=* npm run dev
```

### 获取帮助

如遇问题，请：
1. 检查浏览器控制台错误
2. 查看 Next.js 服务器日志
3. 确认 Supabase 项目状态

## 技术栈

- **前端**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Lucide React
- **编辑器**: Monaco Editor (VS Code 核心)
- **数据库**: Supabase (PostgreSQL)
- **实时通信**: Server-Sent Events (SSE)
- **容器化**: Kubernetes Client
- **状态管理**: Zustand

## 开发环境

- Node.js 18+
- npm 或 yarn
- 现代浏览器（Chrome, Firefox, Safari, Edge）