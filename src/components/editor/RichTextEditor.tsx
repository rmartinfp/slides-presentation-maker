import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { FontSize } from '@/lib/tiptap-font-size';
import { SlideElement } from '@/types/presentation';
import { useEditorStore } from '@/stores/editor-store';
import FormattingToolbar from './FormattingToolbar';

interface Props {
  element: SlideElement;
  scale: number;
  shrinkScale?: number;
  onBlur: () => void;
  readOnly?: boolean;
}

export default function RichTextEditor({ element, scale, shrinkScale = 1, onBlur, readOnly = false }: Props) {
  const updateElement = useEditorStore(s => s.updateElement);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Underline,
      TextAlign.configure({
        types: ['paragraph'],
      }),
    ],
    content: element.content.startsWith('{') || element.content.startsWith('<')
      ? element.content
      : `<p>${element.content.replace(/\n/g, '</p><p>')}</p>`,
    editorProps: {
      attributes: {
        class: 'outline-none w-full h-full',
        style: [
          `font-family: ${element.style.fontFamily ? `${element.style.fontFamily}, sans-serif` : 'sans-serif'}`,
          `font-size: ${(element.style.fontSize ?? 12) * 2.666 * shrinkScale}px`,
          `color: ${element.style.color || '#000000'}`,
          `font-weight: ${element.style.fontWeight || 'normal'}`,
          `font-style: ${element.style.fontStyle || 'normal'}`,
          `text-align: ${element.style.textAlign || 'left'}`,
          `line-height: ${element.style.lineHeight || 1.4}`,
          element.style.letterSpacing ? `letter-spacing: ${element.style.letterSpacing}px` : '',
        ].filter(Boolean).join('; '),
      },
    },
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (readOnly) return;
      const html = editor.getHTML();
      updateElement(element.id, { content: html });
    },
    autofocus: readOnly ? false : 'end',
  });

  // Stop propagation of keyboard events so they don't trigger canvas shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Allow undo/redo to bubble
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'y')) return;
    e.stopPropagation();
  }, []);

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, []);

  if (!editor) return null;

  // Match EXACT same styles as the static text view in CanvasElement
  // to prevent text jumping when entering/exiting edit mode
  const vAlign = element.style.verticalAlign;

  return (
    <div
      className="w-full h-full relative"
      onKeyDown={readOnly ? undefined : handleKeyDown}
      style={{
        padding: 8,
        boxSizing: 'border-box',
        display: vAlign ? 'flex' : undefined,
        flexDirection: vAlign ? 'column' as any : undefined,
        justifyContent: vAlign === 'center' ? 'center' : vAlign === 'bottom' ? 'flex-end' : undefined,
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        pointerEvents: readOnly ? 'none' : undefined,
        opacity: typeof element.style.opacity === 'number' ? element.style.opacity : 1,
      }}
    >
      {!readOnly && <FormattingToolbar editor={editor} scale={scale} />}
      <EditorContent
        editor={editor}
        className={readOnly ? 'w-full pointer-events-none' : 'w-full cursor-text'}
        style={{ boxSizing: 'border-box' }}
        onBlur={readOnly ? undefined : onBlur}
      />
    </div>
  );
}
