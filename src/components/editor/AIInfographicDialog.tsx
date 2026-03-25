import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Sparkles, BarChart3, Layers, Minimize2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

const STYLES = [
  { id: 'clean', label: 'Clean', icon: <Layers className="w-4 h-4" />, desc: 'Balanced layout, professional' },
  { id: 'data-heavy', label: 'Data Focus', icon: <BarChart3 className="w-4 h-4" />, desc: 'Charts + big numbers' },
  { id: 'visual', label: 'Visual', icon: <Eye className="w-4 h-4" />, desc: 'Color blocks, bold sections' },
  { id: 'minimal', label: 'Minimal', icon: <Minimize2 className="w-4 h-4" />, desc: 'Whitespace, few elements' },
];

const EXAMPLES = [
  'Our company grew 127% YoY. Revenue hit $2.4M with 12,847 active users. Customer satisfaction is at 94.2%. Average sales cycle reduced from 60 to 47 days.',
  'Q3 Results: Marketing spend $450K (+12%), Sales revenue $1.8M (+24%), Customer acquisition cost $32 (-18%), Net promoter score 72 (+8 points)',
  'Market Analysis: TAM $45B growing 23% annually. We target SMB segment ($12B). Current market share 2.1%. Top competitors: Acme (34%), Beta Corp (22%), Others (42%)',
];

export default function AIInfographicDialog({ onClose }: Props) {
  const [content, setContent] = useState('');
  const [style, setStyle] = useState('clean');
  const [loading, setLoading] = useState(false);
  const { addElement, presentation } = useEditorStore();
  const theme = presentation.theme.tokens;

  const handleGenerate = async () => {
    if (!content.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-infographic', {
        body: {
          content: content.trim(),
          themeTokens: { palette: theme.palette, typography: theme.typography },
          style,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const elements = data?.elements || [];
      if (elements.length === 0) throw new Error('No elements generated');

      // Insert all elements
      let count = 0;
      for (const el of elements) {
        try {
          if (el.type === 'chart') {
            // Chart: content is the ChartData JSON
            const chartContent = typeof el.content === 'string' ? el.content : JSON.stringify(el.content);
            addElement({
              type: 'chart',
              content: chartContent,
              x: el.x || 100, y: el.y || 100,
              width: el.width || 600, height: el.height || 400,
              rotation: 0, opacity: el.opacity ?? 1,
              locked: false, visible: true,
              style: el.style || {},
            });
          } else {
            addElement({
              type: el.type || 'text',
              content: el.content || '',
              x: el.x || 100, y: el.y || 100,
              width: Math.max(el.width || 100, 20),
              height: Math.max(el.height || 50, 10),
              rotation: 0, opacity: el.opacity ?? 1,
              locked: false, visible: true,
              style: {
                ...el.style,
                // Ensure fonts from theme
                fontFamily: el.style?.fontFamily || theme.typography.bodyFont,
              },
            });
          }
          count++;
        } catch (e) {
          console.warn('Failed to insert element:', e);
        }
      }

      toast.success(`Infographic created! ${count} elements added`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate infographic');
    } finally {
      setLoading(false);
    }
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
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">AI Infographic</h3>
              <p className="text-xs text-slate-400">Paste your content — AI creates a visual infographic</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Style picker */}
          <div>
            <label className="text-[10px] text-slate-500 font-medium mb-2 block">Style</label>
            <div className="grid grid-cols-4 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all ${
                    style === s.id
                      ? 'bg-gradient-to-r from-[#4F46E5]/10 to-[#9333EA]/10 border-[#4F46E5]/30 border text-[#4F46E5]'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  {s.icon}
                  <span className="text-[10px] font-semibold">{s.label}</span>
                  <span className="text-[8px] opacity-60">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content input */}
          <div>
            <label className="text-[10px] text-slate-500 font-medium mb-1 block">Content to visualize</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste your data, stats, report text, or any content you want to turn into a visual infographic..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20 resize-none"
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] text-slate-400">{content.length}/3000 characters</span>
            </div>
          </div>

          {/* Example pills */}
          <div>
            <label className="text-[10px] text-slate-400 font-medium mb-1.5 block">Try an example</label>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setContent(ex)}
                  className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-[11px] text-slate-600 transition-colors line-clamp-1"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#4F46E5] animate-spin mr-3" />
              <span className="text-sm text-slate-500">Creating your infographic...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 shrink-0">
          <Button
            onClick={handleGenerate}
            disabled={loading || !content.trim()}
            className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white rounded-xl shadow-lg shadow-[#4F46E5]/20 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate Infographic</>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
