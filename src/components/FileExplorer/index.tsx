'use client';

import { useState } from 'react';
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

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
  isOpen?: boolean;
  language?: string;
}

interface FileExplorerProps {
  onFileSelect: (filename: string) => void;
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

export function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'src',
      type: 'folder',
      isOpen: true,
      children: [
        { id: '2', name: 'index.js', type: 'file', language: 'javascript' },
        { id: '3', name: 'app.js', type: 'file', language: 'javascript' },
        { id: '4', name: 'style.css', type: 'file', language: 'css' },
      ],
    },
    {
      id: '5',
      name: 'public',
      type: 'folder',
      isOpen: false,
      children: [
        { id: '6', name: 'index.html', type: 'file', language: 'html' },
      ],
    },
    { id: '7', name: 'package.json', type: 'file', language: 'json' },
    { id: '8', name: 'README.md', type: 'file', language: 'markdown' },
  ]);

  const [selectedFile, setSelectedFile] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const toggleFolder = (id: string) => {
    setFiles(prev => 
      prev.map(file => 
        file.id === id ? { ...file, isOpen: !file.isOpen } : file
      )
    );
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file') {
      setSelectedFile(file.name);
      onFileSelect(file.name);
    } else {
      toggleFolder(file.id);
    }
  };

  const createNewFile = () => {
    if (newItemName.trim()) {
      const newFile: FileItem = {
        id: Date.now().toString(),
        name: newItemName,
        type: 'file',
        language: 'javascript',
      };
      setFiles(prev => [...prev, newFile]);
      setNewItemName('');
      setIsCreating(false);
    }
  };

  const deleteFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const renderFileItem = (file: FileItem, depth: number = 0) => {
    return (
      <div key={file.id} className="select-none">
        <div
          className={`flex items-center px-2 py-1 rounded-sm cursor-pointer hover:bg-accent group ${
            selectedFile === file.name ? 'bg-accent' : ''
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
                  deleteFile(file.id);
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
              >
                创建
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
        {files.map(file => renderFileItem(file))}
      </div>
    </Card>
  );
}