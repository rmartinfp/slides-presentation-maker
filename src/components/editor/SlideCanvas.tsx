import React, { useCallback } from 'react';
import { Slide, PresentationTheme, SlideElement } from '@/types/presentation';
import { useEditorStore } from '@/stores/editor-store';
import CanvasElement from './CanvasElement';
import AlignmentGuides from './AlignmentGuides';

interface Props {
  slide: Slide;
  theme: PresentationTheme;
  scale?: number;
  isEditing?: boolean;
  /** Legacy callback — only used by SlideList thumbnail preview */
  onUpdateSlide?: (slide: Slide) => void;
}

export default function SlideCanvas({
  slide,
  theme,
  scale = 1,
  isEditing = false,
}: Props) {
  const { palette } = theme.tokens;
  const {
    selectedElementIds,
    setSelectedElementIds,
    toggleElementSelection,
    clearSelection,
  } = useEditorStore();

  // Determine background CSS
  const bgStyle: React.CSSProperties = {};
  if (slide.background) {
    switch (slide.background.type) {
      case 'solid':
        bgStyle.backgroundColor = slide.background.value;
        break;
      case 'gradient':
        bgStyle.background = slide.background.value;
        break;
      case 'image':
        bgStyle.backgroundImage = `url(${slide.background.value})`;
        bgStyle.backgroundSize = 'cover';
        bgStyle.backgroundPosition = 'center';
        break;
    }
  } else {
    bgStyle.backgroundColor = palette.bg;
  }

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on the canvas background
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  const handleSelect = useCallback(
    (id: string, multi: boolean) => {
      if (multi) {
        toggleElementSelection(id);
      } else {
        setSelectedElementIds([id]);
      }
    },
    [setSelectedElementIds, toggleElementSelection],
  );

  // Sort elements by zIndex for rendering
  const sortedElements = [...(slide.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

  const activeElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  return (
    <div
      className="slide-stage origin-top-left select-text relative"
      style={{
        transform: `scale(${scale})`,
        borderRadius: theme.tokens.radii,
        ...bgStyle,
      }}
      onClick={isEditing ? handleCanvasClick : undefined}
    >
      {isEditing && (
        <AlignmentGuides
          elements={slide.elements || []}
          activeElementId={activeElementId}
        />
      )}

      {sortedElements.map((element: SlideElement) => (
        isEditing ? (
          <CanvasElement
            key={element.id}
            element={element}
            scale={scale}
            isSelected={selectedElementIds.includes(element.id)}
            onSelect={handleSelect}
          />
        ) : (
          // Read-only render for thumbnails / presentation mode
          <StaticElement key={element.id} element={element} />
        )
      ))}
    </div>
  );
}

/** Lightweight read-only element renderer (no interact.js) */
function StaticElement({ element }: { element: SlideElement }) {
  const s = element.style;

  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    opacity: element.opacity,
    zIndex: element.zIndex,
    overflow: 'hidden',
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            style={{
              fontFamily: s.fontFamily,
              fontSize: s.fontSize,
              fontWeight: s.fontWeight as React.CSSProperties['fontWeight'],
              fontStyle: s.fontStyle,
              textDecoration: s.textDecoration,
              textAlign: s.textAlign as React.CSSProperties['textAlign'],
              lineHeight: s.lineHeight,
              letterSpacing: s.letterSpacing,
              color: s.color,
              backgroundColor: s.backgroundColor,
              borderRadius: s.borderRadius,
              padding: 8,
              width: '100%',
              height: '100%',
              whiteSpace: element.content.startsWith('<') ? undefined : 'pre-wrap',
              wordBreak: 'break-word',
              overflow: 'hidden',
              opacity: typeof s.opacity === 'number' ? s.opacity : 1,
            }}
            {...(element.content.startsWith('<')
              ? { dangerouslySetInnerHTML: { __html: element.content }, className: 'tiptap-preview' }
              : {}
            )}
          >
            {element.content.startsWith('<') ? undefined : element.content}
          </div>
        );

      case 'shape': {
        const shapeType = s.shapeType || 'rectangle';
        const fill = s.shapeFill || s.backgroundColor || '#6366f1';
        const stroke = s.shapeStroke || 'transparent';
        const strokeWidth = s.shapeStrokeWidth || 0;

        if (shapeType === 'circle') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <ellipse cx="50" cy="50" rx="49" ry="49" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'triangle') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="50,2 98,98 2,98" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'line') {
          return (
            <svg width="100%" height="100%" preserveAspectRatio="none">
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke={fill} strokeWidth={Math.max(strokeWidth, 2)} />
            </svg>
          );
        }
        if (shapeType === 'arrow-right') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none">
              <polygon points="0,15 70,15 70,0 100,30 70,60 70,45 0,45" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: fill,
              borderRadius: s.borderRadius ?? 0,
              border: stroke !== 'transparent' ? `${strokeWidth}px solid ${stroke}` : undefined,
            }}
          />
        );
      }

      case 'image':
        return (
          <img
            src={element.content}
            alt=""
            className="w-full h-full"
            style={{
              objectFit: (s.objectFit as React.CSSProperties['objectFit']) || 'cover',
              borderRadius: s.borderRadius ?? 0,
            }}
            draggable={false}
          />
        );

      default:
        return null;
    }
  };

  return <div style={wrapperStyle}>{renderContent()}</div>;
}
