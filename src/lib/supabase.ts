import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// 项目类型定义 - 只支持Next.js
export interface Project {
  id: string;
  name: string;
  description?: string;
  template: 'next';
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  is_public: boolean;
}

// 项目文件类型定义
export interface ProjectFile {
  id: string;
  project_id: string;
  path: string;
  content: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

// 项目管理器类
export class ProjectManager {
  // 创建新项目
  static async createProject(projectData: {
    name: string;
    description?: string;
    template: Project['template'];
  }): Promise<Project> {
    const project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'last_accessed_at'> = {
      name: projectData.name,
      description: projectData.description,
      template: 'next', // 强制使用Next.js
      is_public: false,
    };

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        ...project,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('创建项目失败:', error);
      throw new Error(`创建项目失败: ${error.message}`);
    }

    // 创建项目文件
    await this.createProjectFiles(data.id, 'next');
    
    return data;
  }

  // 获取所有项目
  static async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('last_accessed_at', { ascending: false });

    if (error) {
      console.error('获取项目列表失败:', error);
      throw new Error(`获取项目列表失败: ${error.message}`);
    }

    return data || [];
  }

  // 获取单个项目
  static async getProject(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 项目不存在
      }
      console.error('获取项目失败:', error);
      throw new Error(`获取项目失败: ${error.message}`);
    }

    // 更新最后访问时间
    await this.updateLastAccessed(id);

    return data;
  }

  // 删除项目
  static async deleteProject(id: string): Promise<void> {
    // 先删除项目文件
    await supabase.from('project_files').delete().eq('project_id', id);
    
    // 再删除项目
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('删除项目失败:', error);
      throw new Error(`删除项目失败: ${error.message}`);
    }
  }

  // 更新最后访问时间
  static async updateLastAccessed(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('更新访问时间失败:', error);
    }
  }

  // 创建项目文件
  static async createProjectFiles(projectId: string, template: Project['template']): Promise<void> {
    const templateFiles = this.getTemplateFiles(template);
    
    const filesToInsert = templateFiles.map(file => ({
      project_id: projectId,
      path: file.path,
      content: file.content,
      mime_type: file.mime_type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('project_files').insert(filesToInsert);
    
    if (error) {
      console.error('创建项目文件失败:', error);
      throw new Error(`创建项目文件失败: ${error.message}`);
    }
  }

  // 获取Next.js模板文件 - 使用Turbopack
  static getTemplateFiles(template: Project['template']): Array<{
    path: string;
    content: string;
    mime_type: string;
  }> {
    return [
      {
        path: 'package.json',
        content: JSON.stringify({
          "name": "nextjs-app",
          "version": "1.0.0",
          "scripts": {
            "dev": "next dev --turbopack",
            "build": "next build",
            "start": "next start",
            "lint": "next lint"
          },
          "dependencies": {
            "next": "15.3.5",
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "@supabase/supabase-js": "^2.50.4"
          },
          "devDependencies": {
            "@types/node": "^20",
            "@types/react": "^18",
            "@types/react-dom": "^18",
            "eslint": "^8",
            "eslint-config-next": "15.3.5",
            "typescript": "^5"
          }
        }, null, 2),
        mime_type: 'application/json',
      },
      {
        path: 'pages/index.js',
        content: `import { useState } from 'react';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div style={styles.container}>
      <h1>🚀 Next.js + Turbopack + Cloud Code Editor</h1>
      <p>欢迎使用高性能云端代码编辑器！</p>
      <div style={styles.counter}>
        <button style={styles.button} onClick={() => setCount(count - 1)}>-</button>
        <span style={styles.count}>计数: {count}</span>
        <button style={styles.button} onClick={() => setCount(count + 1)}>+</button>
      </div>
      <p style={styles.description}>
        ⚡ 使用 Turbopack 极速开发<br/>
        🔗 集成 Supabase 数据库<br/>
        ☁️ 云端实时同步编辑
      </p>
      <p>修改代码并保存，查看实时效果！</p>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '40px',
    color: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'calc(10px + 2vmin)',
  },
  counter: {
    margin: '20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  button: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: '2px solid white',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
  },
  count: {
    fontSize: '20px',
    fontWeight: 'bold',
    minWidth: '120px',
  },
  description: {
    fontSize: '16px',
    lineHeight: '1.5',
    margin: '20px 0',
    opacity: '0.9',
  },
};`,
        mime_type: 'application/javascript',
      },
      {
        path: 'pages/_app.js',
        content: `export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}`,
        mime_type: 'application/javascript',
      },
      {
        path: 'next.config.js',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      loaders: {
        '.svg': ['@svgr/webpack'],
      },
    },
  },
}

module.exports = nextConfig`,
        mime_type: 'application/javascript',
      },
      {
        path: 'README.md',
        content: `# Next.js Cloud Code Editor

这是一个运行在云端的 Next.js 项目，使用了以下技术：

## 特性

- ⚡ **Turbopack** - 极速开发体验
- 🔗 **Supabase** - 现代化数据库
- ☁️ **云端编辑** - 实时同步
- 🎨 **热重载** - 即时预览

## 开始使用

\`\`\`bash
# 开发模式 (使用 Turbopack)
npm run dev

# 生产构建
npm run build
npm run start
\`\`\`

## 项目结构

\`\`\`
├── pages/
│   ├── _app.js      # App 组件
│   └── index.js     # 首页
├── next.config.js   # Next.js 配置
└── package.json     # 项目依赖
\`\`\`

## 更多信息

- [Next.js 文档](https://nextjs.org/docs)
- [Turbopack 文档](https://turbo.build/pack)
- [Supabase 文档](https://supabase.com/docs)
`,
        mime_type: 'text/markdown',
      },
    ];
  }
}

// 文件管理器类
export class FileManager {
  // 获取项目文件
  static async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('path');

    if (error) {
      console.error('获取项目文件失败:', error);
      throw new Error(`获取项目文件失败: ${error.message}`);
    }

    return data || [];
  }

  // 获取单个文件
  static async getFile(projectId: string, path: string): Promise<ProjectFile | null> {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .eq('path', path)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 文件不存在
      }
      console.error('获取文件失败:', error);
      throw new Error(`获取文件失败: ${error.message}`);
    }

    return data;
  }

  // 保存文件
  static async saveFile(projectId: string, path: string, content: string): Promise<void> {
    const existingFile = await this.getFile(projectId, path);
    
    if (existingFile) {
      // 更新现有文件
      const { error } = await supabase
        .from('project_files')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', projectId)
        .eq('path', path);

      if (error) {
        console.error('更新文件失败:', error);
        throw new Error(`更新文件失败: ${error.message}`);
      }
    } else {
      // 创建新文件
      const { error } = await supabase
        .from('project_files')
        .insert([{
          project_id: projectId,
          path,
          content,
          mime_type: this.getMimeType(path),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

      if (error) {
        console.error('创建文件失败:', error);
        throw new Error(`创建文件失败: ${error.message}`);
      }
    }
  }

  // 删除文件
  static async deleteFile(projectId: string, path: string): Promise<void> {
    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('project_id', projectId)
      .eq('path', path);

    if (error) {
      console.error('删除文件失败:', error);
      throw new Error(`删除文件失败: ${error.message}`);
    }
  }

  // 根据文件路径获取MIME类型
  static getMimeType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'vue': 'text/vue',
      'py': 'text/x-python',
    };

    return mimeTypes[ext || ''] || 'text/plain';
  }
}