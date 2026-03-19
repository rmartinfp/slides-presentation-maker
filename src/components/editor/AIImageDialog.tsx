import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

export default function AIImageDialog({ onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const addElement = useEditorStore(s => s.addElement);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setPreview(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt: prompt.trim(),
          size: '1792x1024',
          quality: 'standard',
        },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setPreview(data.url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!preview) return;
    addElement({
      type: 'image',
      content: preview,
      x: 360,
      y: 200,
      width: 1200,
      height: 672,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: {
        objectFit: 'cover',
        borderRadius: 12,
      },
    });
    toast.success('Image added to slide!');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
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
              <h3 className="font-semibold text-slate-800">AI Image Generator</h3>
              <p className="text-xs text-slate-400">Describe the image you need</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Preview */}
          {preview && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src={preview} alt="AI Generated" className="w-full aspect-video object-cover" />
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

          {/* Insert button */}
          {preview && (
            <Button
              onClick={handleInsert}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            >
              Insert into Slide
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
