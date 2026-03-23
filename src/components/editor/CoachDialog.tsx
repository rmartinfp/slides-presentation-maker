import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, X, Loader2, AlertTriangle, CheckCircle2, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

interface CoachIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  slideNumber: number;
  category: string;
  title: string;
  description: string;
}

interface CoachResponse {
  overallScore: number;
  summary: string;
  strengths: string[];
  issues: CoachIssue[];
  tips: string[];
}

function getScoreColor(score: number) {
  if (score < 4) return { bg: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-600' };
  if (score <= 6) return { bg: 'bg-yellow-500', ring: 'ring-yellow-200', text: 'text-yellow-600' };
  return { bg: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-600' };
}

function getSeverityBadge(severity: CoachIssue['severity']) {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'suggestion':
      return 'bg-blue-100 text-blue-700 border-blue-200';
  }
}

export default function CoachDialog({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoachResponse | null>(null);

  const presentation = useEditorStore(s => s.presentation);
  const setActiveSlideIndex = useEditorStore(s => s.setActiveSlideIndex);

  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('coach-presentation', {
          body: { slides: presentation.slides, title: presentation.title },
        });

        if (cancelled) return;

        if (fnError) throw fnError;
        setResult(data as CoachResponse);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('Failed to analyze presentation');
          toast.error('Failed to analyze presentation');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    analyze();
    return () => { cancelled = true; };
  }, []);

  const handleIssueClick = (slideNumber: number) => {
    setActiveSlideIndex(slideNumber - 1);
    onClose();
  };

  const scoreColor = result ? getScoreColor(result.overallScore) : null;

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
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Presentation Coach</h3>
              <p className="text-xs text-slate-400">AI-powered feedback</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm text-slate-500">Analyzing your presentation...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Score */}
              <div className="flex flex-col items-center gap-3">
                <div className={`w-20 h-20 rounded-full ${scoreColor!.bg} ring-4 ${scoreColor!.ring} flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-white">{result.overallScore}</span>
                </div>
                <p className={`text-sm font-medium ${scoreColor!.text}`}>
                  {result.overallScore < 4 ? 'Needs Work' : result.overallScore <= 6 ? 'Good Start' : 'Great Job'}
                </p>
              </div>

              {/* Summary */}
              <p className="text-sm text-slate-600 leading-relaxed text-center">{result.summary}</p>

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Strengths</h4>
                  <div className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-700">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {result.issues.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issues</h4>
                  <div className="space-y-2">
                    {result.issues.map((issue, i) => (
                      <button
                        key={i}
                        onClick={() => handleIssueClick(issue.slideNumber)}
                        className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${getSeverityBadge(issue.severity)}`}>
                            {issue.severity}
                          </span>
                          <span className="text-[10px] text-slate-400">Slide {issue.slideNumber}</span>
                          <span className="text-[10px] text-slate-400">&middot;</span>
                          <span className="text-[10px] text-slate-400">{issue.category}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">{issue.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{issue.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {result.tips.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tips</h4>
                  <div className="space-y-2">
                    {result.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-700">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
