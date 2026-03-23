import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, X, Loader2, FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { generateId } from '@/lib/slide-utils';
import { getLayoutById } from '@/lib/layout-library';
import { renderLayout, SlideContent } from '@/lib/layout-renderer';
import { Slide } from '@/types/presentation';
import { loadFontsFromSlides } from '@/lib/font-loader';

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const LANGUAGES = [
  { label: 'English', code: 'en-US' },
  { label: 'Spanish', code: 'es-ES' },
  { label: 'French', code: 'fr-FR' },
  { label: 'German', code: 'de-DE' },
  { label: 'Italian', code: 'it-IT' },
  { label: 'Portuguese', code: 'pt-BR' },
  { label: 'Chinese', code: 'zh-CN' },
  { label: 'Japanese', code: 'ja-JP' },
  { label: 'Korean', code: 'ko-KR' },
  { label: 'Arabic', code: 'ar-SA' },
] as const;

type InputMode = 'record' | 'paste';

interface Props {
  onClose: () => void;
}

export default function VoiceToSlidesDialog({ onClose }: Props) {
  const speechSupported = !!SpeechRecognition;

  const [mode, setMode] = useState<InputMode>(speechSupported ? 'record' : 'paste');
  const [language, setLanguage] = useState('en-US');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [generating, setGenerating] = useState(false);

  const recognitionRef = useRef<any>(null);
  const { presentation } = useEditorStore();

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      setTranscript((prev) => {
        // Only append new final results
        const newFinal = final.trim();
        if (newFinal && !prev.endsWith(newFinal)) {
          return (prev ? prev + ' ' : '') + newFinal;
        }
        return prev;
      });
      setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        toast.error(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [language]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimText('');
  }, []);

  const handleFinishTranscript = () => {
    if (mode === 'record') {
      stopRecording();
      if (transcript.trim()) {
        setIsReady(true);
      }
    } else {
      if (pasteText.trim()) {
        setTranscript(pasteText.trim());
        setIsReady(true);
      }
    }
  };

  const handleBack = () => {
    setIsReady(false);
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) return;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-presentation', {
        body: {
          prompt: `Create a presentation based on this transcript/speech:\n\n${transcript}`,
          length: 'informative',
        },
      });

      if (error) throw new Error(error.message || 'Failed to generate presentation');
      if (data?.error) throw new Error(data.error);

      const theme = presentation.theme;
      const tokens = theme.tokens;

      const newSlides: Slide[] = (data.slides || []).map((aiSlide: any, index: number) => {
        const layoutId = aiSlide.layout || 'content-title-body';
        const layout = getLayoutById(layoutId);

        const content: SlideContent = {
          title: aiSlide.title,
          subtitle: aiSlide.subtitle,
          body: aiSlide.body,
          bullets: aiSlide.bullets,
          stats: aiSlide.stats,
          quote: aiSlide.quote,
          quoteAuthor: aiSlide.quoteAuthor,
          labels: aiSlide.labels,
          sectionNumber: aiSlide.sectionNumber || (index > 0 ? String(index).padStart(2, '0') : undefined),
        };

        if (layout) {
          const { elements, background } = renderLayout(layout, content, tokens);
          return {
            id: generateId(),
            elements,
            background,
            notes: aiSlide.notes || '',
            layout: layout.category || 'content',
          } as Slide;
        }

        const fallbackLayout = getLayoutById('content-title-body')!;
        const { elements, background } = renderLayout(fallbackLayout, content, tokens);
        return {
          id: generateId(),
          elements,
          background,
          notes: aiSlide.notes || '',
          layout: 'content',
        } as Slide;
      });

      // Preload fonts
      loadFontsFromSlides(newSlides);

      // Add generated slides to the current presentation
      const updatedSlides = [...presentation.slides, ...newSlides];
      useEditorStore.getState().setPresentation({
        ...presentation,
        slides: updatedSlides,
        updatedAt: new Date().toISOString(),
      });

      // Navigate to the first new slide
      useEditorStore.getState().setActiveSlideIndex(presentation.slides.length);

      toast.success(`Added ${newSlides.length} slides from your transcript!`);
      onClose();
    } catch (err: any) {
      console.error('Voice to slides error:', err);
      toast.error(err.message || 'Failed to generate slides from transcript.');
    } finally {
      setGenerating(false);
    }
  };

  const currentTranscript = mode === 'record' ? transcript : pasteText;
  const hasContent = currentTranscript.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Voice to Slides</h3>
              <p className="text-xs text-slate-400">
                Record or paste a transcript to generate slides
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Generating state */}
          {generating && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">
                  Creating slides from your content...
                </p>
                <p className="text-xs text-slate-400 mt-1">This may take a moment</p>
              </div>
            </div>
          )}

          {/* Review step */}
          {!generating && isReady && (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">
                  Review transcript before generating
                </label>
                <textarea
                  readOnly
                  value={transcript}
                  className="w-full h-48 px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-700 resize-none focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-purple-600 text-white gap-2 rounded-xl"
                >
                  <Send className="w-4 h-4" />
                  Generate Slides
                </Button>
              </div>
            </>
          )}

          {/* Input step */}
          {!generating && !isReady && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => {
                    if (!speechSupported) return;
                    setMode('record');
                  }}
                  disabled={!speechSupported}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'record'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : speechSupported
                        ? 'text-slate-500 hover:text-slate-700'
                        : 'text-slate-300 cursor-not-allowed'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  Record
                </button>
                <button
                  onClick={() => {
                    if (isRecording) stopRecording();
                    setMode('paste');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'paste'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Paste
                </button>
              </div>

              {/* Browser compatibility warning */}
              {!speechSupported && mode === 'paste' && (
                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Speech recognition is not supported in this browser. You can still paste a transcript below.
                </div>
              )}

              {/* Language selector */}
              {mode === 'record' && speechSupported && (
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isRecording}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-white disabled:opacity-50"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Record mode */}
              {mode === 'record' && speechSupported && (
                <div className="space-y-4">
                  {/* Microphone button */}
                  <div className="flex justify-center py-4">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                        isRecording
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isRecording && (
                        <motion.span
                          className="absolute inset-0 rounded-full bg-red-500"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}
                      {isRecording ? (
                        <MicOff className="w-8 h-8 relative z-10" />
                      ) : (
                        <Mic className="w-8 h-8" />
                      )}
                    </button>
                  </div>

                  <p className="text-center text-xs text-slate-400">
                    {isRecording
                      ? 'Listening... Click to stop'
                      : 'Click the microphone to start recording'}
                  </p>

                  {/* Live transcript */}
                  {(transcript || interimText) && (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 bg-slate-50">
                      {transcript}
                      {interimText && (
                        <span className="text-slate-400">{interimText}</span>
                      )}
                    </div>
                  )}

                  {/* Use transcript button */}
                  {transcript.trim() && !isRecording && (
                    <Button
                      onClick={handleFinishTranscript}
                      className="w-full bg-gradient-to-r from-rose-500 to-purple-600 text-white gap-2 rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                      Use this transcript
                    </Button>
                  )}
                </div>
              )}

              {/* Paste mode */}
              {mode === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your transcript, speech notes, or any text content here..."
                    className="w-full h-48 px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 resize-none focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 placeholder:text-slate-300"
                    autoFocus
                  />
                  <Button
                    onClick={handleFinishTranscript}
                    disabled={!hasContent}
                    className="w-full bg-gradient-to-r from-rose-500 to-purple-600 text-white gap-2 rounded-xl disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Continue with this text
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
