import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Slide, PresentationTheme, SlideElement } from '@/types/presentation';
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
  const startTime = useRef(Date.now());

  const slide = slides[currentIndex];
  const nextSlide = currentIndex < slides.length - 1 ? slides[currentIndex + 1] : null;

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col">
      {/* Top bar */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white/80">Presenter View</span>
          <span className="text-xs text-slate-500 font-mono">
            Slide {currentIndex + 1} of {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <button
            onClick={onExit}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Current slide (large) */}
        <div className="flex-[3] flex items-center justify-center p-6 relative">
          {/* Nav arrows */}
          {currentIndex > 0 && (
            <button
              onClick={() => setCurrentIndex(currentIndex - 1)}
              className="absolute left-3 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {currentIndex < slides.length - 1 && (
            <button
              onClick={() => setCurrentIndex(currentIndex + 1)}
              className="absolute right-3 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div className="w-full max-w-[960px] aspect-[16/9] rounded-lg overflow-hidden shadow-2xl border border-white/10">
            <div style={{ width: 1920 * 0.5, height: 1080 * 0.5 }}>
              <SlideCanvas slide={slide} theme={theme} scale={0.5} isEditing={false} />
            </div>
          </div>
        </div>

        {/* Right: Notes + Next slide + Timer */}
        <div className="flex-[2] border-l border-white/10 flex flex-col overflow-hidden">
          {/* Next slide preview */}
          <div className="p-4 border-b border-white/10 shrink-0">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Next Slide</h4>
            {nextSlide ? (
              <div className="w-full max-w-[320px] aspect-[16/9] rounded-md overflow-hidden border border-white/10">
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
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Speaker Notes</h4>
            {slide.notes ? (
              <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
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
