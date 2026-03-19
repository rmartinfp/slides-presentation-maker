import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slide } from '@/types/presentation';
import { rewriteSlide } from '@/lib/ai-generate';
import { toast } from 'sonner';

interface Props {
  slide: Slide;
  presentationTitle: string;
  onUpdate: (slide: Slide) => void;
  onClose: () => void;
}

const suggestions = [
  'Make it more concise',
  'Add more detail',
  'Make it more persuasive',
  'Simplify the language',
  'Add statistics or data',
  'Make it more formal',
];

export default function AIRewriteDialog({ slide, presentationTitle, onUpdate, onClose }: Props) {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRewrite = async (text?: string) => {
    const cmd = text || instruction;
    if (!cmd.trim()) return;

    setLoading(true);
    try {
      const updated = await rewriteSlide(
        slide,
        cmd,
        presentationTitle
      );
      onUpdate(updated as Slide);
      toast.success('Slide rewritten!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to rewrite slide');
    } finally {
      setLoading(false);
    }
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">AI Rewrite</h3>
              <p className="text-xs text-slate-400">Editing: {slide.title || 'Untitled slide'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Suggestions */}
        <div className="px-6 pt-4">
          <p className="text-xs text-slate-400 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => handleRewrite(s)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleRewrite()}
              placeholder="Tell AI what to change..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
              disabled={loading}
            />
            <Button
              onClick={() => handleRewrite()}
              disabled={loading || !instruction.trim()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
