import React from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { SlideElement } from '@/types/presentation';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  RotateCw, Move, Maximize2, Eye, Palette, Type,
  Lock, Unlock, Trash2, Copy, ArrowUpToLine, ArrowDownToLine,
  BoxSelect, ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PropertiesPanel() {
  const {
    presentation, activeSlideIndex, selectedElementIds,
    updateElement, deleteElements, duplicateElements,
    lockElement, bringToFront, sendToBack, setSlideBackground,
  } = useEditorStore();

  const slide = presentation.slides[activeSlideIndex];
  const selected = slide?.elements?.filter(e => selectedElementIds.includes(e.id)) ?? [];
  const el = selected.length === 1 ? selected[0] : null;

  if (!el) {
    return (
      <div className="w-56 bg-white/60 backdrop-blur-xl border-l border-slate-200/60 p-4 overflow-y-auto">
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
          {el.type === 'text' ? 'Text' : el.type === 'image' ? 'Image' : 'Shape'}
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
                  <p className="text-xs text-slate-700">{el.style.fontSize}px</p>
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

        {/* Shape-specific */}
        {el.type === 'shape' && (
          <Section icon={<Palette className="w-3 h-3" />} title="Fill & Stroke">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 mb-1.5 block">Fill Color</label>
                <div className="grid grid-cols-6 gap-1">
                  {['transparent', '#FFFFFF', '#000000', '#EF4444', '#22C55E', '#3B82F6',
                    '#8B5CF6', '#F97316', '#EC4899', '#14B8A6', '#6366F1', '#F43F5E',
                  ].map(c => (
                    <button
                      key={c}
                      onClick={() => updateStyle({ shapeFill: c })}
                      className={cn(
                        'w-full aspect-square rounded border transition-transform hover:scale-110',
                        el.style.shapeFill === c ? 'border-indigo-500 scale-110' : 'border-slate-200',
                        c === 'transparent' && 'bg-[repeating-conic-gradient(#ccc_0%_25%,#eee_0%_50%)] bg-[length:8px_8px]'
                      )}
                      style={c !== 'transparent' ? { backgroundColor: c } : undefined}
                    />
                  ))}
                </div>
              </div>
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
