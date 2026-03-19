import React, { useState } from 'react';
import { Slide, PresentationTheme } from '@/types/presentation';
import { cn } from '@/lib/utils';
import { getSlideTitle } from '@/lib/slide-utils';
import { Plus, Trash2, Copy, MoreVertical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  slides: Slide[];
  activeIndex: number;
  theme: PresentationTheme;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
  onDeleteSlide?: (index: number) => void;
  onDuplicateSlide?: (index: number) => void;
}

export default function SlideList({ slides, activeIndex, theme, onSelectSlide, onAddSlide, onDeleteSlide, onDuplicateSlide }: Props) {
  const { palette } = theme.tokens;
  const [hoveredSlide, setHoveredSlide] = useState<number | null>(null);

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex-shrink-0 bg-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700">Slides</span>
          <span className="text-xs text-slate-400">{slides.length}</span>
        </div>
        <Button
          onClick={onAddSlide}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Slide
        </Button>
      </div>

      {/* Slides list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={cn(
              'group relative rounded-xl transition-all duration-200 cursor-pointer',
              activeIndex === idx
                ? 'ring-2 ring-indigo-600 ring-offset-2 shadow-lg scale-[1.02]'
                : 'hover:shadow-md hover:scale-[1.01]'
            )}
            onClick={() => onSelectSlide(idx)}
            onMouseEnter={() => setHoveredSlide(idx)}
            onMouseLeave={() => setHoveredSlide(null)}
          >
            {/* Slide number badge */}
            <div className={cn(
              'absolute -left-1 -top-1 z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md',
              activeIndex === idx
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            )}>
              {idx + 1}
            </div>

            {/* Actions menu */}
            {(hoveredSlide === idx || activeIndex === idx) && (onDeleteSlide || onDuplicateSlide) && (
              <div className="absolute right-1 top-1 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-6 h-6 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-white">
                      <MoreVertical className="w-3 h-3 text-slate-600" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {onDuplicateSlide && (
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); onDuplicateSlide(idx); }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                    )}
                    {onDeleteSlide && (
                      <DropdownMenuItem
                        onClick={e => { e.stopPropagation(); onDeleteSlide(idx); }}
                        className="text-red-600 focus:text-red-600"
                        disabled={slides.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Slide preview — mini canvas */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-slate-200">
              <div
                className="w-full aspect-[16/9] rounded-md overflow-hidden relative"
                style={{
                  backgroundColor:
                    slide.background?.type === 'solid'
                      ? slide.background.value
                      : slide.background?.type === 'image'
                        ? '#111'
                        : palette.bg,
                  background:
                    slide.background?.type === 'gradient'
                      ? slide.background.value
                      : undefined,
                }}
              >
                {/* Background image */}
                {slide.background?.type === 'image' && slide.background.value && (
                  <img
                    src={slide.background.value}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {/* Render mini elements */}
                {slide.elements?.slice(0, 8).map((el) => {
                  const thumbScale = 224 / 1920;
                  return (
                    <div
                      key={el.id}
                      className="absolute overflow-hidden"
                      style={{
                        left: el.x * thumbScale,
                        top: el.y * thumbScale,
                        width: el.width * thumbScale,
                        height: el.height * thumbScale,
                        opacity: el.opacity,
                        fontSize: `${(el.style.fontSize ?? 16) * thumbScale}px`,
                        fontFamily: el.style.fontFamily,
                        fontWeight: el.style.fontWeight as React.CSSProperties['fontWeight'],
                        color: el.style.color,
                        textAlign: el.style.textAlign as React.CSSProperties['textAlign'],
                        backgroundColor: el.type === 'shape'
                          ? (el.style.shapeFill !== 'transparent' ? el.style.shapeFill : undefined)
                          : undefined,
                        borderRadius: el.type === 'shape' ? (el.style.borderRadius ?? 0) * thumbScale : undefined,
                        border: el.type === 'shape' && el.style.shapeStroke && el.style.shapeStroke !== 'transparent'
                          ? `${Math.max(1, (el.style.shapeStrokeWidth ?? 1) * thumbScale)}px solid ${el.style.shapeStroke}`
                          : undefined,
                        ...(el.type === 'shape' && el.style.shapeType === 'circle' ? { borderRadius: '50%' } : {}),
                      }}
                    >
                      {el.type === 'text' && (
                        <span className="line-clamp-2 leading-tight">
                          {el.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                        </span>
                      )}
                      {el.type === 'image' && el.content && (
                        <img src={el.content} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slide title */}
            <div className="mt-2 px-1">
              <p className="text-xs font-medium text-slate-700 truncate">
                {getSlideTitle(slide) || `Slide ${idx + 1}`}
              </p>
            </div>
          </div>
        ))}

        {/* AI suggest slide */}
        <button
          onClick={onAddSlide}
          className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-xs text-slate-500 group-hover:text-indigo-600">
            Add with AI
          </span>
        </button>
      </div>
    </div>
  );
}
