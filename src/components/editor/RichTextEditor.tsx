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

function buildStyleString(s: SlideElement['style']) {
  return [
    `font-family: ${s.fontFamily ? `${s.fontFamily}, sans-serif` : 'sans-serif'}`,
    `font-size: ${(s.fontSize ?? 12) * 2.666}px`,
    `color: ${s.color || '#000000'}`,
    `font-weight: ${s.fontWeight || 'normal'}`,
    `font-style: ${s.fontStyle || 'normal'}`,
    `text-align: ${s.textAlign || 'left'}`,
    `line-height: ${s.lineHeight || 1.4}`,
    s.letterSpacing ? `letter-spacing: ${s.letterSpacing}px` : '',
  ].filter(Boolean).join('; ');
}

function toHtml(content: string): string {
  if (content.startsWith('<')) return content;
  // Wrap plain text (including {{placeholders}}) in <p> tags
  return `<p>${content.replace(/\n/g, '</p><p>')}</p>`;
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
    content: toHtml(element.content),
    editorProps: {
      attributes: {
        class: 'outline-none w-full h-full',
        style: buildStyleString(element.style),
      },
    },
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      if (readOnly) return;
      const html = ed.getHTML();
      updateElement(element.id, { content: html });
    },
    autofocus: readOnly ? false : 'end',
  });

  // CRITICAL: Sync editable state when readOnly prop changes.
  // Tiptap's useEditor does NOT update editable after initial creation.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
    if (!readOnly) {
      // Focus and place cursor at end when entering edit mode
      setTimeout(() => editor.commands.focus('end'), 50);
    }
  }, [editor, readOnly]);

  // Sync editor wrapper styles when element.style changes from PropertiesPanel
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          class: 'outline-none w-full h-full',
          style: buildStyleString(element.style),
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
  // Disabled during editing so user sees real size while typing.
  useEffect(() => {
    if (!readOnly) { setShrinkScale(1); return; }
    const wrapper = wrapperRef.current;
    if (!wrapper || !editor) return;
    setShrinkScale(1);

    const measure = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const parent = wrapper.parentElement;
      if (!parent) return;
      const containerHeight = parent.clientHeight;
      const containerWidth = parent.clientWidth;
      if (!containerHeight || !containerWidth) return;

      const prose = wrapper.querySelector('.tiptap, .ProseMirror');
      if (!prose) return;

      const clone = prose.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.visibility = 'hidden';
      clone.style.height = 'auto';
      clone.style.width = `${containerWidth - 16}px`;
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);
      const naturalHeight = clone.scrollHeight + 16;
      document.body.removeChild(clone);

      if (naturalHeight > containerHeight + 2) {
        const ratio = containerHeight / naturalHeight;
        const newScale = Math.max(0.3, Math.floor(ratio * 100) / 100);
        setShrinkScale(newScale);
      } else {
        setShrinkScale(1);
      }
    };

    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 400);
    const t3 = setTimeout(measure, 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [element.content, element.style.fontSize, element.width, element.height, editor, readOnly]);

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
        className={readOnly ? 'w-full pointer-events-none' : 'w-full pointer-events-auto cursor-text'}
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
