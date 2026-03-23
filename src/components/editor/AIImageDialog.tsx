import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, X, Loader2, Send, Replace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const ASPECT_RATIOS = [
  { label: '16:9', size: '1792x1024', w: 1200, h: 672 },
  { label: '1:1', size: '1024x1024', w: 600, h: 600 },
  { label: '9:16', size: '1024x1792', w: 400, h: 712 },
  { label: '4:3', size: '1024x1024', w: 800, h: 600 },
] as const;

interface Props {
  onClose: () => void;
  /** If provided, the generated image replaces this element instead of creating new */
  replaceElementId?: string;
}

export default function AIImageDialog({ onClose, replaceElementId }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState(0); // index into ASPECT_RATIOS
  const { addElement, updateElement } = useEditorStore();

  const ratio = ASPECT_RATIOS[selectedRatio];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt.trim(),
          size: ratio.size,
          quality: 'standard',
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('No image URL returned');

      setPreview(data.url);
    } catch (err: any) {
      console.error('AI Image error:', err);
      toast.error(err.message || 'Failed to generate image. Check your API configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!preview) return;

    if (replaceElementId) {
      // Replace existing image — keep position and size
      updateElement(replaceElementId, { content: preview });
      toast.success('Image replaced!');
    } else {
      // Create new image element
      addElement({
        type: 'image',
        content: preview,
        x: 360,
        y: 200,
        width: ratio.w,
        height: ratio.h,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        style: { objectFit: 'cover', borderRadius: 12 },
      });
      toast.success('Image added to slide!');
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
              <ImagePlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">
                {replaceElementId ? 'Recreate Image with AI' : 'AI Image Generator'}
              </h3>
              <p className="text-xs text-slate-400">
                {replaceElementId ? 'Describe the new image to replace the current one' : 'Describe the image you need'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Aspect ratio selector — only for new images */}
          {!replaceElementId && (
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Aspect Ratio</label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((ar, i) => (
                  <button
                    key={ar.label}
                    onClick={() => setSelectedRatio(i)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      i === selectedRatio
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src={preview} alt="AI Generated" className="w-full object-cover" style={{ aspectRatio: ratio.label === '1:1' ? '1' : ratio.label === '9:16' ? '9/16' : ratio.label === '4:3' ? '4/3' : '16/9' }} />
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">Generating image...</p>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
              placeholder="A modern infographic about growth metrics..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
              disabled={loading}
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-4 rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {/* Insert/Replace button */}
          {preview && (
            <Button
              onClick={handleInsert}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
            >
              {replaceElementId ? (
                <><Replace className="w-4 h-4" /> Replace Image</>
              ) : (
                'Insert into Slide'
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
