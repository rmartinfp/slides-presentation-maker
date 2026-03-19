import React from 'react';
import { Slide, PresentationTheme } from '@/types/presentation';

interface Props {
  slide: Slide;
  theme: PresentationTheme;
  scale?: number;
  isEditing?: boolean;
  onUpdateSlide?: (slide: Slide) => void;
}

export default function SlideCanvas({ slide, theme, scale = 1, isEditing = false, onUpdateSlide }: Props) {
  const { palette } = theme.tokens;

  const renderSlideContent = () => {
    switch (slide.layout) {
      case 'cover':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-20">
            <h1
              style={{ color: palette.primary, fontFamily: theme.tokens.typography.titleFont, fontSize: theme.tokens.typography.titleSize * 1.2 }}
              className="font-bold leading-tight mb-6"
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={e => onUpdateSlide?.({ ...slide, title: e.currentTarget.textContent || '' })}
            >
              {slide.title || 'Presentation Title'}
            </h1>
            <p
              style={{ color: palette.text, fontFamily: theme.tokens.typography.bodyFont, fontSize: theme.tokens.typography.bodySize }}
              className="opacity-70"
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={e => onUpdateSlide?.({ ...slide, subtitle: e.currentTarget.textContent || '' })}
            >
              {slide.subtitle || 'Subtitle'}
            </p>
          </div>
        );

      case 'statement':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-24">
            <h1
              style={{ color: palette.text, fontFamily: theme.tokens.typography.titleFont, fontSize: theme.tokens.typography.titleSize }}
              className="font-bold leading-tight mb-6 italic"
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={e => onUpdateSlide?.({ ...slide, title: e.currentTarget.textContent || '' })}
            >
              {slide.title}
            </h1>
            {slide.subtitle && (
              <p
                style={{ color: palette.primary, fontFamily: theme.tokens.typography.bodyFont, fontSize: theme.tokens.typography.bodySize * 0.8 }}
                className="font-medium"
              >
                {slide.subtitle}
              </p>
            )}
          </div>
        );

      case 'closing':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-20">
            <h1
              style={{ color: palette.primary, fontFamily: theme.tokens.typography.titleFont, fontSize: theme.tokens.typography.titleSize * 1.4 }}
              className="font-bold mb-4"
            >
              {slide.title || 'Thank You'}
            </h1>
            <p style={{ color: palette.text, fontSize: theme.tokens.typography.bodySize }} className="opacity-60">
              {slide.subtitle}
            </p>
            {slide.body && (
              <p style={{ color: palette.primary, fontSize: theme.tokens.typography.bodySize * 0.8 }} className="mt-8 opacity-80">
                {slide.body}
              </p>
            )}
          </div>
        );

      case 'two-column':
        return (
          <div className="flex flex-col h-full px-16 py-14">
            <h2
              style={{ color: palette.primary, fontFamily: theme.tokens.typography.titleFont, fontSize: theme.tokens.typography.titleSize }}
              className="font-bold mb-10"
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={e => onUpdateSlide?.({ ...slide, title: e.currentTarget.textContent || '' })}
            >
              {slide.title}
            </h2>
            <div className="flex-1 grid grid-cols-2 gap-12">
              <div className="flex flex-col justify-start">
                <p style={{ color: palette.text, fontSize: theme.tokens.typography.bodySize }} className="leading-relaxed">
                  {slide.body}
                </p>
              </div>
              <div className="flex flex-col justify-start gap-4">
                {slide.bullets?.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: palette.primary }} />
                    <p style={{ color: palette.text, fontSize: theme.tokens.typography.bodySize * 0.9 }}>{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default: // 'content' and others
        return (
          <div className="flex flex-col h-full px-16 py-14">
            <h2
              style={{ color: palette.primary, fontFamily: theme.tokens.typography.titleFont, fontSize: theme.tokens.typography.titleSize }}
              className="font-bold mb-10"
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={e => onUpdateSlide?.({ ...slide, title: e.currentTarget.textContent || '' })}
            >
              {slide.title}
            </h2>
            <div className="flex-1 flex flex-col justify-start gap-5">
              {slide.bullets && slide.bullets.length > 0 ? (
                slide.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-3 h-3 rounded-full mt-2 shrink-0" style={{ backgroundColor: palette.accent || palette.primary }} />
                    <p style={{ color: palette.text, fontFamily: theme.tokens.typography.bodyFont, fontSize: theme.tokens.typography.bodySize }} className="leading-relaxed">
                      {b}
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ color: palette.text, fontSize: theme.tokens.typography.bodySize }} className="leading-relaxed opacity-80">
                  {slide.body || 'Add your content here...'}
                </p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="slide-stage origin-top-left select-text"
      style={{
        transform: `scale(${scale})`,
        backgroundColor: palette.bg,
        borderRadius: theme.tokens.radii,
      }}
    >
      {renderSlideContent()}
    </div>
  );
}
