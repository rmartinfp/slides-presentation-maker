import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

const CATEGORIES = [
  'SaaS / Tech', 'Investor Deck', 'Agency / Creative', 'AI / Product',
  'Newsletter / Content', 'Corporate', 'Bold / Brutalist', 'Light / Clean',
  'Growth / Data', 'Custom',
];

export default function SaveAsTemplateDialog({ onClose }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('SaaS / Tech');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const { presentation } = useEditorStore();

  const sourceTable = (presentation as any).sourceTable;
  const sourceTemplateId = (presentation as any).sourceTemplateId;
  const isClassicUpdate = sourceTable === 'templates' && sourceTemplateId;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isClassicUpdate) {
        // UPDATE existing classic template — only update preview_slides and theme
        const slides = presentation.slides.map(s => ({
          id: s.id,
          elements: s.elements,
          background: s.background,
          notes: '',
          layout: (s as any).layout || 'content',
        }));

        const { error } = await supabase.from('templates').update({
          preview_slides: slides,
          theme: {
            id: presentation.theme.id,
            name: presentation.title,
            category: 'Imported',
            tokens: presentation.theme.tokens,
            previewColors: presentation.theme.previewColors,
          },
        }).eq('id', sourceTemplateId);

        if (error) throw error;
        toast.success(`Template updated! Changes will reflect in generation.`);
        onClose();
        return;
      }

      // NEW cinematic template
      if (!name.trim()) { toast.error('Template name is required'); return; }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const theme = {
        id: presentation.theme.id,
        name: name.trim(),
        category: 'Cinematic',
        tokens: presentation.theme.tokens,
        previewColors: presentation.theme.previewColors,
      };

      const slides = presentation.slides.map(s => ({
        id: s.id,
        elements: s.elements,
        background: s.background,
        videoBackground: s.videoBackground,
        animationConfig: s.animationConfig,
      }));

      const { error } = await supabase.from('cinematic_templates').insert({
        name: name.trim(),
        slug,
        category,
        description: description.trim() || `${name} cinematic template with ${slides.length} slides.`,
        preset_id: presentation.cinematicPresetId || 'midnight',
        slides,
        theme,
        tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
        is_active: true,
        sort_order: 99,
      });

      if (error) throw error;
      toast.success(`Template "${name}" saved! It will appear in Cinematic gallery.`);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
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
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{isClassicUpdate ? 'Update Template' : 'Save as Cinematic Template'}</h3>
              <p className="text-xs text-slate-400">{presentation.slides.length} slides{isClassicUpdate ? ` — updating "${presentation.title?.replace(/ by Slidesgo$/i, '')}"` : ' will be saved as a template'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Classic template: simple update button */}
          {isClassicUpdate && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Your changes to text, fonts, sizes, and layout will be saved.
                The next time someone generates with this template, they'll see your edits.
              </p>
              <Button onClick={handleSave} disabled={saving}
                className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white rounded-xl py-3">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : <><Upload className="w-4 h-4 mr-2" />Update Template</>}
              </Button>
            </div>
          )}

          {/* Cinematic template: full form */}
          {!isClassicUpdate && <>
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Template Name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Midnight Pitch, Neon Studio..."
              className="text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    category === cat
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Description (optional)</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the template style..."
              className="text-sm"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Tags (comma-separated)</label>
            <Input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. dark, serif, elegant, startup"
              className="text-sm"
            />
          </div>

          {/* Info */}
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
            <p>This saves your current presentation design as a cinematic template. Text content will be used as placeholders — AI will replace them when users generate with this template.</p>
            <p className="mt-1">Tip: Use descriptive placeholder text like "Your company mission statement" so AI knows what to generate.</p>
          </div>
          </>}
        </div>

        {/* Footer */}
        {!isClassicUpdate && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Save Template'}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
