import { supabase, ProjectFile } from './supabase';

export class FileManager {
  // 获取项目的所有文件
  static async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .order('path');

      if (error) {
        console.error('获取项目文件失败:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('获取项目文件异常:', error);
      return [];
    }
  }

  // 获取单个文件
  static async getFile(projectId: string, path: string): Promise<ProjectFile | null> {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('project_id', projectId)
        .eq('path', path)
        .single();

      if (error) {
        console.error('获取文件失败:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('获取文件异常:', error);
      return null;
    }
  }

  // 创建或更新文件
  static async saveFile(
    projectId: string,
    path: string,
    content: string,
    mimeType?: string
  ): Promise<boolean> {
    try {
      const fileData = {
        project_id: projectId,
        path,
        content,
        size: content.length,
        mime_type: mimeType || this.getMimeType(path),
        is_binary: false,
      };

      const { error } = await supabase
        .from('project_files')
        .upsert([fileData], { onConflict: 'project_id,path' });

      if (error) {
        console.error('保存文件失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('保存文件异常:', error);
      return false;
    }
  }

  // 删除文件
  static async deleteFile(projectId: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', projectId)
        .eq('path', path);

      if (error) {
        console.error('删除文件失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('删除文件异常:', error);
      return false;
    }
  }

  // 重命名文件
  static async renameFile(
    projectId: string,
    oldPath: string,
    newPath: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('project_files')
        .update({ path: newPath })
        .eq('project_id', projectId)
        .eq('path', oldPath);

      if (error) {
        console.error('重命名文件失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('重命名文件异常:', error);
      return false;
    }
  }

  // 创建文件夹（通过创建一个占位文件）
  static async createFolder(projectId: string, folderPath: string): Promise<boolean> {
    const placeholderPath = `${folderPath}/.gitkeep`;
    return this.saveFile(projectId, placeholderPath, '', 'text/plain');
  }

  // 删除文件夹及其所有内容
  static async deleteFolder(projectId: string, folderPath: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', projectId)
        .like('path', `${folderPath}%`);

      if (error) {
        console.error('删除文件夹失败:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('删除文件夹异常:', error);
      return false;
    }
  }

  // 获取文件树结构
  static buildFileTree(files: ProjectFile[]): FileTreeNode[] {
    const tree: FileTreeNode[] = [];
    const lookup: Record<string, FileTreeNode> = {};

    // 先创建所有目录节点
    files.forEach(file => {
      const parts = file.path.split('/');
      let currentPath = '';

      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!lookup[currentPath]) {
          const isFile = index === parts.length - 1;
          const node: FileTreeNode = {
            id: currentPath,
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            content: isFile ? file.content : undefined,
            mimeType: isFile ? file.mime_type : undefined,
            size: isFile ? file.size : undefined,
            isOpen: false,
          };

          lookup[currentPath] = node;

          if (parentPath) {
            const parent = lookup[parentPath];
            if (parent && parent.children) {
              parent.children.push(node);
            }
          } else {
            tree.push(node);
          }
        }
      });
    });

    return tree;
  }

  // 根据文件扩展名获取 MIME 类型
  static getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      // JavaScript/TypeScript
      js: 'application/javascript',
      jsx: 'application/javascript',
      ts: 'text/typescript',
      tsx: 'text/typescript',
      
      // Web
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      scss: 'text/scss',
      sass: 'text/sass',
      less: 'text/less',
      
      // 配置文件
      json: 'application/json',
      xml: 'application/xml',
      yaml: 'text/yaml',
      yml: 'text/yaml',
      toml: 'text/toml',
      
      // 文档
      md: 'text/markdown',
      txt: 'text/plain',
      
      // 编程语言
      py: 'text/x-python',
      java: 'text/x-java',
      c: 'text/x-c',
      cpp: 'text/x-c++',
      cs: 'text/x-csharp',
      php: 'text/x-php',
      rb: 'text/x-ruby',
      go: 'text/x-go',
      rs: 'text/x-rust',
      
      // Vue
      vue: 'text/vue',
      
      // 其他
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
    };

    return mimeTypes[ext || ''] || 'text/plain';
  }

  // 获取文件图标
  static getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    // 特殊文件名
    const specialFiles: Record<string, string> = {
      'package.json': '📦',
      'README.md': '📖',
      'tsconfig.json': '⚙️',
      '.gitignore': '🙈',
      'Dockerfile': '🐳',
      'docker-compose.yml': '🐳',
    };

    if (specialFiles[filename]) {
      return specialFiles[filename];
    }

    // 按扩展名分类
    const iconMap: Record<string, string> = {
      // JavaScript/TypeScript
      js: '🟨',
      jsx: '⚛️',
      ts: '🔷',
      tsx: '⚛️',
      
      // Web
      html: '🌐',
      htm: '🌐',
      css: '🎨',
      scss: '🎨',
      sass: '🎨',
      
      // 配置
      json: '⚙️',
      xml: '📄',
      yaml: '⚙️',
      yml: '⚙️',
      
      // 文档
      md: '📝',
      txt: '📄',
      
      // 编程语言
      py: '🐍',
      java: '☕',
      c: '💾',
      cpp: '💾',
      php: '🐘',
      rb: '💎',
      go: '🐹',
      
      // Vue
      vue: '💚',
      
      // 图片
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️',
      svg: '🎭',
    };

    return iconMap[ext || ''] || '📄';
  }
}

// 文件树节点接口
export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  content?: string;
  mimeType?: string;
  size?: number;
  isOpen?: boolean;
}