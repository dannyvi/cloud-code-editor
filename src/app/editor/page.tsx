'use client';

import { useState } from 'react';
import { CodeEditor } from '@/components/CodeEditor';
import { FileExplorer } from '@/components/FileExplorer';
import { PreviewFrame } from '@/components/PreviewFrame';
import { Button } from '@/components/ui/button';
import { Play, Save, Settings } from 'lucide-react';

export default function EditorPage() {
  const [currentFile, setCurrentFile] = useState<string>('index.js');
  const [code, setCode] = useState<string>('// Welcome to Cloud Code Editor\nconsole.log("Hello World!");');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(true);

  const handleFileSelect = (filename: string) => {
    setCurrentFile(filename);
    // TODO: Load file content from API
  };

  const handleCodeChange = (newCode: string | undefined) => {
    if (newCode !== undefined) {
      setCode(newCode);
      // TODO: Sync with backend
    }
  };

  const handleSave = () => {
    // TODO: Save to backend
    console.log('Saving file:', currentFile);
  };

  const handleRun = () => {
    // TODO: Run code in container
    console.log('Running code...');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold">Cloud Code Editor</h1>
          <span className="text-sm text-muted-foreground">
            {currentFile}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSave} size="sm" variant="outline">
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
          <Button onClick={handleRun} size="sm">
            <Play className="h-4 w-4 mr-2" />
            运行
          </Button>
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* File Explorer */}
        <div className="w-64 border-r bg-muted/10">
          <FileExplorer onFileSelect={handleFileSelect} />
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <CodeEditor
            value={code}
            onChange={handleCodeChange}
            language="javascript"
            theme="vs-dark"
          />
        </div>

        {/* Preview Panel */}
        {isPreviewOpen && (
          <div className="w-1/2 border-l bg-background">
            <div className="h-full flex flex-col">
              <div className="border-b px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">预览</span>
                <Button 
                  onClick={() => setIsPreviewOpen(false)}
                  size="sm" 
                  variant="outline"
                >
                  隐藏
                </Button>
              </div>
              <PreviewFrame />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}