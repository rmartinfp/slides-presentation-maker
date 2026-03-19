import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  Palette,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ColorPicker from './ColorPicker';
import FontPicker from './FontPicker';

interface Props {
  editor: Editor;
  scale: number;
}

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128, 160, 200];

export default function FormattingToolbar({ editor, scale }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside — use timeout to avoid race with dropdown clicks
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Check if click is inside toolbar or any of its dropdown portals
      const target = e.target as HTMLElement;
      if (toolbarRef.current?.contains(target)) return;
      // Don't close if clicking inside a dropdown that has our data attribute
      if (target.closest('[data-formatting-dropdown]')) return;

      setShowColorPicker(false);
      setShowFontPicker(false);
      setShowFontSize(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentColor = editor.getAttributes('textStyle').color || '#000000';
  const currentFont = editor.getAttributes('textStyle').fontFamily || '';

  const ToolButton = ({
    active,
    onClick,
    children,
    title,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title?: string;
  }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded transition-colors',
        active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100',
      )}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div
      ref={toolbarRef}
      className="absolute -top-12 left-0 z-[200] flex items-center gap-0.5 px-2 py-1 bg-white rounded-lg shadow-xl border border-slate-200"
      style={{ transform: `scale(${1 / scale})`, transformOrigin: 'bottom left' }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Font family */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFontPicker(!showFontPicker); setShowColorPicker(false); setShowFontSize(false); }}
          className="flex items-center gap-1 px-2 h-7 text-xs text-slate-700 hover:bg-slate-100 rounded max-w-[120px]"
        >
          <Type className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{currentFont || 'Default'}</span>
          <ChevronDown className="w-3 h-3 shrink-0" />
        </button>
        {showFontPicker && (
          <div className="absolute top-full left-0 mt-1">
            <FontPicker
              currentFont={currentFont}
              onSelect={(font) => {
                editor.chain().focus().setFontFamily(font).run();
                setShowFontPicker(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Font size */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFontSize(!showFontSize); setShowColorPicker(false); setShowFontPicker(false); }}
          className="flex items-center gap-0.5 px-1.5 h-7 text-xs text-slate-700 hover:bg-slate-100 rounded"
        >
          <span className="tabular-nums">
            {(() => {
              const fs = editor.getAttributes('textStyle').fontSize;
              if (fs) return String(fs).replace('px', '');
              // Fallback: read from DOM
              const { from } = editor.state.selection;
              const dom = editor.view.domAtPos(from);
              if (dom.node instanceof HTMLElement) {
                const computed = window.getComputedStyle(dom.node).fontSize;
                return computed ? parseInt(computed).toString() : '—';
              }
              return '—';
            })()}
          </span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {showFontSize && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-20 max-h-56 overflow-y-auto z-[300]" data-formatting-dropdown>
            {FONT_SIZES.map(size => (
              <button
                key={size}
                onMouseDown={(e) => {
                  e.preventDefault();
                  (editor.chain().focus() as any).setFontSize(`${size}px`).run();
                  setShowFontSize(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100"
              >
                {size}px
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Text formatting */}
      <ToolButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolButton>

      <ToolButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolButton>

      <ToolButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <Underline className="w-3.5 h-3.5" />
      </ToolButton>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Color */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker); setShowFontPicker(false); setShowFontSize(false); }}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100"
          title="Text Color"
        >
          <div className="flex flex-col items-center">
            <Palette className="w-3.5 h-3.5 text-slate-600" />
            <div className="w-4 h-1 rounded-full mt-0.5" style={{ backgroundColor: currentColor }} />
          </div>
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1">
            <ColorPicker
              color={currentColor}
              onChange={(color) => {
                editor.chain().focus().setColor(color).run();
              }}
              onClose={() => setShowColorPicker(false)}
            />
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Alignment */}
      <ToolButton
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title="Align Left"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </ToolButton>

      <ToolButton
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title="Align Center"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </ToolButton>

      <ToolButton
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title="Align Right"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </ToolButton>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Lists */}
      <ToolButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className="w-3.5 h-3.5" />
      </ToolButton>

      <ToolButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolButton>
    </div>
  );
}
