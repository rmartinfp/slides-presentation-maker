import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, X, Loader2, Eraser, Maximize, Paintbrush, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const QUICK_ACTIONS = [
  { label: 'Remove Background', icon: Eraser, mode: 'remove-bg' as const, instruction: '' },
  { label: 'Enhance', icon: Maximize, mode: undefined, instruction: 'Enhance this image: improve lighting, colors, and clarity' },
  { label: 'Make Brighter', icon: Paintbrush, mode: undefined, instruction: 'Make this image brighter and more vibrant' },
  { label: 'Blur Background', icon: Paintbrush, mode: undefined, instruction: 'Blur the background, keep the main subject sharp' },
] as const;

interface Props {
  elementId: string;
  onClose: () => void;
}

export default function ImageEditDialog({ elementId, onClose }: Props) {
  const [instruction, setInstruction] = useState('');
  const [mode, setMode] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const { updateElement, presentation, activeSlideIndex } = useEditorStore();

  const element = presentation.slides[activeSlideIndex]?.elements?.find(e => e.id === elementId);
  const imageUrl = element?.content || '';

  const handleQuickAction = (action: typeof QUICK_ACTIONS[number]) => {
    if (action.mode) {
      setMode(action.mode);
      setInstruction('');
    } else {
      setMode(undefined);
      setInstruction(action.instruction);
    }
  };

  const handleGenerate = async () => {
    if (!instruction.trim() && !mode) return;
    setLoading(true);
    setResultUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: {
          imageUrl,
          instruction: instruction.trim() || undefined,
          mode: mode || undefined,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('No image URL returned');

      setResultUrl(data.url);
    } catch (err: any) {
      console.error('Image edit error:', err);
      toast.error(err.message || 'Failed to edit image. Check your API configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!resultUrl) return;
    updateElement(elementId, { content: resultUrl });
    toast.success('Image updated!');
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <ImagePlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Edit Image with AI</h3>
              <p className="text-xs text-slate-400">Transform your image using AI</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Current image preview */}
          {imageUrl && !resultUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
              <img src={imageUrl} alt="Current" className="max-h-48 object-contain" />
            </div>
          )}

          {/* Before / After comparison */}
          {resultUrl && (
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Before / After</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                  <img src={imageUrl} alt="Original" className="max-h-48 object-contain w-full" />
                </div>
                <div className="rounded-xl overflow-hidden border border-indigo-300 bg-slate-50 flex items-center justify-center ring-2 ring-indigo-500/20">
                  <img src={resultUrl} alt="Edited" className="max-h-48 object-contain w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <p className="text-[10px] text-slate-400 text-center">Original</p>
                <p className="text-[10px] text-indigo-500 text-center font-medium">Edited</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">Editing image...</p>
              </div>
            </div>
          )}

          {/* Quick actions */}
          {!loading && (
            <div>
              <label className="text-xs text-slate-500 mb-2 block">Quick Actions</label>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const isActive = action.mode
                    ? mode === action.mode
                    : instruction === action.instruction && !mode;
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom instruction input */}
          {!loading && (
            <div className="flex gap-2">
              <input
                type="text"
                value={instruction}
                onChange={e => {
                  setInstruction(e.target.value);
                  if (mode) setMode(undefined);
                }}
                onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
                placeholder="Describe how to edit this image..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20"
                autoFocus
                disabled={loading}
              />
              <Button
                onClick={handleGenerate}
                disabled={loading || (!instruction.trim() && !mode)}
                className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white px-4 rounded-xl"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {/* Apply button */}
          {resultUrl && (
            <Button
              onClick={handleApply}
              className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white gap-2"
            >
              <ImagePlus className="w-4 h-4" /> Apply Changes
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
