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
    content: element.content.startsWith('<')
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

  // Sync editor styles when element.style changes (e.g., PropertiesPanel font/size/color changes)
  useEffect(() => {
    if (!editor) return;
    const s = element.style;
    const style = [
      `font-family: ${s.fontFamily ? `${s.fontFamily}, sans-serif` : 'sans-serif'}`,
      `font-size: ${(s.fontSize ?? 12) * 2.666}px`,
      `color: ${s.color || '#000000'}`,
      `font-weight: ${s.fontWeight || 'normal'}`,
      `font-style: ${s.fontStyle || 'normal'}`,
      `text-align: ${s.textAlign || 'left'}`,
      `line-height: ${s.lineHeight || 1.4}`,
      s.letterSpacing ? `letter-spacing: ${s.letterSpacing}px` : '',
    ].filter(Boolean).join('; ');
    editor.setOptions({
      editorProps: {
        attributes: {
          class: 'outline-none w-full h-full',
          style,
        },
      },
    });
  }, [editor, element.style.fontSize, element.style.fontFamily, element.style.color, element.style.fontWeight, element.style.fontStyle, element.style.textAlign, element.style.lineHeight, element.style.letterSpacing]);

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

  // Auto-shrink: measure text overflow and scale down to fit.
  // Uses a hidden clone to measure natural height without disrupting visible layout.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !editor) return;
    setShrinkScale(1);

    const measure = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      // The container height is the element's actual height (set on parent via inline style)
      const parent = wrapper.parentElement;
      if (!parent) return;
      const containerHeight = parent.clientHeight;
      const containerWidth = parent.clientWidth;
      if (!containerHeight || !containerWidth) return;

      // Find the actual Tiptap prose content element
      const prose = wrapper.querySelector('.tiptap, .ProseMirror');
      if (!prose) return;

      // Create an off-screen clone to measure natural height
      const clone = prose.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.height = 'auto';
      clone.style.width = `${containerWidth - 16}px`; // 8px padding on each side
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);
      const naturalHeight = clone.scrollHeight + 16; // +16 for padding
      document.body.removeChild(clone);

      if (naturalHeight > containerHeight + 2) {
        const ratio = containerHeight / naturalHeight;
        const newScale = Math.max(0.3, Math.floor(ratio * 100) / 100);
        setShrinkScale(newScale);
      } else {
        setShrinkScale(1);
      }
    };

    // Measure after DOM + fonts settle — multiple passes for font loading
    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 400);
    const t3 = setTimeout(measure, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [element.content, element.style.fontSize, element.width, element.height, editor]);

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
