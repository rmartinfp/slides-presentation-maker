import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Palette, ChevronDown, Minus, Plus, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ColorPicker from './ColorPicker';

interface Props {
  editor: Editor;
  scale: number;
  anchorRef?: React.RefObject<HTMLDivElement | null>;
}

// Font sizes in POINTS (same as Google Slides / PowerPoint)
const FONT_SIZES_PT = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 42, 48, 54, 60, 72, 96];
const PT_TO_PX = 2.666; // 1920px canvas / (10in × 72pt/in)

export default function FormattingToolbar({ editor, scale, anchorRef }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (toolbarRef.current?.contains(target)) return;
      if (target.closest('[data-formatting-dropdown]')) return;
      setShowColorPicker(false);
      setShowFontSize(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentColor = editor.getAttributes('textStyle').color || '#000000';

  // Get current font size in POINTS (convert from px if needed)
  const getCurrentFontSizePt = (): string => {
    const fs = editor.getAttributes('textStyle').fontSize;
    if (fs) {
      const px = parseInt(String(fs).replace('px', ''));
      return Math.round(px / PT_TO_PX).toString();
    }
    try {
      const { from } = editor.state.selection;
      const dom = editor.view.domAtPos(from);
      const el = dom.node instanceof HTMLElement ? dom.node : dom.node.parentElement;
      if (el) {
        const px = parseInt(window.getComputedStyle(el).fontSize);
        return Math.round(px / PT_TO_PX).toString();
      }
    } catch {}
    return '—';
  };

  const currentSizePt = getCurrentFontSizePt();
  const currentSizePtNum = parseInt(currentSizePt) || 24;

  // Set font size: input is in pt, stored as px (pt × 2.666)
  const setFontSize = (pt: number) => {
    const px = Math.round(pt * PT_TO_PX);
    (editor.chain().focus() as any).setFontSize(`${px}px`).run();
  };

  const adjustSize = (delta: number) => {
    const idx = FONT_SIZES_PT.findIndex(s => s >= currentSizePtNum);
    const newIdx = Math.max(0, Math.min(FONT_SIZES_PT.length - 1, idx + delta));
    setFontSize(FONT_SIZES_PT[newIdx]);
  };

  const Btn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
        active ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  );

  // Position toolbar near the element using anchorRef
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });
  useEffect(() => {
    const updatePos = () => {
      const anchor = anchorRef?.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const toolbarH = 48;
      const showBelow = rect.top < toolbarH + 60;
      setPos({
        top: showBelow ? rect.bottom + 4 : rect.top - toolbarH - 4,
        left: Math.max(8, rect.left),
        ready: true,
      });
    };
    updatePos();
    const interval = setInterval(updatePos, 150);
    return () => clearInterval(interval);
  }, [anchorRef]);

  if (!pos.ready) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-[9999] flex items-center gap-0.5 px-2 py-1.5 bg-white rounded-xl shadow-2xl border border-slate-200"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Font size with +/- */}
      <div className="relative flex items-center">
        <button
          onMouseDown={(e) => { e.preventDefault(); adjustSize(-1); }}
          className="w-7 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-l-md"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowFontSize(!showFontSize); setShowColorPicker(false); }}
          className="h-8 px-2 text-xs font-bold text-slate-800 hover:bg-slate-100 border-x border-slate-200 min-w-[40px] text-center tabular-nums"
        >
          {currentSizePt}
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); adjustSize(1); }}
          className="w-7 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-r-md"
        >
          <Plus className="w-3 h-3" />
        </button>
        {showFontSize && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 w-20 max-h-60 overflow-y-auto z-[300]" data-formatting-dropdown>
            {FONT_SIZES_PT.map(size => (
              <button
                key={size}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFontSize(size);
                  setShowFontSize(false);
                }}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-100 transition-colors',
                  currentSizePtNum === size ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700',
                )}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-0.5" />

      {/* Bold / Italic / Underline */}
      <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="w-4 h-4" />
      </Btn>
      <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="w-4 h-4" />
      </Btn>
      <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
        <Underline className="w-4 h-4" />
      </Btn>

      <div className="w-px h-6 bg-slate-200 mx-0.5" />

      {/* Color */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker); setShowFontSize(false); }}
          className="w-8 h-8 flex flex-col items-center justify-center rounded-md hover:bg-slate-100"
          title="Text Color"
        >
          <Palette className="w-4 h-4 text-slate-600" />
          <div className="w-5 h-1 rounded-full mt-0.5" style={{ backgroundColor: currentColor }} />
        </button>
        {showColorPicker && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2">
            <ColorPicker
              color={currentColor}
              onChange={(color) => editor.chain().focus().setColor(color).run()}
              onClose={() => setShowColorPicker(false)}
            />
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-0.5" />

      {/* Alignment */}
      <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
        <AlignLeft className="w-4 h-4" />
      </Btn>
      <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
        <AlignCenter className="w-4 h-4" />
      </Btn>
      <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
        <AlignRight className="w-4 h-4" />
      </Btn>

      <div className="w-px h-6 bg-slate-200 mx-0.5" />

      {/* Lists */}
      <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
        <List className="w-4 h-4" />
      </Btn>
      <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
        <ListOrdered className="w-4 h-4" />
      </Btn>

      <div className="w-px h-6 bg-slate-200 mx-0.5" />

      {/* AI Rewrite */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent('slideai-rewrite-text'));
        }}
        title="Rewrite with AI"
        className="flex items-center gap-1 px-2 h-8 rounded-md text-[#4F46E5] hover:bg-indigo-50 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium">Rewrite</span>
      </button>
    </div>,
    document.body,
  );
}
