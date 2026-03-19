import React, { useCallback, useRef } from 'react';
import { useEditorStore } from '@/stores/editor-store';
import { useAssetUpload } from '@/hooks/useAssetUpload';
import { SlideBackground } from '@/types/presentation';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SOLID_PRESETS = [
  '#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0',
  '#1E293B', '#0F172A', '#000000',
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
];

const GRADIENT_PRESETS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)',
];

export default function BackgroundPanel() {
  const { presentation, activeSlideIndex, setSlideBackground } = useEditorStore();
  const slide = presentation.slides[activeSlideIndex];
  const { upload, uploading } = useAssetUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentBg = slide?.background;

  const handleSolid = useCallback((color: string) => {
    setSlideBackground({ type: 'solid', value: color });
  }, [setSlideBackground]);

  const handleGradient = useCallback((gradient: string) => {
    setSlideBackground({ type: 'gradient', value: gradient });
  }, [setSlideBackground]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result) {
      setSlideBackground({ type: 'image', value: result.url });
    }
    e.target.value = '';
  }, [upload, setSlideBackground]);

  return (
    <div className="space-y-4">
      {/* Current background preview */}
      <div className="mb-3">
        <label className="text-xs text-slate-500 mb-1 block">Current</label>
        <div
          className="w-full h-16 rounded-lg border border-slate-200"
          style={{
            backgroundColor: currentBg?.type === 'solid' ? currentBg.value : undefined,
            background: currentBg?.type === 'gradient' ? currentBg.value : undefined,
            backgroundImage: currentBg?.type === 'image' ? `url(${currentBg.value})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>

      {/* Solid colors */}
      <div>
        <label className="text-xs text-slate-500 mb-2 block">Solid</label>
        <div className="grid grid-cols-5 gap-1.5">
          {SOLID_PRESETS.map(color => (
            <button
              key={color}
              onClick={() => handleSolid(color)}
              className={`w-full aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${
                currentBg?.type === 'solid' && currentBg.value === color
                  ? 'border-indigo-500 scale-110'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        {/* Custom color */}
        <div className="mt-2 flex gap-2">
          <input
            type="color"
            value={currentBg?.type === 'solid' ? currentBg.value : '#ffffff'}
            onChange={(e) => handleSolid(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0"
          />
          <input
            type="text"
            value={currentBg?.type === 'solid' ? currentBg.value : ''}
            onChange={(e) => {
              if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                handleSolid(e.target.value);
              }
            }}
            placeholder="#FFFFFF"
            className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Gradients */}
      <div>
        <label className="text-xs text-slate-500 mb-2 block">Gradients</label>
        <div className="grid grid-cols-4 gap-1.5">
          {GRADIENT_PRESETS.map(gradient => (
            <button
              key={gradient}
              onClick={() => handleGradient(gradient)}
              className={`w-full aspect-square rounded-lg border-2 transition-transform hover:scale-110 ${
                currentBg?.type === 'gradient' && currentBg.value === gradient
                  ? 'border-indigo-500 scale-110'
                  : 'border-transparent'
              }`}
              style={{ background: gradient }}
            />
          ))}
        </div>
      </div>

      {/* Image background */}
      <div>
        <label className="text-xs text-slate-500 mb-2 block">Image</label>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Upload Background Image'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
    </div>
  );
}
