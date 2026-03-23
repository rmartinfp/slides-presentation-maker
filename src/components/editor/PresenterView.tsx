import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, RotateCcw } from 'lucide-react';
import { Slide, PresentationTheme } from '@/types/presentation';
import SlideCanvas from './SlideCanvas';

interface Props {
  slides: Slide[];
  theme: PresentationTheme;
  startIndex?: number;
  onExit: () => void;
}

export default function PresenterView({ slides, theme, startIndex = 0, onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [elapsed, setElapsed] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [noteSize, setNoteSize] = useState<'sm' | 'base' | 'lg'>('base');
  const startTime = useRef(Date.now());

  const slide = slides[currentIndex];
  const nextSlide = currentIndex < slides.length - 1 ? slides[currentIndex + 1] : null;
  const progress = slides.length > 1 ? (currentIndex / (slides.length - 1)) * 100 : 100;

  // Timer + clock
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const resetTimer = () => { startTime.current = Date.now(); setElapsed(0); };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        if (currentIndex < slides.length - 1) setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, slides.length, onExit]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  const clockStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const noteFontClass = noteSize === 'sm' ? 'text-sm' : noteSize === 'base' ? 'text-base' : 'text-lg';

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-white/5 shrink-0">
        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">Presenter View</span>
          <span className="text-xs text-slate-500 font-mono">
            Slide {currentIndex + 1} / {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Wall clock */}
          <span className="text-sm text-white/50 font-mono tabular-nums">{clockStr}</span>

          {/* Elapsed timer */}
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono tabular-nums">{formatTime(elapsed)}</span>
            <button onClick={resetTimer} className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors" title="Reset timer">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button onClick={onExit} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Current slide (large) — click to advance */}
        <div
          className="flex-[3] flex items-center justify-center p-6 relative cursor-pointer"
          onClick={() => { if (currentIndex < slides.length - 1) setCurrentIndex(currentIndex + 1); }}
        >
          {currentIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(currentIndex - 1); }}
              className="absolute left-3 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {currentIndex < slides.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(currentIndex + 1); }}
              className="absolute right-3 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="w-full max-w-[960px] aspect-[16/9] rounded-lg overflow-hidden shadow-2xl border border-white/10">
            <div style={{ width: 1920 * 0.5, height: 1080 * 0.5 }}>
              <SlideCanvas slide={slide} theme={theme} scale={0.5} isEditing={false} />
            </div>
          </div>
        </div>

        {/* Right: Next slide + Notes */}
        <div className="flex-[2] border-l border-white/10 flex flex-col overflow-hidden">
          {/* Next slide preview */}
          <div className="p-4 border-b border-white/10 shrink-0">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Next Slide</h4>
            {nextSlide ? (
              <div className="w-full max-w-[320px] aspect-[16/9] rounded-md overflow-hidden border border-white/10 cursor-pointer hover:border-indigo-500/50 transition-colors"
                onClick={() => setCurrentIndex(currentIndex + 1)}>
                <div style={{ width: 1920 * 0.167, height: 1080 * 0.167 }}>
                  <SlideCanvas slide={nextSlide} theme={theme} scale={0.167} isEditing={false} />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[320px] aspect-[16/9] rounded-md border border-white/10 bg-white/5 flex items-center justify-center">
                <span className="text-xs text-slate-500">End of presentation</span>
              </div>
            )}
          </div>

          {/* Speaker notes */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Speaker Notes</h4>
              <div className="flex gap-0.5">
                {(['sm', 'base', 'lg'] as const).map(sz => (
                  <button key={sz} onClick={() => setNoteSize(sz)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${noteSize === sz ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                    {sz === 'sm' ? 'S' : sz === 'base' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
            </div>
            {slide.notes ? (
              <p className={`${noteFontClass} text-white/80 whitespace-pre-wrap leading-relaxed`}>
                {slide.notes}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic">No notes for this slide</p>
            )}
          </div>

          {/* Slide navigation dots */}
          <div className="p-4 border-t border-white/10 shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-6 h-6 rounded text-[10px] font-medium transition-colors ${
                    i === currentIndex
                      ? 'bg-indigo-600 text-white'
                      : i < currentIndex
                        ? 'bg-indigo-600/30 text-indigo-300'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
