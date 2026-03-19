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
  const { moveElement, resizeElement, pushSnapshot } = useEditorStore();
  const [isEditing, setIsEditing] = useState(false);
  const updateElement = useEditorStore(s => s.updateElement);

  // interact.js drag + resize setup — disable during text editing
  useEffect(() => {
    if (!ref.current || element.locked || isEditing) return;

    const interactable = interact(ref.current)
      .draggable({
        inertia: false,
        modifiers: [
          interact.modifiers.snap({
            targets: [interact.snappers.grid({ x: 10, y: 10 })],
            range: 20,
            relativePoints: [{ x: 0, y: 0 }],
          }),
        ],
        listeners: {
          start: () => pushSnapshot(),
          move: (event) => {
            const dx = event.dx / scale;
            const dy = event.dy / scale;
            moveElement(element.id, element.x + dx, element.y + dy);
          },
        },
      })
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 40, height: 20 },
          }),
        ],
        inertia: false,
        listeners: {
          start: () => pushSnapshot(),
          move: (event) => {
            const dw = event.deltaRect.width / scale;
            const dh = event.deltaRect.height / scale;
            const dl = event.deltaRect.left / scale;
            const dt = event.deltaRect.top / scale;
            resizeElement(
              element.id,
              element.width + dw,
              element.height + dh,
              element.x + dl,
              element.y + dt,
            );
          },
        },
      });

    return () => {
      interactable.unset();
    };
  }, [element.id, element.locked, element.x, element.y, element.width, element.height, scale, isEditing, moveElement, resizeElement, pushSnapshot]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
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

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      updateElement(element.id, { content: e.currentTarget.textContent || '' });
    },
    [element.id, updateElement],
  );

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
    cursor: element.locked ? 'default' : 'move',
    touchAction: 'none',
    userSelect: isEditing ? 'text' : 'none',
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

        // Read-only display — render HTML if content is HTML, otherwise plain text
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
        // Default rectangle
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
        return <div className="w-full h-full bg-gray-200 rounded" />;
    }
  };

  return (
    <div
      ref={ref}
      style={wrapperStyle}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'canvas-element group',
        isSelected && 'ring-2 ring-blue-500 ring-offset-0',
        element.locked && 'opacity-90',
      )}
      data-element-id={element.id}
    >
      {renderContent()}

      {/* Resize handles — only show when selected and not locked */}
      {isSelected && !element.locked && !isEditing && (
        <>
          {/* Corner handles */}
          {(['nw', 'ne', 'sw', 'se'] as const).map((pos) => {
            const posStyles: Record<string, React.CSSProperties> = {
              nw: { top: -4, left: -4, cursor: 'nwse-resize' },
              ne: { top: -4, right: -4, cursor: 'nesw-resize' },
              sw: { bottom: -4, left: -4, cursor: 'nesw-resize' },
              se: { bottom: -4, right: -4, cursor: 'nwse-resize' },
            };
            return (
              <div
                key={pos}
                className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm z-50"
                style={posStyles[pos]}
              />
            );
          })}
          {/* Edge handles */}
          {(['n', 's', 'e', 'w'] as const).map((pos) => {
            const posStyles: Record<string, React.CSSProperties> = {
              n: { top: -3, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize', width: 20, height: 6 },
              s: { bottom: -3, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize', width: 20, height: 6 },
              e: { right: -3, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize', width: 6, height: 20 },
              w: { left: -3, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize', width: 6, height: 20 },
            };
            return (
              <div
                key={pos}
                className="absolute bg-white border-2 border-blue-500 rounded-sm z-50"
                style={posStyles[pos]}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
