import React, { useState } from 'react';
import { Type, Layout, Palette, Image, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PresentationTheme } from '@/types/presentation';
import { TEMPLATE_REGISTRY, templateToTheme } from '@/lib/template-registry';

interface Props {
  theme: PresentationTheme;
  onThemeChange: (theme: PresentationTheme) => void;
  onLayoutChange: (layout: string) => void;
  currentLayout: string;
  onAIRewrite?: () => void;
}

const tools = [
  { id: 'ai', icon: Sparkles, label: 'AI', highlight: true },
  { id: 'layout', icon: Layout, label: 'Layout' },
  { id: 'theme', icon: Palette, label: 'Theme' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'image', icon: Image, label: 'Media' },
];

const layouts = [
  { id: 'cover', name: 'Cover', desc: 'Title slide' },
  { id: 'content', name: 'Content', desc: 'Title + bullets' },
  { id: 'two-column', name: 'Two Column', desc: 'Split layout' },
  { id: 'statement', name: 'Statement', desc: 'Big quote' },
  { id: 'closing', name: 'Closing', desc: 'Thank you' },
];

export default function CompactRightPanel({ theme, onThemeChange, onLayoutChange, currentLayout, onAIRewrite }: Props) {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const renderPanel = () => {
    switch (activePanel) {
      case 'layout':
        return (
          <div className="space-y-2">
            {layouts.map(l => (
              <button
                key={l.id}
                onClick={() => onLayoutChange(l.id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-all',
                  currentLayout === l.id
                    ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
                    : 'bg-slate-50 border border-slate-200 hover:border-indigo-300 text-slate-700'
                )}
              >
                <div className="text-sm font-medium">{l.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{l.desc}</div>
              </button>
            ))}
          </div>
        );

      case 'theme':
        return (
          <div className="space-y-2">
            {TEMPLATE_REGISTRY.map(t => {
              const isActive = theme.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(templateToTheme(t))}
                  className={cn(
                    'w-full p-3 rounded-lg text-left transition-all flex items-center gap-3',
                    isActive
                      ? 'bg-indigo-100 border-2 border-indigo-500'
                      : 'bg-slate-50 border border-slate-200 hover:border-indigo-300'
                  )}
                >
                  <div className="flex gap-1">
                    {[t.colors.primary, t.colors.secondary, t.colors.accent].map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.category}</div>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'ai':
        return (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">AI Assist</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Rewrite or enhance the current slide</p>
            <button
              onClick={() => { onAIRewrite?.(); setActivePanel(null); }}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all"
            >
              Rewrite Slide
            </button>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">Select a tool</p>
          </div>
        );
    }
  };

  return (
    <>
      {/* Vertical Toolbar */}
      <div className="w-14 bg-white border-l border-slate-200 flex flex-col items-center py-4 gap-1 flex-shrink-0">
        {tools.map(tool => {
          const Icon = tool.icon;
          const isActive = activePanel === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => setActivePanel(activePanel === tool.id ? null : tool.id)}
              className={cn(
                'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all group',
                isActive
                  ? 'bg-indigo-100 text-indigo-600'
                  : tool.highlight
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              )}
              title={tool.label}
            >
              <Icon className="w-5 h-5" />
              <div className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {tool.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expandable Panel */}
      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setActivePanel(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-14 top-[53px] bottom-0 w-72 bg-white border-l border-slate-200 shadow-xl overflow-y-auto z-50"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
                <h3 className="font-semibold text-slate-800">
                  {tools.find(t => t.id === activePanel)?.label}
                </h3>
                <button onClick={() => setActivePanel(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="p-4">
                {renderPanel()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
