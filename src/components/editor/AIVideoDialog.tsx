import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ASPECT_RATIOS = [
  { label: '16:9', ratio: '16:9', w: 800, h: 450 },
  { label: '9:16', ratio: '9:16', w: 400, h: 712 },
  { label: '1:1', ratio: '1:1', w: 600, h: 600 },
  { label: '4:3', ratio: '4:3', w: 800, h: 600 },
  { label: '3:4', ratio: '3:4', w: 500, h: 667 },
] as const;

interface Props {
  onClose: () => void;
}

type Status = 'idle' | 'generating' | 'polling' | 'done' | 'error';

export default function AIVideoDialog({ onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedRatio, setSelectedRatio] = useState(0);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addElement } = useEditorStore();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus('generating');
    setPreview(null);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { action: 'generate', prompt: prompt.trim(), aspectRatio: ASPECT_RATIOS[selectedRatio].ratio },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.operationName) throw new Error('No operation returned');

      setStatus('polling');
      startPolling(data.operationName);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to start video generation');
    }
  };

  const startPolling = (operationName: string) => {
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-video', {
          body: { action: 'poll', operationName },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        if (data?.status === 'completed' && data?.url) {
          setPreview(data.url);
          setStatus('done');
          return;
        }

        // Still processing — poll again in 5s
        pollRef.current = setTimeout(() => poll(), 5000);
      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Polling failed');
      }
    };
    poll();
  };

  const handleInsert = () => {
    if (!preview) return;
    addElement({
      type: 'video',
      content: preview,
      x: 300,
      y: 200,
      width: ASPECT_RATIOS[selectedRatio].w,
      height: ASPECT_RATIOS[selectedRatio].h,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: { objectFit: 'cover', borderRadius: 16 },
    });
    toast.success('Video added to slide!');
    onClose();
  };

  const isLoading = status === 'generating' || status === 'polling';

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">AI Video Generator</h3>
              <p className="text-xs text-slate-400">Describe the video you need (Veo 3.1)</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Aspect Ratio */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Aspect Ratio</label>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((ar, i) => (
                <button
                  key={ar.label}
                  onClick={() => setSelectedRatio(i)}
                  disabled={isLoading}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                    i === selectedRatio
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <video src={preview} className="w-full aspect-video object-cover" autoPlay loop muted playsInline />
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {status === 'generating' ? 'Starting generation...' : 'Generating video... this may take 1-2 minutes'}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleGenerate()}
              placeholder="Abstract slow-motion particles floating in space..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              autoFocus
              disabled={isLoading}
            />
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-4 rounded-xl"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>

          {/* Insert button */}
          {preview && (
            <Button
              onClick={handleInsert}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white gap-2"
            >
              Insert into Slide
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
