'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  File, 
  Folder, 
  FolderOpen, 
  Plus, 
  FileText, 
  Code, 
  Image,
  MoreHorizontal,
  Trash2,
  Edit
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileTreeNode, FileManager } from '@/lib/file-manager';

interface FileExplorerProps {
  fileTree: FileTreeNode[];
  onFileSelect: (filename: string) => void;
  currentFile?: string;
  projectId: string;
  onFileCreated?: () => void; // 回调函数，用于刷新文件树
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <Code className="h-4 w-4 text-yellow-500" />;
    case 'html':
    case 'css':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'json':
      return <FileText className="h-4 w-4 text-green-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <Image className="h-4 w-4 text-purple-500" />;
    default:
      return <File className="h-4 w-4 text-gray-500" />;
  }
};

export function FileExplorer({ fileTree, onFileSelect, currentFile, projectId, onFileCreated }: FileExplorerProps) {
  const [files, setFiles] = useState<FileTreeNode[]>(fileTree);
  const [newItemName, setNewItemName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    setFiles(fileTree);
  }, [fileTree]);

  const toggleFolder = (path: string) => {
    const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setFiles(prev => updateNode(prev));
  };

  const handleFileClick = (file: FileTreeNode) => {
    if (file.type === 'file') {
      onFileSelect(file.path);
    } else {
      toggleFolder(file.path);
    }
  };

  const createNewFile = async () => {
    if (!newItemName.trim() || creating) return;
    
    setCreating(true);
    try {
      // 调用后端API创建文件
      const success = await FileManager.saveFile(
        projectId,
        newItemName,
        '', // 空内容
        FileManager.getMimeType(newItemName)
      );
      
      if (success) {
        // 创建成功后重置状态
        setNewItemName('');
        setIsCreating(false);
        // 通知父组件刷新文件树
        if (onFileCreated) {
          onFileCreated();
        }
        console.log('文件创建成功:', newItemName);
      } else {
        console.error('文件创建失败:', newItemName);
      }
    } catch (error) {
      console.error('文件创建异常:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteFile = async (path: string) => {
    try {
      // 调用后端API删除文件
      const success = await FileManager.deleteFile(projectId, path);
      
      if (success) {
        // 删除成功后通知父组件刷新文件树
        if (onFileCreated) {
          onFileCreated();
        }
        console.log('文件删除成功:', path);
      } else {
        console.error('文件删除失败:', path);
      }
    } catch (error) {
      console.error('文件删除异常:', error);
    }
  };

  const renderFileItem = (file: FileTreeNode, depth: number = 0) => {
    return (
      <div key={file.id} className="select-none">
        <div
          className={`flex items-center px-2 py-1 rounded-sm cursor-pointer hover:bg-accent group ${
            currentFile === file.path ? 'bg-accent' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFileClick(file)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {file.type === 'folder' ? (
              file.isOpen ? (
                <FolderOpen className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
              ) : (
                <Folder className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
              )
            ) : (
              <div className="mr-2 flex-shrink-0">
                {getFileIcon(file.name)}
              </div>
            )}
            <span className="text-sm truncate">{file.name}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                重命名
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file.path);
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {file.type === 'folder' && file.isOpen && file.children && (
          <div>
            {file.children.map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full border-0 rounded-none">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">文件浏览器</h3>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        {isCreating && (
          <div className="mt-2 space-y-2">
            <Input
              placeholder="输入文件名"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  createNewFile();
                }
              }}
              className="h-7 text-xs"
              autoFocus
            />
            <div className="flex space-x-1">
              <Button
                onClick={createNewFile}
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={creating || !newItemName.trim()}
              >
                {creating ? '创建中...' : '创建'}
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(false);
                  setNewItemName('');
                }}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
              >
                取消
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-2 space-y-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            暂无文件
          </div>
        ) : (
          files.map(file => renderFileItem(file))
        )}
      </div>
    </Card>
  );
}