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
  onBlur: () => void;
}

export default function RichTextEditor({ element, scale, onBlur }: Props) {
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
          `font-size: ${(element.style.fontSize || 24) * 2.666}px`,
          `color: ${element.style.color || '#000000'}`,
          `font-weight: ${element.style.fontWeight || 'normal'}`,
          `font-style: ${element.style.fontStyle || 'normal'}`,
          `text-align: ${element.style.textAlign || 'left'}`,
          `line-height: ${element.style.lineHeight || 1.4}`,
        ].join('; '),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      updateElement(element.id, { content: html });
    },
    autofocus: 'end',
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

  return (
    <div
      className="w-full h-full relative"
      onKeyDown={handleKeyDown}
    >
      <FormattingToolbar editor={editor} scale={scale} />
      <EditorContent
        editor={editor}
        className="w-full h-full overflow-hidden cursor-text"
        style={{ padding: 8 }}
        onBlur={onBlur}
      />
    </div>
  );
}
