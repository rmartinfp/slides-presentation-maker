import React from 'react';
import { Slide, PresentationTheme } from '@/types/presentation';
import { cn } from '@/lib/utils';
import { GripVertical, Plus } from 'lucide-react';

interface Props {
  slides: Slide[];
  activeIndex: number;
  theme: PresentationTheme;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
}

export default function SlideList({ slides, activeIndex, theme, onSelectSlide, onAddSlide }: Props) {
  const { palette } = theme.tokens;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slides</span>
        <span className="text-xs text-muted-foreground">{slides.length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => onSelectSlide(i)}
            className={cn(
              'w-full group relative rounded-lg border transition-all duration-150',
              i === activeIndex
                ? 'thumbnail-active border-primary'
                : 'border-border hover:border-muted-foreground/40'
            )}
          >
            {/* Slide number */}
            <div className="absolute -left-0.5 top-1 text-[10px] text-muted-foreground font-medium">
              {i + 1}
            </div>
            {/* Mini preview */}
            <div
              className="aspect-video rounded-md overflow-hidden mx-2 my-2"
              style={{ backgroundColor: palette.bg }}
            >
              <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-1">
                {slide.title && (
                  <div
                    className="text-[6px] font-bold text-center leading-tight truncate w-full"
                    style={{ color: palette.primary }}
                  >
                    {slide.title}
                  </div>
                )}
                {slide.subtitle && (
                  <div
                    className="text-[5px] text-center truncate w-full opacity-60"
                    style={{ color: palette.text }}
                  >
                    {slide.subtitle}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Add slide button */}
      <div className="px-3 py-3 border-t border-border">
        <button
          onClick={onAddSlide}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Slide
        </button>
      </div>
    </div>
  );
}
