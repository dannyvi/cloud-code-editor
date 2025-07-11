import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// 数据库类型定义
export interface Project {
  id: string;
  name: string;
  description?: string;
  template: 'react' | 'vue' | 'vanilla-js' | 'node' | 'python' | 'next';
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  is_public: boolean;
  owner_id?: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  path: string; // 'src/index.js', 'package.json' etc.
  content: string;
  size: number;
  mime_type: string;
  is_binary: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  files: {
    path: string;
    content: string;
    mime_type: string;
  }[];
  dependencies?: Record<string, string>;
  dev_dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

// 项目管理类
export class ProjectManager {
  // 创建新项目
  static async createProject(data: {
    name: string;
    description?: string;
    template: Project['template'];
  }): Promise<Project | null> {
    try {
      const projectData = {
        ...data,
        updated_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        is_public: false,
        owner_id: null, // For development without auth
      };

      const { data: project, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) {
        console.error('创建项目失败:', error);
        return null;
      }

      // 根据模板创建默认文件
      await this.initializeProjectFiles(project.id, data.template);

      return project;
    } catch (error) {
      console.error('创建项目异常:', error);
      return null;
    }
  }

  // 获取所有项目
  static async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('last_accessed_at', { ascending: false });

      if (error) {
        console.error('获取项目列表失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取项目列表异常:', error);
      return [];
    }
  }

