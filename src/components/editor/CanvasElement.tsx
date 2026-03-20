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
    boxShadow: element.style.boxShadow || undefined,
    filter: element.style.filter || undefined,
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
        const vAlign = s.verticalAlign;
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
          display: vAlign ? 'flex' : undefined,
          flexDirection: vAlign ? 'column' : undefined,
          justifyContent: vAlign === 'center' ? 'center' : vAlign === 'bottom' ? 'flex-end' : vAlign === 'top' ? 'flex-start' : undefined,
          outline: 'none',
          overflow: 'hidden',
          whiteSpace: isHtml ? undefined : 'pre-wrap', overflowWrap: 'break-word',
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
        if (shapeType === 'arrow-left') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" style={svgStyle}>
              <polygon points="100,15 30,15 30,0 0,30 30,60 30,45 100,45" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'arrow-up') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 60 100" preserveAspectRatio="none" style={svgStyle}>
              <polygon points="30,0 60,30 45,30 45,100 15,100 15,30 0,30" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'arrow-down') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 60 100" preserveAspectRatio="none" style={svgStyle}>
              <polygon points="15,0 45,0 45,70 60,70 30,100 0,70 15,70" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'star') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              <polygon points="50,2 63,38 98,38 70,60 80,95 50,75 20,95 30,60 2,38 37,38" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'pentagon') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              <polygon points="50,2 97,36 79,96 21,96 3,36" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'hexagon') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              <polygon points="25,2 75,2 98,50 75,98 25,98 2,50" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        if (shapeType === 'heart') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              <path d="M50,88 C25,65 2,50 2,30 C2,12 18,2 32,2 C40,2 46,6 50,14 C54,6 60,2 68,2 C82,2 98,12 98,30 C98,50 75,65 50,88Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
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
        isSelected && 'ring-2 ring-[#4F46E5] ring-offset-0',
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
