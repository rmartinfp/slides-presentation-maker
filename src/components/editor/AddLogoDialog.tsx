import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { useAssetUpload } from '@/hooks/useAssetUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CORNERS: { id: Corner; label: string; x: number; y: number }[] = [
  { id: 'top-left', label: 'Top Left', x: 48, y: 40 },
  { id: 'top-right', label: 'Top Right', x: 1920 - 48 - 120, y: 40 },
  { id: 'bottom-left', label: 'Bottom Left', x: 48, y: 1080 - 40 - 60 },
  { id: 'bottom-right', label: 'Bottom Right', x: 1920 - 48 - 120, y: 1080 - 40 - 60 },
];

export default function AddLogoDialog({ onClose }: Props) {
  const [logoUrl, setLogoUrl] = useState('');
  const [corner, setCorner] = useState<Corner>('bottom-right');
  const [applyTo, setApplyTo] = useState<'all' | 'current'>('all');
  const [size, setSize] = useState(120); // width in px
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadAsset } = useAssetUpload();

  const { presentation, addElement, activeSlideIndex } = useEditorStore();

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadAsset(file);
      if (result) setLogoUrl(result.url);
    } catch {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleApply = () => {
    if (!logoUrl) { toast.error('Upload a logo first'); return; }

    const pos = CORNERS.find(c => c.id === corner)!;
    // Adjust x position based on size (for right corners)
    const x = corner.includes('right') ? 1920 - 48 - size : 48;
    const y = pos.y;
    const height = Math.round(size * 0.5); // assume ~2:1 aspect ratio

    const slideIndices = applyTo === 'all'
      ? presentation.slides.map((_, i) => i)
      : [activeSlideIndex];

    let count = 0;
    for (const idx of slideIndices) {
      // Check if slide already has a logo element
      const slide = presentation.slides[idx];
      const hasLogo = slide.elements.some(e =>
        e.type === 'image' && e.content === logoUrl && e.width <= 200
      );
      if (hasLogo) continue;

      useEditorStore.setState(state => {
        const newElement = {
          id: crypto.randomUUID(),
          type: 'image' as const,
          content: logoUrl,
          x, y,
          width: size,
          height,
          rotation: 0,
          opacity: 1,
          locked: true, // Lock so it doesn't get accidentally moved
          visible: true,
          zIndex: 100, // On top of everything
          style: { objectFit: 'contain' as const, borderRadius: 0 },
        };
        state.presentation.slides[idx].elements.push(newElement);
      });
      count++;
    }

    toast.success(`Logo added to ${count} slide${count !== 1 ? 's' : ''}`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Image className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Add Logo</h3>
              <p className="text-xs text-slate-400">Place your logo on slides</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Upload */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Logo</label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />

            {logoUrl ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} className="text-xs">
                  Change
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#4F46E5] hover:bg-slate-50 transition-all text-center"
              >
                {uploading ? (
                  <span className="text-sm text-slate-500">Uploading...</span>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    <span className="text-sm text-slate-500">Upload your logo</span>
                    <span className="text-xs text-slate-400 block mt-0.5">PNG, SVG, JPG</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Corner picker */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Position</label>
            <div className="grid grid-cols-2 gap-2">
              {CORNERS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCorner(c.id)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-xs font-medium transition-all border',
                    corner === c.id
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Size: {size}px</label>
            <input
              type="range" min="40" max="250" step="10"
              value={size}
              onChange={e => setSize(parseInt(e.target.value))}
              className="w-full accent-[#4F46E5]"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Small</span><span>Large</span>
            </div>
          </div>

          {/* Apply to */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Apply to</label>
            <div className="flex gap-2">
              <button
                onClick={() => setApplyTo('all')}
                className={cn(
                  'flex-1 py-2 rounded-xl text-xs font-medium transition-all border',
                  applyTo === 'all'
                    ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                )}
              >
                All slides ({presentation.slides.length})
              </button>
              <button
                onClick={() => setApplyTo('current')}
                className={cn(
                  'flex-1 py-2 rounded-xl text-xs font-medium transition-all border',
                  applyTo === 'current'
                    ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                )}
              >
                Current slide only
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200">
          <Button
            onClick={handleApply}
            disabled={!logoUrl}
            className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white rounded-xl disabled:opacity-40"
          >
            Add Logo
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
