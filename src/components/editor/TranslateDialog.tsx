import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, X, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { produce } from 'immer';

interface Props {
  onClose: () => void;
}

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
];

export default function TranslateDialog({ onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const handleTranslate = async (langCode: string, langLabel: string) => {
    const { presentation } = useEditorStore.getState();
    const { slides, title } = presentation;

    setSelectedLang(langCode);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('translate-presentation', {
        body: { slides, targetLanguage: langLabel, title },
      });

      if (error) throw error;

      useEditorStore.setState(produce((state: any) => {
        state.presentation.slides = data.slides;
        state.presentation.title = data.title;
      }));

      toast.success(`Presentation translated to ${langLabel}`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to translate presentation');
    } finally {
      setLoading(false);
      setSelectedLang(null);
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
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <Languages className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Translate Presentation</h3>
              <p className="text-xs text-slate-400">Select a target language</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Language Grid */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleTranslate(lang.code, lang.label)}
                disabled={loading}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm transition-colors ${
                  selectedLang === lang.code
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="truncate">{lang.label}</span>
                {selectedLang === lang.code && loading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto text-indigo-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