  // 获取单个项目
  static async getProject(id: string): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('获取项目失败:', error);
        return null;
      }

      // 更新最后访问时间
      await this.updateLastAccessed(id);

      return data;
    } catch (error) {
      console.error('获取项目异常:', error);
      return null;
    }
  }

  // 更新项目
  static async updateProject(id: string, updates: Partial<Project>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('更新项目失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('更新项目异常:', error);
      return false;
    }
  }

  // 删除项目
  static async deleteProject(id: string): Promise<boolean> {
    try {
      // 先删除项目文件
      await supabase.from('project_files').delete().eq('project_id', id);

      // 再删除项目
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('删除项目失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('删除项目异常:', error);
      return false;
    }
  }

  // 更新最后访问时间
  static async updateLastAccessed(id: string): Promise<void> {
    try {
      await supabase
        .from('projects')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('id', id);
    } catch (error) {
      console.error('更新访问时间失败:', error);
    }
  }

  // 根据模板初始化项目文件
  static async initializeProjectFiles(projectId: string, template: Project['template']): Promise<void> {
    const templateFiles = this.getTemplateFiles(template);
    
    const filesToInsert = templateFiles.map(file => ({
      project_id: projectId,
      path: file.path,
      content: file.content,
      size: file.content.length,
      mime_type: file.mime_type,
      is_binary: false,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('project_files').insert(filesToInsert);
  }

  // 获取模板文件
  static getTemplateFiles(template: Project['template']): Array<{
    path: string;
    content: string;
    mime_type: string;
  }> {
    const templates = {
      'vanilla-js': [
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vanilla JS App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <h1>🚀 Hello World!</h1>
        <p>欢迎使用 Cloud Code Editor</p>
        <button id="clickBtn">点击我</button>
        <p id="counter">点击次数: 0</p>
    </div>
    <script src="script.js"></script>
</body>
</html>`,
          mime_type: 'text/html',
        },
        {
          path: 'style.css',
          content: `body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    margin: 0;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

#app {
    background: white;
    border-radius: 12px;
    padding: 40px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    text-align: center;
    max-width: 500px;
}

h1 {
    color: #333;
    margin-bottom: 20px;
}

button {
    background: #667eea;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    margin: 20px 0;
    transition: background 0.2s;
}

button:hover {
    background: #5a6fd8;
}

#counter {
    color: #666;
    font-size: 18px;
    font-weight: bold;
}`,
          mime_type: 'text/css',
        },
        {
          path: 'script.js',
          content: `// 🎉 Welcome to Cloud Code Editor!
let clickCount = 0;

const button = document.getElementById('clickBtn');
const counter = document.getElementById('counter');

button.addEventListener('click', () => {
    clickCount++;
    counter.textContent = \`点击次数: \${clickCount}\`;
    
    // 添加一些有趣的效果
    if (clickCount === 5) {
        document.body.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
    } else if (clickCount === 10) {
        document.body.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        alert('🎉 恭喜！你已经点击了10次！');
    }
});

console.log('🚀 Cloud Code Editor 已加载');
console.log('试试修改代码，保存后查看实时效果！');`,
          mime_type: 'application/javascript',
        },
      ],
      'react': [
        {
          path: 'package.json',
          content: JSON.stringify({
            "name": "react-app",
            "version": "1.0.0",
            "private": true,
            "dependencies": {
              "react": "^18.2.0",
              "react-dom": "^18.2.0"
            },
            "scripts": {
              "start": "react-scripts start",
              "build": "react-scripts build"
            }
          }, null, 2),
          mime_type: 'application/json',
        },
        {
          path: 'public/index.html',
          content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>`,
          mime_type: 'text/html',
        },
        {
          path: 'src/index.js',
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`,
          mime_type: 'application/javascript',
        },
        {
          path: 'src/App.js',
          content: `import React, { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 React + Cloud Code Editor</h1>
        <p>欢迎使用我们的在线代码编辑器！</p>
        <div className="counter">
          <button onClick={() => setCount(count - 1)}>-</button>
          <span>计数: {count}</span>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
        <p>
          修改代码并保存，查看实时效果！
        </p>
      </header>
    </div>
  );
}

export default App;`,
          mime_type: 'application/javascript',
        },
        {
          path: 'src/App.css',
          content: `.App {
  text-align: center;
}

.App-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.counter {
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 20px;
}

.counter button {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.3s;
}

.counter button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.counter span {
  font-size: 24px;
  font-weight: bold;
  min-width: 120px;
}`,
          mime_type: 'text/css',
        },
      ],
      'vue': [
        {
          path: 'package.json',
          content: JSON.stringify({
            "name": "vue-app",
            "version": "1.0.0",
            "dependencies": {
              "vue": "^3.3.0"
            },
            "scripts": {
              "dev": "vite",
              "build": "vite build"
            }
          }, null, 2),
          mime_type: 'application/json',
        },
        {
          path: 'index.html',
          content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue App</title>
</head>
<body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
</body>
</html>`,
          mime_type: 'text/html',
        },
        {
          path: 'src/main.js',
          content: `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`,
          mime_type: 'application/javascript',
        },
        {
          path: 'src/App.vue',
          content: `<template>
  <div class="app">
    <h1>🚀 Vue + Cloud Code Editor</h1>
    <p>欢迎使用我们的在线代码编辑器！</p>
    <div class="counter">
      <button @click="count--">-</button>
      <span>计数: {{ count }}</span>
      <button @click="count++">+</button>
    </div>
    <p>修改代码并保存，查看实时效果！</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<style scoped>
.app {
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40px;
  color: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.counter {
  margin: 20px 0;
  display: flex;
  align-items: center;
  gap: 20px;
}

.counter button {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.3s;
}

.counter button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.counter span {
  font-size: 24px;
  font-weight: bold;
  min-width: 120px;
}
</style>`,
          mime_type: 'text/vue',
        },
      ],
      'node': [
        {
          path: 'package.json',
          content: JSON.stringify({
            "name": "node-app",
            "version": "1.0.0",
            "main": "index.js",
            "scripts": {
              "start": "node index.js",
              "dev": "nodemon index.js"
            },
            "dependencies": {
              "express": "^4.18.0"
            }
          }, null, 2),
          mime_type: 'application/json',
        },
        {
          path: 'index.js',
          content: `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 路由
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Welcome to Cloud Code Editor!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello from Node.js API!',
    data: {
      framework: 'Express.js',
      version: '1.0.0'
    }
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(\`🚀 服务器运行在 http://localhost:\${port}\`);
  console.log('修改代码并保存，查看实时效果！');
});`,
          mime_type: 'application/javascript',
        },
      ],
      'next': [
        {
          path: 'package.json',
          content: JSON.stringify({
            "name": "nextjs-app",
            "version": "1.0.0",
            "scripts": {
              "dev": "next dev",
              "build": "next build",
              "start": "next start"
            },
            "dependencies": {
              "next": "14.0.0",
              "react": "^18.2.0",
              "react-dom": "^18.2.0"
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
      <h1>🚀 Next.js + Cloud Code Editor</h1>
      <p>欢迎使用我们的在线代码编辑器！</p>
      <div style={styles.counter}>
        <button onClick={() => setCount(count - 1)}>-</button>
        <span>计数: {count}</span>
        <button onClick={() => setCount(count + 1)}>+</button>
      </div>
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
  },
  counter: {
    margin: '20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  }
};`,
          mime_type: 'application/javascript',
        },
      ],
      'python': [
        {
          path: 'app.py',
          content: `from flask import Flask, jsonify, render_template_string
from datetime import datetime

app = Flask(__name__)

# HTML 模板
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Python Flask App</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Python Flask + Cloud Code Editor</h1>
        <p>欢迎使用我们的在线代码编辑器！</p>
        <p>当前时间: {{ current_time }}</p>
        <p>修改代码并保存，查看实时效果！</p>
    </div>
</body>
</html>
'''

@app.route('/')
def home():
    return render_template_string(HTML_TEMPLATE, 
                                current_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

@app.route('/api/hello')
def api_hello():
    return jsonify({
        'message': 'Hello from Python Flask!',
        'status': 'success',
        'timestamp': datetime.now().isoformat(),
        'framework': 'Flask'
    })

if __name__ == '__main__':
    print('🚀 Flask 服务器启动中...')
    print('修改代码并保存，查看实时效果！')
    app.run(debug=True, host='0.0.0.0', port=5000)`,
          mime_type: 'text/x-python',
        },
        {
          path: 'requirements.txt',
          content: `Flask==2.3.0
Werkzeug==2.3.0`,
          mime_type: 'text/plain',
        },
      ],
    };

    return templates[template] || templates['vanilla-js'];
  }
}