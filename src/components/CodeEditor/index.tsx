'use client';

import { Editor } from '@monaco-editor/react';
import { useRef } from 'react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language: string;
  theme?: string;
  height?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language,
  theme = 'vs-dark',
  height = '100%',
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof import('monaco-editor')
  ) => {
    editorRef.current = editor;
    
    // 配置编辑器选项
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: true },
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
      readOnly,
    });

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // TODO: 触发保存
      console.log('保存快捷键');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // TODO: 触发运行
      console.log('运行快捷键');
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value);
  };

  return (
    <div className="h-full w-full">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly,
          cursorStyle: 'line',
          automaticLayout: true,
          glyphMargin: true,
          lineNumbers: 'on',
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'always',
          unfoldOnClickAfterEndOfLine: false,
          contextmenu: true,
          mouseWheelZoom: true,
          multiCursorModifier: 'alt',
          accessibilitySupport: 'auto',
          find: {
            autoFindInSelection: 'never',
            seedSearchStringFromSelection: 'always',
          },
          hover: {
            delay: 100,
          },
          parameterHints: {
            enabled: true,
          },
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
          snippetSuggestions: 'top',
          wordBasedSuggestions: 'allDocuments',
          suggest: {
            showWords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}