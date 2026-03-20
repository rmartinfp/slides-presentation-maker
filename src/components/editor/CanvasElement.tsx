import React, { useRef, useEffect, useState, useCallback } from 'react';
import interact from 'interactjs';
import { SlideElement } from '@/types/presentation';
import { useEditorStore } from '@/stores/editor-store';
import { cn } from '@/lib/utils';
import RichTextEditor from './RichTextEditor';

interface Props {
  element: SlideElement;
  scale: number;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onDoubleClick?: (id: string) => void;
}

export default function CanvasElement({
  element,
  scale,
  isSelected,
  onSelect,
  onDoubleClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const isDragging = useRef(false);

  // Use refs to always have latest values without re-running the effect
  const elementRef = useRef(element);
  elementRef.current = element;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const { moveElement, resizeElement, pushSnapshot, updateElement } = useEditorStore();

  // interact.js setup — only recreate when id, locked, or editing changes
  useEffect(() => {
    const node = ref.current;
    if (!node || element.locked || isEditing) return;

    // Set low start threshold so drag activates quickly even at small canvas scale
    interact.pointerMoveTolerance(2);

    const interactable = interact(node)
      .styleCursor(false)
      .draggable({
        inertia: false,
        autoScroll: false,
        listeners: {
          start: () => {
            isDragging.current = true;
            pushSnapshot();
          },
          move: (event) => {
            const el = elementRef.current;
            const s = scaleRef.current;
            moveElement(el.id, el.x + event.dx / s, el.y + event.dy / s);
          },
          end: () => {
            isDragging.current = false;
          },
        },
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 20, height: 20 },
          }),
        ],
        inertia: false,
        listeners: {
          start: () => {
            isDragging.current = true;
            pushSnapshot();
          },
          move: (event) => {
            const el = elementRef.current;
            const s = scaleRef.current;
            resizeElement(
              el.id,
              el.width + event.deltaRect.width / s,
              el.height + event.deltaRect.height / s,
              el.x + event.deltaRect.left / s,
              el.y + event.deltaRect.top / s,
            );
          },
          end: () => {
            isDragging.current = false;
          },
        },
      });

    return () => {
      interactable.unset();
    };
  }, [element.id, element.locked, isEditing, moveElement, resizeElement, pushSnapshot]);

  // Use mousedown for selection — doesn't interfere with interact.js pointer events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't interfere with interact.js resize handles
      onSelect(element.id, e.shiftKey);
    },
    [element.id, onSelect],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (element.type === 'text') {
        setIsEditing(true);
        onDoubleClick?.(element.id);
      }
    },
    [element.id, element.type, onDoubleClick],
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Build inline style for the element wrapper
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    opacity: element.opacity,
    zIndex: element.zIndex,
    cursor: isEditing ? 'text' : element.locked ? 'default' : 'move',
    touchAction: 'none',
    userSelect: isEditing ? 'text' : 'none',
    // Critical: prevent browser default drag behavior
    WebkitUserDrag: 'none' as any,
  };

  // Render element content based on type
  const renderContent = () => {
    const s = element.style;

    switch (element.type) {
      case 'text': {
        if (isEditing) {
          return (
            <RichTextEditor
              element={element}
              scale={scale}
              onBlur={handleBlur}
            />
          );
        }

        const isHtml = element.content.startsWith('<');
        const textStyle: React.CSSProperties = {
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
          outline: 'none',
          overflow: 'hidden',
          whiteSpace: isHtml ? undefined : 'pre-wrap',
          wordBreak: 'break-word',
          opacity: typeof s.opacity === 'number' ? s.opacity : 1,
          pointerEvents: isEditing ? 'auto' : 'none', // Let interact.js handle drag; only enable for editing
        };

        return isHtml ? (
          <div
            style={textStyle}
            className="focus:outline-none tiptap-preview"
            dangerouslySetInnerHTML={{ __html: element.content }}
          />
        ) : (
          <div style={textStyle} className="focus:outline-none">
            {element.content}
          </div>
        );
      }

      case 'shape': {
        const shapeType = s.shapeType || 'rectangle';
        const fill = s.shapeFill || s.backgroundColor || '#6366f1';
        const stroke = s.shapeStroke || 'transparent';
        const strokeWidth = s.shapeStrokeWidth || 0;

        const svgStyle: React.CSSProperties = { pointerEvents: 'none' };

        if (shapeType === 'circle') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              <ellipse cx="50" cy="50" rx="49" ry="49" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'triangle') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              <polygon points="50,2 98,98 2,98" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'line') {
          return (
            <svg width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke={fill} strokeWidth={Math.max(strokeWidth, 2)} />
            </svg>
          );
        }
        if (shapeType === 'arrow-right') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" style={svgStyle}>
              <polygon points="0,15 70,15 70,0 100,30 70,60 70,45 0,45" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        // Custom SVG path
        if (shapeType === 'custom' && s.svgPath) {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
              <path d={s.svgPath} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        // Default rectangle
        return (
          <div
            className="w-full h-full pointer-events-none"
            style={{
              backgroundColor: fill,
              borderRadius: s.borderRadius ?? 0,
              border: stroke !== 'transparent' ? `${strokeWidth}px solid ${stroke}` : undefined,
            }}
          />
        );
      }

      case 'image': {
        return (
          <img
            src={element.content}
            alt=""
            className="w-full h-full pointer-events-none"
            style={{
              objectFit: s.objectFit || 'cover',
              borderRadius: s.borderRadius ?? 0,
            }}
            draggable={false}
          />
        );
      }

      default:
        return <div className="w-full h-full bg-gray-200 rounded pointer-events-none" />;
    }
  };

  return (
    <div
      ref={ref}
      style={wrapperStyle}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'canvas-element group',
        isSelected && 'ring-2 ring-blue-500 ring-offset-0',
        element.locked && 'opacity-90',
      )}
      data-element-id={element.id}
    >
      {renderContent()}

      {/* Resize handles — visual only, interact.js handles the actual resize */}
      {isSelected && !element.locked && !isEditing && (
        <>
          {(['nw', 'ne', 'sw', 'se'] as const).map((pos) => {
            const posStyles: Record<string, React.CSSProperties> = {
              nw: { top: -5, left: -5, cursor: 'nwse-resize' },
              ne: { top: -5, right: -5, cursor: 'nesw-resize' },
              sw: { bottom: -5, left: -5, cursor: 'nesw-resize' },
              se: { bottom: -5, right: -5, cursor: 'nwse-resize' },
            };
            return (
              <div
                key={pos}
                className="absolute w-[10px] h-[10px] bg-white border-2 border-blue-500 rounded-full z-50"
                style={posStyles[pos]}
              />
            );
          })}
          {(['n', 's', 'e', 'w'] as const).map((pos) => {
            const posStyles: Record<string, React.CSSProperties> = {
              n: { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize', width: 30, height: 8 },
              s: { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize', width: 30, height: 8 },
              e: { right: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize', width: 8, height: 30 },
              w: { left: -4, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize', width: 8, height: 30 },
            };
            return (
              <div
                key={pos}
                className="absolute bg-white border-2 border-blue-500 rounded-full z-50"
                style={posStyles[pos]}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
