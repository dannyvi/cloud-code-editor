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
  theme = 'custom-light',
  height = '100%',
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof import('monaco-editor')
  ) => {
    editorRef.current = editor;
    
    // 定义自定义浅色主题，背景与界面一致
    monaco.editor.defineTheme('custom-light', {
      base: 'vs',
      inherit: true,
      rules: [
        {
          token: 'comment',
          foreground: '6b7280',
          fontStyle: 'italic'
        },
        {
          token: 'keyword',
          foreground: 'a855f7', // 更浅的紫色，Y2K风格
          fontStyle: 'bold'
        },
        {
          token: 'string',
          foreground: 'f472b6' // 更浅的粉色，梦幻感
        },
        {
          token: 'number',
          foreground: '22d3ee' // 更亮的青色
        },
        {
          token: 'type',
          foreground: 'c084fc' // 淡紫色
        },
        {
          token: 'function',
          foreground: '38bdf8' // 浅蓝色
        },
        {
          token: 'variable',
          foreground: '374151'
        }
      ],
      colors: {
        'editor.background': '#ffffff', // 白色背景与界面一致
        'editor.foreground': '#374151', // 深灰色文字
        'editor.lineHighlightBackground': '#fef7ff', // 非常浅的粉紫色行高亮
        'editor.selectionBackground': '#fae8ff', // 非常浅的粉紫色选中背景，确保可读性
        'editor.inactiveSelectionBackground': '#f3e8ff',
        'editorCursor.foreground': '#a855f7', // 梦幻紫色光标
        'editorLineNumber.foreground': '#9ca3af', // 浅灰色行号
        'editorLineNumber.activeForeground': '#a855f7', // Y2K紫色活动行号
        'editorIndentGuide.background': '#fae8ff',
        'editorIndentGuide.activeBackground': '#e879f9',
        'editorWhitespace.foreground': '#f3e8ff',
        'editorRuler.foreground': '#f3e8ff',
        'editorGutter.background': '#ffffff',
        'scrollbarSlider.background': '#fae8ff', // 浅紫色滚动条
        'scrollbarSlider.hoverBackground': '#e879f9', // 悬停时的梦幻紫色
        'scrollbarSlider.activeBackground': '#c084fc', // 激活时的Y2K紫色
        'editorWidget.background': '#ffffff',
        'editorSuggestWidget.background': '#ffffff',
        'editorSuggestWidget.border': '#e879f9',
        'editorSuggestWidget.selectedBackground': '#fae8ff',
        'editorHoverWidget.background': '#ffffff',
        'editorHoverWidget.border': '#c084fc'
      }
    });
    
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