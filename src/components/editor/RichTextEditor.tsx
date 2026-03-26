import React, { useEffect, useCallback, useRef, useState } from 'react';
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
  readOnly?: boolean;
}

export default function RichTextEditor({ element, scale, onBlur, readOnly = false }: Props) {
  const updateElement = useEditorStore(s => s.updateElement);
  const [shrinkScale, setShrinkScale] = useState(1);

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
          `font-size: ${(element.style.fontSize ?? 12) * 2.666}px`,
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

  const vAlign = element.style.verticalAlign;
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Auto-shrink: measure text overflow and scale down to fit
  // Runs directly in the component that owns the DOM — no external ref needed
  useEffect(() => {
    if (!wrapperRef.current) return;
    setShrinkScale(1); // reset first

    const measure = () => {
      const el = wrapperRef.current;
      if (!el) return;

      const containerHeight = el.parentElement?.clientHeight || el.clientHeight;
      const containerWidth = el.parentElement?.clientWidth || el.clientWidth;
      if (!containerHeight || !containerWidth) return;

      // Temporarily make element auto-height + block to measure natural content
      const orig = {
        height: el.style.height, width: el.style.width,
        display: el.style.display, transform: el.style.transform,
        justifyContent: el.style.justifyContent,
      };
      el.style.height = 'auto';
      el.style.width = `${containerWidth}px`;
      el.style.display = 'block';
      el.style.transform = 'none';
      el.style.justifyContent = '';

      const naturalHeight = el.scrollHeight;

      // Restore
      el.style.height = orig.height;
      el.style.width = orig.width;
      el.style.display = orig.display;
      el.style.transform = orig.transform;
      el.style.justifyContent = orig.justifyContent;

      if (naturalHeight > containerHeight + 2) {
        const ratio = containerHeight / naturalHeight;
        setShrinkScale(Math.max(0.3, Math.floor(ratio * 100) / 100));
      }
    };

    // Measure after DOM + fonts settle
    requestAnimationFrame(() => {
      measure();
      setTimeout(measure, 300);
      setTimeout(measure, 800); // extra delay for slow font loading
    });
  }, [element.content, element.style.fontSize, element.width, element.height]);

  if (!editor) return null;

  return (
    <div
      ref={wrapperRef}
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
        opacity: typeof element.style.opacity === 'number' ? element.style.opacity : 1,
      }}
    >
      {!readOnly && <FormattingToolbar editor={editor} scale={scale} anchorRef={wrapperRef} />}
      <EditorContent
        editor={editor}
        className={readOnly ? 'w-full pointer-events-none' : 'w-full cursor-text'}
        style={{
          boxSizing: 'border-box',
          ...(shrinkScale < 1 ? {
            transform: `scale(${shrinkScale})`,
            transformOrigin: vAlign === 'bottom' ? 'bottom left' : vAlign === 'center' ? 'center left' : 'top left',
            width: `${100 / shrinkScale}%`,
          } : {}),
        }}
        onBlur={readOnly ? undefined : onBlur}
      />
    </div>
  );
}
