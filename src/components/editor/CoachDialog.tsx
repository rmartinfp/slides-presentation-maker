import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, X, Loader2, AlertTriangle, CheckCircle2, Lightbulb,
  Sparkles, Type, Layout, GitBranch, Eye, ChevronRight,
  TriangleAlert, Info, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
}

interface CoachIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  slide: number;
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

type Tab = 'overview' | 'issues' | 'tips';

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  content: { icon: Type, color: 'text-blue-500', label: 'Content' },
  design: { icon: Layout, color: 'text-purple-500', label: 'Design' },
  flow: { icon: GitBranch, color: 'text-amber-500', label: 'Flow' },
  accessibility: { icon: Eye, color: 'text-emerald-500', label: 'Accessibility' },
};

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100 text-red-700', label: 'Critical' },
  warning: { icon: TriangleAlert, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', label: 'Warning' },
  suggestion: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', label: 'Suggestion' },
};

function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color = score < 4 ? '#ef4444' : score <= 6 ? '#f59e0b' : '#10b981';
  const label = score < 4 ? 'Needs Work' : score <= 6 ? 'Good Start' : 'Great Job';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-slate-800">{score}</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function CategoryBar({ category, issues }: { category: string; issues: CoachIssue[] }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.content;
  const Icon = meta.icon;
  const criticals = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const suggestions = issues.filter(i => i.severity === 'suggestion').length;
  const total = issues.length;
  const score = Math.max(0, 10 - criticals * 3 - warnings * 1.5 - suggestions * 0.5);
  const pct = Math.round((score / 10) * 100);

  return (
    <div className="flex items-center gap-3">
      <Icon className={cn('w-4 h-4 shrink-0', meta.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-slate-600">{meta.label}</span>
          <span className="text-[10px] text-slate-400">
            {total === 0 ? 'No issues' : `${total} issue${total > 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function CoachDialog({ onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoachResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [fixingIssue, setFixingIssue] = useState<number | null>(null);

  const presentation = useEditorStore(s => s.presentation);
  const setActiveSlideIndex = useEditorStore(s => s.setActiveSlideIndex);

  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      try {
        // Send lightweight data — only structure, not full content/images
        const lightSlides = presentation.slides.map((slide, i) => {
          const elements = slide.elements || [];
          const textEls = elements.filter(e => e.type === 'text');
          const imageEls = elements.filter(e => e.type === 'image');
          const shapeEls = elements.filter(e => e.type === 'shape');
          return {
            slideNumber: i + 1,
            layout: (slide as any).layout || 'content',
            elementCount: elements.length,
            textCount: textEls.length,
            imageCount: imageEls.length,
            shapeCount: shapeEls.length,
            texts: textEls.map(e => ({
              content: e.content?.replace(/<[^>]+>/g, '').substring(0, 200),
              fontSize: e.style?.fontSize,
              fontWeight: e.style?.fontWeight,
            })),
            hasNotes: !!slide.notes,
            background: slide.background?.type,
          };
        });

        const { data, error: fnError } = await supabase.functions.invoke('coach-presentation', {
          body: { slides: lightSlides, title: presentation.title, preBuilt: true },
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

  const handleGoToSlide = (slideNumber: number) => {
    setActiveSlideIndex(slideNumber - 1);
    onClose();
  };

  const handleFixIssue = useCallback(async (issue: CoachIssue, index: number) => {
    if (issue.slide < 1 || issue.slide > presentation.slides.length) {
      toast.error('Cannot fix general issues automatically');
      return;
    }

    setFixingIssue(index);
    try {
      const slide = presentation.slides[issue.slide - 1];
      const textElements = (slide.elements || [])
        .filter(e => e.type === 'text')
        .map(e => ({
          id: e.id,
          type: e.type,
          content: e.content,
          x: e.x, y: e.y, width: e.width, height: e.height,
          style: e.style,
        }));

      const instruction = `Fix this issue: ${issue.title}. ${issue.description}. Category: ${issue.category}. Only modify text content — keep positions, sizes, and styles exactly the same.`;

      const { data, error } = await supabase.functions.invoke('rewrite-slide', {
        body: {
          slide: { elements: textElements, notes: slide.notes || '' },
          instruction,
          presentationContext: presentation.title,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data.elements && Array.isArray(data.elements)) {
        const { updateElement } = useEditorStore.getState();
        useEditorStore.getState().pushSnapshot();

        for (const aiEl of data.elements) {
          const original = slide.elements.find(e => e.id === aiEl.id);
          if (original && original.type === 'text' && aiEl.content !== original.content) {
            updateElement(aiEl.id, { content: aiEl.content });
          }
        }
        toast.success(`Fixed: ${issue.title}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to apply fix');
    } finally {
      setFixingIssue(null);
    }
  }, [presentation]);

  // Group issues by category
  const issuesByCategory = result?.issues.reduce((acc, issue) => {
    const cat = issue.category || 'content';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(issue);
    return acc;
  }, {} as Record<string, CoachIssue[]>) || {};

  const categories = Object.keys(CATEGORY_META);
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'issues', label: 'Issues', count: result?.issues.length },
    { id: 'tips', label: 'Tips', count: result?.tips.length },
  ];

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
        className="w-full max-w-[640px] bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center shadow-lg shadow-indigo-200">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-[15px]">Presentation Coach</h3>
              <p className="text-xs text-slate-400">AI-powered analysis & fixes</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              <p className="text-sm text-slate-400">Analyzing your presentation...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            </div>
          )}

          {result && (
            <>
              {/* Tabs */}
              <div className="px-6 pt-4 pb-0 flex gap-1 border-b border-slate-100">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors relative',
                      activeTab === tab.id
                        ? 'text-indigo-600 bg-indigo-50/50'
                        : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    {tab.label}
                    {tab.count != null && tab.count > 0 && (
                      <span className={cn(
                        'ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
                        activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                      )}>
                        {tab.count}
                      </span>
                    )}
                    {activeTab === tab.id && (
                      <motion.div layoutId="coach-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {/* ── OVERVIEW TAB ── */}
                  {activeTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6"
                    >
                      {/* Score + Summary */}
                      <div className="flex items-center gap-6">
                        <ScoreRing score={result.overallScore} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-600 leading-relaxed">{result.summary}</p>
                        </div>
                      </div>

                      {/* Category bars */}
                      <div className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                        {categories.map(cat => (
                          <CategoryBar key={cat} category={cat} issues={issuesByCategory[cat] || []} />
                        ))}
                      </div>

                      {/* Strengths */}
                      {result.strengths.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Strengths</p>
                          <div className="space-y-2">
                            {result.strengths.map((s, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-700">{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick action: go to issues */}
                      {result.issues.length > 0 && (
                        <button
                          onClick={() => setActiveTab('issues')}
                          className="w-full flex items-center justify-between p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 hover:bg-indigo-100/80 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Wand2 className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium text-indigo-700">
                              {result.issues.length} issue{result.issues.length > 1 ? 's' : ''} found — fix with AI
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* ── ISSUES TAB ── */}
                  {activeTab === 'issues' && (
                    <motion.div
                      key="issues"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-5"
                    >
                      {result.issues.length === 0 ? (
                        <div className="text-center py-12">
                          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-600">No issues found!</p>
                          <p className="text-xs text-slate-400 mt-1">Your presentation looks great.</p>
                        </div>
                      ) : (
                        categories.map(cat => {
                          const catIssues = issuesByCategory[cat];
                          if (!catIssues || catIssues.length === 0) return null;
                          const meta = CATEGORY_META[cat];
                          const Icon = meta.icon;

                          return (
                            <div key={cat}>
                              <div className="flex items-center gap-2 mb-2.5">
                                <Icon className={cn('w-3.5 h-3.5', meta.color)} />
                                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{meta.label}</span>
                                <span className="text-[10px] text-slate-300">({catIssues.length})</span>
                              </div>
                              <div className="space-y-2">
                                {catIssues.map((issue, i) => {
                                  const globalIdx = result.issues.indexOf(issue);
                                  const sev = SEVERITY_CONFIG[issue.severity];
                                  const SevIcon = sev.icon;
                                  const isFixing = fixingIssue === globalIdx;
                                  const canFix = issue.slide > 0 && (issue.category === 'content' || issue.category === 'flow');

                                  return (
                                    <div
                                      key={i}
                                      className={cn('rounded-xl border p-3.5 transition-colors', sev.bg, sev.border)}
                                    >
                                      <div className="flex items-start gap-3">
                                        <SevIcon className={cn('w-4 h-4 mt-0.5 shrink-0', sev.text)} />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded', sev.badge)}>
                                              {sev.label}
                                            </span>
                                            {issue.slide > 0 && (
                                              <button
                                                onClick={() => handleGoToSlide(issue.slide)}
                                                className="text-[10px] text-slate-400 hover:text-indigo-500 transition-colors"
                                              >
                                                Slide {issue.slide} →
                                              </button>
                                            )}
                                          </div>
                                          <p className="text-sm font-medium text-slate-800 mb-0.5">{issue.title}</p>
                                          <p className="text-xs text-slate-500 leading-relaxed">{issue.description}</p>

                                          {canFix && (
                                            <button
                                              onClick={() => handleFixIssue(issue, globalIdx)}
                                              disabled={isFixing}
                                              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all disabled:opacity-50"
                                            >
                                              {isFixing ? (
                                                <><Loader2 className="w-3 h-3 animate-spin" /> Fixing...</>
                                              ) : (
                                                <><Sparkles className="w-3 h-3" /> Fix with AI</>
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}

                  {/* ── TIPS TAB ── */}
                  {activeTab === 'tips' && (
                    <motion.div
                      key="tips"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-3"
                    >
                      {result.tips.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-12">No additional tips.</p>
                      ) : (
                        result.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-3 p-3.5 bg-amber-50/50 rounded-xl border border-amber-100">
                            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <span className="text-sm text-slate-700 leading-relaxed">{tip}</span>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
