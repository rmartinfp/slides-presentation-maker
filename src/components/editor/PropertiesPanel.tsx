import React, { useState, useMemo } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { SlideElement, TableData } from '@/types/presentation';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  RotateCw, Move, Maximize2, Eye, Palette, Type,
  Lock, Unlock, Trash2, Copy, ArrowUpToLine, ArrowDownToLine,
  BoxSelect, ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(180deg, #1F1F1Fa5 0%, #FFFFFF00 100%)',
  'linear-gradient(180deg, #00000080 0%, #00000000 100%)',
];

export default function PropertiesPanel() {
  const {
    presentation, activeSlideIndex, selectedElementIds,
    updateElement, deleteElements, duplicateElements,
    lockElement, bringToFront, sendToBack, setSlideBackground,
    groupElements, ungroupElements, alignElements, distributeElements,
  } = useEditorStore();

  const slide = presentation.slides[activeSlideIndex];
  const selected = slide?.elements?.filter(e => selectedElementIds.includes(e.id)) ?? [];
  const el = selected.length === 1 ? selected[0] : null;

  // Multi-select: show align/distribute/group controls
  if (selected.length >= 2) {
    const hasGroup = selected.some(e => e.groupId);
    const allSameGroup = hasGroup && new Set(selected.map(e => e.groupId).filter(Boolean)).size === 1;
    return (
      <div className="w-64 bg-white/60 backdrop-blur-xl border-l border-slate-200/60 p-4 overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{selected.length} Selected</h3>

        <Section icon={<Move className="w-3 h-3" />} title="Align">
          <div className="grid grid-cols-3 gap-1">
            {([
              { label: '⫷ Left', v: 'left' as const },
              { label: '⫿ Center', v: 'center' as const },
              { label: '⫸ Right', v: 'right' as const },
              { label: '⊤ Top', v: 'top' as const },
              { label: '⊟ Middle', v: 'middle' as const },
              { label: '⊥ Bottom', v: 'bottom' as const },
            ]).map(a => (
              <button key={a.v} onClick={() => alignElements(a.v)}
                className="py-1.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                {a.label}
              </button>
            ))}
          </div>
        </Section>

        {selected.length >= 3 && (
          <Section icon={<Maximize2 className="w-3 h-3" />} title="Distribute">
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => distributeElements('horizontal')}
                className="py-1.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                ↔ Horizontal
              </button>
              <button onClick={() => distributeElements('vertical')}
                className="py-1.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                ↕ Vertical
              </button>
            </div>
          </Section>
        )}

        <div className="flex gap-1 pt-3 border-t border-slate-200/60">
          {!allSameGroup ? (
            <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px] text-slate-500 hover:text-indigo-600 gap-1" onClick={groupElements}>
              Group
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px] text-slate-500 hover:text-indigo-600 gap-1" onClick={ungroupElements}>
              Ungroup
            </Button>
          )}
          <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px] text-slate-500 hover:text-indigo-600 gap-1" onClick={() => duplicateElements()}>
            <Copy className="w-3 h-3" /> Duplicate
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px] text-red-500 hover:text-red-600 gap-1" onClick={() => deleteElements()}>
            <Trash2 className="w-3 h-3" /> Delete
          </Button>
        </div>
      </div>
    );
  }

  if (!el) {
    return (
      <div className="w-64 bg-white/60 backdrop-blur-xl border-l border-slate-200/60 p-4 overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Slide</h3>
        <p className="text-[11px] text-slate-500">{slide?.elements?.length || 0} elements</p>
        <p className="text-[10px] text-slate-400 mt-1">Select an element to edit</p>
      </div>
    );
  }

  // Element properties
  const updateStyle = (updates: Record<string, any>) => {
    updateElement(el.id, { style: { ...el.style, ...updates } });
  };

  return (
    <div className="w-64 bg-white/60 backdrop-blur-xl border-l border-slate-200/60 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {el.type === 'text' ? 'Text' : el.type === 'image' ? 'Image' : el.type === 'table' ? 'Table' : 'Shape'}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900" onClick={() => duplicateElements()}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-600" onClick={() => deleteElements()}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Position */}
        <Section icon={<Move className="w-3 h-3" />} title="Position">
          <div className="grid grid-cols-2 gap-2">
            <PropInput label="X" value={Math.round(el.x)} onChange={v => updateElement(el.id, { x: v })} />
            <PropInput label="Y" value={Math.round(el.y)} onChange={v => updateElement(el.id, { y: v })} />
          </div>
        </Section>

        {/* Size */}
        <Section icon={<Maximize2 className="w-3 h-3" />} title="Size">
          <div className="grid grid-cols-2 gap-2">
            <PropInput label="W" value={Math.round(el.width)} onChange={v => updateElement(el.id, { width: v })} />
            <PropInput label="H" value={Math.round(el.height)} onChange={v => updateElement(el.id, { height: v })} />
          </div>
        </Section>

        {/* Rotation */}
        <Section icon={<RotateCw className="w-3 h-3" />} title="Rotation">
          <div className="flex items-center gap-2">
            <Slider
              value={[el.rotation]}
              onValueChange={([v]) => updateElement(el.id, { rotation: v })}
              min={0} max={360} step={1}
              className="flex-1"
            />
            <span className="text-[11px] text-slate-500 w-10 text-right tabular-nums">{el.rotation}°</span>
          </div>
        </Section>

        {/* Opacity */}
        <Section icon={<Eye className="w-3 h-3" />} title="Opacity">
          <div className="flex items-center gap-2">
            <Slider
              value={[el.opacity * 100]}
              onValueChange={([v]) => updateElement(el.id, { opacity: v / 100 })}
              min={0} max={100} step={1}
              className="flex-1"
            />
            <span className="text-[11px] text-slate-500 w-10 text-right tabular-nums">{Math.round(el.opacity * 100)}%</span>
          </div>
        </Section>

        {/* Text-specific */}
        {el.type === 'text' && (
          <Section icon={<Type className="w-3 h-3" />} title="Text">
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Font</label>
                <p className="text-xs text-slate-700 truncate">{el.style.fontFamily || 'Default'}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Size</label>
                  <p className="text-xs text-slate-700">{el.style.fontSize}pt</p>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Color</label>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded border border-slate-200" style={{ backgroundColor: el.style.color || '#fff' }} />
                    <p className="text-[10px] text-slate-500">{el.style.color}</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Shape-specific — Fill (Solid / Gradient) + Stroke */}
        {el.type === 'shape' && (
          <ShapeFillSection key={el.id} el={el} updateStyle={updateStyle} />
        )}

        {/* Line-specific — dash style, width, endpoints */}
        {el.type === 'shape' && el.style.shapeType === 'line' && (
          <Section icon={<Palette className="w-3 h-3" />} title="Line Style">
            <div className="space-y-3">
              {/* Dash pattern */}
              <div>
                <label className="text-[10px] text-slate-500 mb-1.5 block">Style</label>
                <div className="grid grid-cols-4 gap-1">
                  {([
                    { label: 'Solid', value: '' },
                    { label: 'Dash', value: '8 4' },
                    { label: 'Dot', value: '2 4' },
                    { label: 'Dash·Dot', value: '8 4 2 4' },
                  ] as const).map(d => (
                    <button
                      key={d.label}
                      onClick={() => updateStyle({ shapeStrokeDash: d.value || undefined })}
                      className={cn(
                        'py-1 rounded text-[10px] font-medium transition-colors',
                        (el.style.shapeStrokeDash || '') === d.value ? 'bg-[#4F46E5] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line width */}
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Width</label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[el.style.shapeStrokeWidth ?? 2]}
                    onValueChange={([v]) => updateStyle({ shapeStrokeWidth: v })}
                    min={1} max={12} step={1}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-slate-500 w-6 text-right tabular-nums">{el.style.shapeStrokeWidth ?? 2}px</span>
                </div>
              </div>

              {/* Head endpoint */}
              <div>
                <label className="text-[10px] text-slate-500 mb-1.5 block">Start</label>
                <div className="grid grid-cols-5 gap-1">
                  {([
                    { label: 'None', value: 'none' },
                    { label: '→', value: 'arrow' },
                    { label: '●', value: 'oval' },
                    { label: '◆', value: 'diamond' },
                    { label: '▸', value: 'stealth' },
                  ] as const).map(m => (
                    <button
                      key={m.value}
                      onClick={() => updateStyle({ lineHeadEnd: m.value === 'none' ? undefined : m.value })}
                      className={cn(
                        'py-1 rounded text-[10px] font-medium transition-colors',
                        (el.style.lineHeadEnd || 'none') === m.value ? 'bg-[#4F46E5] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tail endpoint */}
              <div>
                <label className="text-[10px] text-slate-500 mb-1.5 block">End</label>
                <div className="grid grid-cols-5 gap-1">
                  {([
                    { label: 'None', value: 'none' },
                    { label: '→', value: 'arrow' },
                    { label: '●', value: 'oval' },
                    { label: '◆', value: 'diamond' },
                    { label: '▸', value: 'stealth' },
                  ] as const).map(m => (
                    <button
                      key={m.value}
                      onClick={() => updateStyle({ lineTailEnd: m.value === 'none' ? undefined : m.value })}
                      className={cn(
                        'py-1 rounded text-[10px] font-medium transition-colors',
                        (el.style.lineTailEnd || 'none') === m.value ? 'bg-[#4F46E5] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Image-specific */}
        {el.type === 'image' && (
          <Section icon={<Palette className="w-3 h-3" />} title="Image">
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Fit</label>
                <div className="flex gap-1">
                  {['cover', 'contain', 'fill'].map(fit => (
                    <button
                      key={fit}
                      onClick={() => updateStyle({ objectFit: fit })}
                      className={cn(
                        'flex-1 py-1 rounded text-[10px] font-medium transition-colors',
                        el.style.objectFit === fit ? 'bg-[#4F46E5] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'
                      )}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Border Radius</label>
                <Slider
                  value={[el.style.borderRadius ?? 0]}
                  onValueChange={([v]) => updateStyle({ borderRadius: v })}
                  min={0} max={50} step={1}
                />
              </div>
            </div>
          </Section>
        )}

        {/* Image Filters */}
        {el.type === 'image' && (
          <Section icon={<ImageIcon className="w-3 h-3" />} title="Filter">
            <div className="grid grid-cols-3 gap-1">
              {([
                { label: 'None', value: '' },
                { label: 'Gray', value: 'grayscale(100%)' },
                { label: 'Sepia', value: 'sepia(100%)' },
                { label: 'Blur', value: 'blur(2px)' },
                { label: 'Bright', value: 'brightness(1.3)' },
                { label: 'Contrast', value: 'contrast(1.4)' },
              ] as const).map(preset => (
                <button
                  key={preset.label}
                  onClick={() => updateStyle({ filter: preset.value })}
                  className={cn(
                    'py-1 rounded text-[10px] font-medium transition-colors',
                    (el.style.filter || '') === preset.value ? 'bg-[#4F46E5] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Table properties */}
        {el.type === 'table' && (
          <Section icon={<Palette className="w-3 h-3" />} title="Table">
            <TablePropsSection el={el} updateElement={updateElement} />
          </Section>
        )}

        {/* Shadow — for shapes and images */}
        {(el.type === 'shape' || el.type === 'image') && (
          <Section icon={<BoxSelect className="w-3 h-3" />} title="Shadow">
            <div className="grid grid-cols-2 gap-1">
              {([
                { label: 'None', value: '' },
                { label: 'Small', value: '0 2px 8px rgba(0,0,0,0.25)' },
                { label: 'Medium', value: '0 4px 16px rgba(0,0,0,0.35)' },
                { label: 'Large', value: '0 8px 32px rgba(0,0,0,0.45)' },
              ] as const).map(preset => (
                <button
                  key={preset.label}
                  onClick={() => updateStyle({ boxShadow: preset.value })}
                  className={cn(
                    'py-1 rounded text-[10px] font-medium transition-colors',
                    (el.style.boxShadow || '') === preset.value ? 'bg-[#4F46E5] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Layer controls */}
        <div className="flex gap-1 pt-3 border-t border-slate-200/60">
          <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px] text-slate-500 hover:text-slate-900 gap-1" onClick={() => bringToFront(el.id)}>
            <ArrowUpToLine className="w-3 h-3" /> Front
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px] text-slate-500 hover:text-slate-900 gap-1" onClick={() => sendToBack(el.id)}>
            <ArrowDownToLine className="w-3 h-3" /> Back
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px] text-slate-500 hover:text-slate-900 gap-1"
            onClick={() => lockElement(el.id, !el.locked)}>
            {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {el.locked ? 'Locked' : 'Lock'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-slate-500">{icon}</span>
        <span className="text-[11px] font-medium text-slate-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

function TablePropsSection({ el, updateElement }: { el: SlideElement; updateElement: (id: string, u: Partial<SlideElement>) => void }) {
  let td: TableData;
  try { td = JSON.parse(el.content); } catch { td = { rows: [[{ text: '' }]] }; }
  const save = (newTd: TableData) => updateElement(el.id, { content: JSON.stringify(newTd) });
  const updateStyle = (updates: Record<string, any>) => updateElement(el.id, { style: { ...el.style, ...updates } });

  const addRow = () => {
    const cols = td.rows[0]?.length || 3;
    save({ ...td, rows: [...td.rows, Array.from({ length: cols }, () => ({ text: '' }))] });
  };
  const removeRow = () => {
    if (td.rows.length <= 1) return;
    save({ ...td, rows: td.rows.slice(0, -1) });
  };
  const addCol = () => {
    save({ ...td, rows: td.rows.map(r => [...r, { text: '' }]) });
  };
  const removeCol = () => {
    if ((td.rows[0]?.length || 0) <= 1) return;
    save({ ...td, rows: td.rows.map(r => r.slice(0, -1)) });
  };

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-slate-500">{td.rows.length} rows × {td.rows[0]?.length || 0} cols — double-click cells to edit</div>
      <div className="grid grid-cols-2 gap-1">
        <button onClick={addRow} className="py-1 rounded text-[10px] font-medium bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600">+ Row</button>
        <button onClick={removeRow} className="py-1 rounded text-[10px] font-medium bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600">− Row</button>
        <button onClick={addCol} className="py-1 rounded text-[10px] font-medium bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600">+ Column</button>
        <button onClick={removeCol} className="py-1 rounded text-[10px] font-medium bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600">− Column</button>
      </div>
      <label className="flex items-center gap-2 text-[10px] text-slate-600 cursor-pointer">
        <input type="checkbox" checked={td.headerRow ?? false} onChange={(e) => save({ ...td, headerRow: e.target.checked })} className="rounded border-slate-300" />
        Header row (bold + bg)
      </label>

      {/* Font size */}
      <div>
        <label className="text-[10px] text-slate-500 mb-1 block">Font Size</label>
        <div className="flex items-center gap-2">
          <Slider value={[el.style.fontSize ?? 14]} onValueChange={([v]) => updateStyle({ fontSize: v })} min={8} max={48} step={1} className="flex-1" />
          <span className="text-[10px] text-slate-500 w-8 text-right tabular-nums">{el.style.fontSize ?? 14}px</span>
        </div>
      </div>

      {/* Border radius */}
      <div>
        <label className="text-[10px] text-slate-500 mb-1 block">Corner Radius</label>
        <Slider value={[el.style.borderRadius ?? 8]} onValueChange={([v]) => updateStyle({ borderRadius: v })} min={0} max={24} step={2} />
      </div>

      {/* Border color */}
      <div>
        <label className="text-[10px] text-slate-500 mb-1.5 block">Border Color</label>
        <div className="flex gap-2">
          <input type="color" value={td.borderColor || '#e2e8f0'} onChange={(e) => save({ ...td, borderColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
          <input type="text" value={td.borderColor || '#e2e8f0'} onChange={(e) => { if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) save({ ...td, borderColor: e.target.value }); }} placeholder="#e2e8f0" className="flex-1 px-2 py-1 text-[10px] rounded border border-slate-200 focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      {/* Header bg color */}
      <div>
        <label className="text-[10px] text-slate-500 mb-1.5 block">Header Background</label>
        <div className="flex gap-1.5 flex-wrap">
          <div className="grid grid-cols-6 gap-1 flex-1">
            {['#f1f5f9', '#e0e7ff', '#fce7f3', '#d1fae5', '#fef3c7', '#1e293b'].map(c => (
              <button key={c} onClick={() => {
                const newRows = td.rows.map((row, ri) => ri === 0 ? row.map(cell => ({ ...cell, bg: c })) : row);
                save({ ...td, rows: newRows });
              }} className="w-full aspect-square rounded border border-slate-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
            ))}
          </div>
          <input type="color" value={td.rows[0]?.[0]?.bg || '#f1f5f9'}
            onChange={(e) => { const newRows = td.rows.map((row, ri) => ri === 0 ? row.map(cell => ({ ...cell, bg: e.target.value })) : row); save({ ...td, rows: newRows }); }}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0" />
        </div>
      </div>

      {/* Body bg color */}
      <div>
        <label className="text-[10px] text-slate-500 mb-1.5 block">Body Background</label>
        <div className="flex gap-1.5 flex-wrap">
          <div className="grid grid-cols-6 gap-1 flex-1">
            {['transparent', '#ffffff', '#f8fafc', '#f1f5f9', '#fefce8', '#0f172a'].map(c => (
              <button key={c} onClick={() => {
                const newRows = td.rows.map((row, ri) => ri > 0 || !td.headerRow ? row.map(cell => ({ ...cell, bg: c === 'transparent' ? undefined : c })) : row);
                save({ ...td, rows: newRows });
              }} className={cn('w-full aspect-square rounded border border-slate-200 hover:scale-110 transition-transform', c === 'transparent' && 'bg-[repeating-conic-gradient(#ccc_0%_25%,#eee_0%_50%)] bg-[length:8px_8px]')} style={c !== 'transparent' ? { backgroundColor: c } : undefined} />
            ))}
          </div>
          <input type="color" value={td.rows[1]?.[0]?.bg || '#ffffff'}
            onChange={(e) => { const newRows = td.rows.map((row, ri) => ri > 0 || !td.headerRow ? row.map(cell => ({ ...cell, bg: e.target.value })) : row); save({ ...td, rows: newRows }); }}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0" />
        </div>
      </div>
    </div>
  );
}

/** Parse a CSS linear-gradient into { angle, color1, color2 } */
function parseGradient(grad: string): { angle: number; color1: string; color2: string } | null {
  const m = grad.match(/linear-gradient\((\d+)deg,\s*(#[A-Fa-f0-9]+)\s+\d+%,\s*(#[A-Fa-f0-9]+)\s+\d+%\)/);
  if (!m) return null;
  return { angle: parseInt(m[1]), color1: m[2].slice(0, 7), color2: m[3].slice(0, 7) };
}

function ShapeFillSection({ el, updateStyle }: { el: SlideElement; updateStyle: (u: Record<string, any>) => void }) {
  const hasGradient = !!el.style.shapeGradient;
  const [mode, setMode] = useState<'solid' | 'gradient'>(hasGradient ? 'gradient' : 'solid');

  // Parse current gradient for the custom editor
  const parsed = useMemo(() => {
    if (el.style.shapeGradient) return parseGradient(el.style.shapeGradient as string);
    return null;
  }, [el.style.shapeGradient]);

  const [gradColor1, setGradColor1] = useState(parsed?.color1 || '#667eea');
  const [gradColor2, setGradColor2] = useState(parsed?.color2 || '#764ba2');
  const [gradAngle, setGradAngle] = useState(parsed?.angle || 135);

  const applyCustomGradient = (c1: string, c2: string, angle: number) => {
    const grad = `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;
    updateStyle({ shapeGradient: grad, shapeFill: undefined });
  };

  const switchToSolid = () => {
    setMode('solid');
    updateStyle({ shapeGradient: undefined });
  };

  const switchToGradient = () => {
    setMode('gradient');
    applyCustomGradient(gradColor1, gradColor2, gradAngle);
  };

  return (
    <Section icon={<Palette className="w-3 h-3" />} title="Fill & Stroke">
      <div className="space-y-3">
        {/* Solid / Gradient toggle */}
        <div className="flex rounded-md overflow-hidden border border-slate-200">
          <button
            onClick={switchToSolid}
            className={cn(
              'flex-1 py-1 text-[10px] font-medium transition-colors',
              mode === 'solid' ? 'bg-[#4F46E5] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'
            )}
          >
            Solid
          </button>
          <button
            onClick={switchToGradient}
            className={cn(
              'flex-1 py-1 text-[10px] font-medium transition-colors',
              mode === 'gradient' ? 'bg-[#4F46E5] text-white' : 'bg-slate-50 text-slate-500 hover:text-slate-900'
            )}
          >
            Gradient
          </button>
        </div>

        {mode === 'solid' ? (
          <div>
            <label className="text-[10px] text-slate-500 mb-1.5 block">Fill Color</label>
            <div className="grid grid-cols-6 gap-1">
              {['transparent', '#FFFFFF', '#000000', '#EF4444', '#22C55E', '#3B82F6',
                '#8B5CF6', '#F97316', '#EC4899', '#14B8A6', '#6366F1', '#F43F5E',
              ].map(c => (
                <button
                  key={c}
                  onClick={() => updateStyle({ shapeFill: c, shapeGradient: undefined })}
                  className={cn(
                    'w-full aspect-square rounded border transition-transform hover:scale-110',
                    !hasGradient && el.style.shapeFill === c ? 'border-indigo-500 scale-110' : 'border-slate-200',
                    c === 'transparent' && 'bg-[repeating-conic-gradient(#ccc_0%_25%,#eee_0%_50%)] bg-[length:8px_8px]'
                  )}
                  style={c !== 'transparent' ? { backgroundColor: c } : undefined}
                />
              ))}
            </div>
            {/* Custom color picker */}
            <div className="mt-2 flex gap-2">
              <input
                type="color"
                value={el.style.shapeFill || '#6366F1'}
                onChange={(e) => updateStyle({ shapeFill: e.target.value, shapeGradient: undefined })}
                className="w-7 h-7 rounded cursor-pointer border-0 p-0"
              />
              <input
                type="text"
                value={el.style.shapeFill || ''}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    updateStyle({ shapeFill: e.target.value, shapeGradient: undefined });
                  }
                }}
                placeholder="#FFFFFF"
                className="flex-1 px-2 py-1 text-[10px] rounded border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Gradient preview */}
            <div
              className="w-full h-8 rounded-md border border-slate-200"
              style={{ background: el.style.shapeGradient as string || `linear-gradient(${gradAngle}deg, ${gradColor1} 0%, ${gradColor2} 100%)` }}
            />

            {/* Gradient presets */}
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Presets</label>
              <div className="grid grid-cols-4 gap-1">
                {GRADIENT_PRESETS.map(g => (
                  <button
                    key={g}
                    onClick={() => {
                      updateStyle({ shapeGradient: g, shapeFill: undefined });
                      const p = parseGradient(g);
                      if (p) { setGradColor1(p.color1); setGradColor2(p.color2); setGradAngle(p.angle); }
                    }}
                    className={cn(
                      'w-full aspect-square rounded border-2 transition-transform hover:scale-110',
                      el.style.shapeGradient === g ? 'border-indigo-500 scale-110' : 'border-transparent'
                    )}
                    style={{ background: g }}
                  />
                ))}
              </div>
            </div>

            {/* Custom gradient editor */}
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Custom</label>
              <div className="flex gap-1.5 items-center">
                <input
                  type="color"
                  value={gradColor1}
                  onChange={(e) => { setGradColor1(e.target.value); applyCustomGradient(e.target.value, gradColor2, gradAngle); }}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-[10px] text-slate-400">→</span>
                <input
                  type="color"
                  value={gradColor2}
                  onChange={(e) => { setGradColor2(e.target.value); applyCustomGradient(gradColor1, e.target.value, gradAngle); }}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="number"
                  min={0} max={360} step={15}
                  value={gradAngle}
                  onChange={(e) => { const a = parseInt(e.target.value) || 0; setGradAngle(a); applyCustomGradient(gradColor1, gradColor2, a); }}
                  className="w-12 h-7 px-1 text-[10px] text-center bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 tabular-nums"
                />
                <span className="text-[10px] text-slate-400">°</span>
              </div>
            </div>
          </div>
        )}

        {/* Stroke */}
        <div>
          <label className="text-[10px] text-slate-500 mb-1.5 block">Stroke</label>
          <div className="grid grid-cols-6 gap-1">
            {['transparent', '#FFFFFF', '#000000', '#EF4444', '#22C55E', '#3B82F6'].map(c => (
              <button
                key={c}
                onClick={() => updateStyle({ shapeStroke: c, shapeStrokeWidth: c === 'transparent' ? 0 : 2 })}
                className={cn(
                  'w-full aspect-square rounded border transition-transform hover:scale-110',
                  el.style.shapeStroke === c ? 'border-indigo-500 scale-110' : 'border-slate-200',
                  c === 'transparent' && 'bg-[repeating-conic-gradient(#ccc_0%_25%,#eee_0%_50%)] bg-[length:8px_8px]'
                )}
                style={c !== 'transparent' ? { backgroundColor: c } : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function PropInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 mb-0.5 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-full h-7 px-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:outline-none focus:border-[#4F46E5] tabular-nums"
      />
    </div>
  );
}
