import React, { useRef, useEffect, useState, useCallback } from 'react';
import interact from 'interactjs';
import { SlideElement } from '@/types/presentation';
import { useEditorStore } from '@/stores/editor-store';
import { cn } from '@/lib/utils';
import RichTextEditor from './RichTextEditor';
import { useAutoShrink } from '@/hooks/useAutoShrink';
import { resolveConnectorPosition } from '@/lib/connector-utils';

/** Render SVG marker definitions for line endpoints (arrow, oval, diamond, stealth) */
function renderMarkerDefs(id: string, type: string | undefined, color: string, size: number, sw: number) {
  if (!type || type === 'none') return null;
  const ref = size / sw;
  const half = ref / 2;
  if (type === 'arrow' || type === 'triangle') {
    return (
      <marker id={`marker-${id}`} markerWidth={ref} markerHeight={ref} refX={half} refY={half} orient="auto-start-reverse" markerUnits="strokeWidth">
        <polygon points={`0,0 ${ref},${half} 0,${ref}`} fill={color} />
      </marker>
    );
  }
  if (type === 'stealth') {
    return (
      <marker id={`marker-${id}`} markerWidth={ref} markerHeight={ref} refX={half} refY={half} orient="auto-start-reverse" markerUnits="strokeWidth">
        <polygon points={`0,0 ${ref},${half} 0,${ref} ${ref * 0.3},${half}`} fill={color} />
      </marker>
    );
  }
  if (type === 'oval') {
    return (
      <marker id={`marker-${id}`} markerWidth={ref} markerHeight={ref} refX={half} refY={half} orient="auto-start-reverse" markerUnits="strokeWidth">
        <circle cx={half} cy={half} r={half * 0.8} fill={color} />
      </marker>
    );
  }
  if (type === 'diamond') {
    return (
      <marker id={`marker-${id}`} markerWidth={ref} markerHeight={ref} refX={half} refY={half} orient="auto-start-reverse" markerUnits="strokeWidth">
        <polygon points={`${half},0 ${ref},${half} ${half},${ref} 0,${half}`} fill={color} />
      </marker>
    );
  }
  return null;
}

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
    width: Math.max(1, element.width),
    height: Math.max(1, element.height),
    overflow: isEditing ? 'visible' : 'hidden', // visible when editing so FormattingToolbar above element isn't clipped
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    opacity: element.opacity,
    zIndex: isEditing ? 9999 : element.zIndex,
    cursor: isEditing ? 'text' : element.locked ? 'default' : 'move',
    touchAction: 'none',
    userSelect: isEditing ? 'text' : 'none',
    // Critical: prevent browser default drag behavior
    WebkitUserDrag: 'none' as any,
    boxShadow: element.style.boxShadow || undefined,
    filter: element.style.filter || undefined,
  };

  // Auto-shrink for text elements (hook must be at top level, not inside switch)
  // Uses CSS transform: scale() so it works with inline font-size styles too
  const baseFontPx = (element.style.fontSize ?? 12) * 2.666;
  const { containerRef: shrinkRef, scale: shrinkScale } = useAutoShrink(baseFontPx, element.content);

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
        // Ensure sans-serif fallback so missing Google Fonts don't render as serif
        const fontFamily = s.fontFamily
          ? (s.fontFamily.includes('sans-serif') ? s.fontFamily : `${s.fontFamily}, sans-serif`)
          : 'sans-serif';
        const textStyle: React.CSSProperties = {
          fontFamily,
          fontSize: baseFontPx,
          fontWeight: s.fontWeight as React.CSSProperties['fontWeight'],
          fontStyle: s.fontStyle,
          textDecoration: s.textDecoration,
          textAlign: s.textAlign as React.CSSProperties['textAlign'],
          lineHeight: s.lineHeight || 1.4,
          letterSpacing: s.letterSpacing,
          color: s.color,
          backgroundColor: s.backgroundColor,
          borderRadius: s.borderRadius,
          padding: 8,
          width: shrinkScale < 1 ? `${100 / shrinkScale}%` : '100%',
          height: shrinkScale < 1 ? `${100 / shrinkScale}%` : '100%',
          display: vAlign ? 'flex' : undefined,
          flexDirection: vAlign ? 'column' : undefined,
          justifyContent: vAlign === 'center' ? 'center' : vAlign === 'bottom' ? 'flex-end' : vAlign === 'top' ? 'flex-start' : undefined,
          outline: 'none',
          // NO overflow:hidden here — wrapper handles clipping.
          // The text div must allow scrollHeight > clientHeight for auto-shrink to detect overflow.
          whiteSpace: isHtml ? undefined : 'pre-wrap', overflowWrap: 'break-word',
          wordBreak: 'break-word',
          opacity: typeof s.opacity === 'number' ? s.opacity : 1,
          pointerEvents: isEditing ? 'auto' : 'none',
          // Use CSS transform to shrink — works with inline font-size styles
          transform: shrinkScale < 1 ? `scale(${shrinkScale})` : undefined,
          transformOrigin: shrinkScale < 1 ? 'top left' : undefined,
        };

        return isHtml ? (
          <div
            ref={shrinkRef}
            style={textStyle}
            className="focus:outline-none tiptap-preview"
            dangerouslySetInnerHTML={{ __html: element.content }}
          />
        ) : (
          <div ref={shrinkRef} style={textStyle} className="focus:outline-none">
            {element.content}
          </div>
        );
      }

      case 'shape': {
        const shapeType = s.shapeType || 'rectangle';
        const fill = s.shapeGradient ? 'url(#grad)' : (s.shapeFill || s.backgroundColor || '#6366f1');
        const stroke = s.shapeStroke || 'transparent';
        const strokeWidth = s.shapeStrokeWidth || 0;
        const dashArray = s.shapeStrokeDash as string | undefined;

        const svgStyle: React.CSSProperties = { pointerEvents: 'none' };
        // Skip stroke rendering when fill === stroke (same color = invisible stroke)
        // or when shapes are tiny (< 15px) — stroke distorts small decorative elements
        const effectiveStroke = (stroke === fill || stroke === 'transparent' || Math.min(element.width, element.height) < 15) ? 'none' : stroke;
        const strokeProps = { stroke: effectiveStroke, strokeWidth: effectiveStroke !== 'none' ? strokeWidth : 0, strokeDasharray: dashArray || undefined };

        // Gradient definition (reusable across shape types)
        const gradDef = s.shapeGradient ? (() => {
          // Parse CSS gradient to SVG: linear-gradient(Xdeg, #c1 0%, #c2 100%)
          const m = (s.shapeGradient as string).match(/linear-gradient\((\d+)deg,\s*(.*)\)/);
          if (!m) return null;
          const angle = parseInt(m[1]);
          const rad = (angle - 90) * Math.PI / 180;
          const stops = m[2].split(',').map(s => s.trim());
          return (
            <defs>
              <linearGradient id="grad" x1={`${50 - 50 * Math.cos(rad)}%`} y1={`${50 - 50 * Math.sin(rad)}%`} x2={`${50 + 50 * Math.cos(rad)}%`} y2={`${50 + 50 * Math.sin(rad)}%`}>
                {stops.map((stop, i) => {
                  const parts = stop.match(/(#[A-Fa-f0-9]+|rgb[^)]+\))\s*(\d+)%/);
                  if (!parts) return null;
                  let stopColor = parts[1];
                  let stopOpacity = 1;
                  // Handle 8-digit hex (#RRGGBBAA) — extract alpha for SVG stop-opacity
                  if (stopColor.length === 9 && stopColor.startsWith('#')) {
                    stopOpacity = parseInt(stopColor.slice(7, 9), 16) / 255;
                    stopColor = stopColor.slice(0, 7);
                  }
                  return <stop key={i} offset={`${parts[2]}%`} stopColor={stopColor} stopOpacity={stopOpacity} />;
                })}
              </linearGradient>
            </defs>
          );
        })() : null;

        if (shapeType === 'circle') {
          // Small circles: use CSS border-radius for pixel-perfect rendering
          // SVG viewBox="0 0 100 100" can't render accurately at < 20px
          if (Math.min(element.width, element.height) < 20) {
            return (
              <div className="w-full h-full pointer-events-none" style={{
                borderRadius: '50%',
                backgroundColor: fill !== 'transparent' ? fill : undefined,
                border: effectiveStroke !== 'none' ? `${strokeWidth}px solid ${effectiveStroke}` : undefined,
              }} />
            );
          }
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <ellipse cx="50" cy="50" rx="49" ry="49" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'triangle') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <polygon points="50,2 98,98 2,98" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'line') {
          const lineStroke = s.shapeFill || stroke;
          const lineSW = Math.max(strokeWidth, 2);
          const headType = s.lineHeadEnd as string | undefined;
          const tailType = s.lineTailEnd as string | undefined;
          const markerSize = Math.max(lineSW * 2.5, 6);
          const mStart = headType && headType !== 'none' ? 'url(#marker-head)' : undefined;
          const mEnd = tailType && tailType !== 'none' ? 'url(#marker-tail)' : undefined;

          // Connector: use resolved endpoints for diagonal lines
          if (element.connector) {
            const pos = resolveConnectorPosition(element.connector, useEditorStore.getState().presentation.slides[useEditorStore.getState().activeSlideIndex]?.elements || []);
            const lx1 = pos ? pos.x1 : 0;
            const ly1 = pos ? pos.y1 : 0;
            const lx2 = pos ? pos.x2 : element.width;
            const ly2 = pos ? pos.y2 : element.height;
            return (
              <svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`} preserveAspectRatio="none" style={svgStyle}>
                <defs>
                  {renderMarkerDefs('head', headType, lineStroke, markerSize, lineSW)}
                  {renderMarkerDefs('tail', tailType, lineStroke, markerSize, lineSW)}
                </defs>
                <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke={lineStroke} strokeWidth={lineSW} strokeDasharray={dashArray || undefined} markerStart={mStart} markerEnd={mEnd} />
              </svg>
            );
          }

          // Regular line: horizontal or vertical
          const isVertical = element.height > element.width * 2;
          return (
            <svg width="100%" height="100%" preserveAspectRatio="none" style={svgStyle}>
              <defs>
                {renderMarkerDefs('head', headType, lineStroke, markerSize, lineSW)}
                {renderMarkerDefs('tail', tailType, lineStroke, markerSize, lineSW)}
              </defs>
              {isVertical ? (
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke={lineStroke} strokeWidth={lineSW} strokeDasharray={dashArray || undefined} markerStart={mStart} markerEnd={mEnd} />
              ) : (
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke={lineStroke} strokeWidth={lineSW} strokeDasharray={dashArray || undefined} markerStart={mStart} markerEnd={mEnd} />
              )}
            </svg>
          );
        }
        if (shapeType === 'arrow-right') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <polygon points="0,15 70,15 70,0 100,30 70,60 70,45 0,45" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'arrow-left') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <polygon points="100,15 30,15 30,0 0,30 30,60 30,45 100,45" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'arrow-up') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 60 100" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <polygon points="30,0 60,30 45,30 45,100 15,100 15,30 0,30" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'arrow-down') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 60 100" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <polygon points="15,0 45,0 45,70 60,70 30,100 0,70 15,70" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'star') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <polygon points="50,2 63,38 98,38 70,60 80,95 50,75 20,95 30,60 2,38 37,38" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'pentagon') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <polygon points="50,2 97,36 79,96 21,96 3,36" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'hexagon') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <polygon points="25,2 75,2 98,50 75,98 25,98 2,50" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        if (shapeType === 'heart') {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <path d="M50,88 C25,65 2,50 2,30 C2,12 18,2 32,2 C40,2 46,6 50,14 C54,6 60,2 68,2 C82,2 98,12 98,30 C98,50 75,65 50,88Z" fill={fill} {...strokeProps} />
            </svg>
          );
        }
        // Custom SVG path — use xMidYMid meet to preserve icon proportions
        if (shapeType === 'custom' && s.svgPath) {
          return (
            <svg width="100%" height="100%" viewBox={s.svgViewBox || '0 0 100 100'} preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }}>
              {gradDef}
              <path d={s.svgPath} fill={fill} fillRule="evenodd" {...strokeProps} vectorEffect="non-scaling-stroke" />
            </svg>
          );
        }
        // Default rectangle
        return (
          <div
            className="w-full h-full pointer-events-none"
            style={{
              background: s.shapeGradient as string || fill,
              borderRadius: s.borderRadius ?? 0,
              border: stroke !== 'transparent' ? `${strokeWidth}px ${dashArray ? 'dashed' : 'solid'} ${stroke}` : undefined,
            }}
          />
        );
      }

      case 'image': {
        const br = s.borderRadius ?? 0;
        const imgBorder = s.borderColor && s.borderWidth
          ? `${s.borderWidth}px solid ${s.borderColor}` : undefined;

        // srcRect crop from PPTX import — show only a portion of the source image
        const cropT = (s.srcRectTop as number) || 0;
        const cropR = (s.srcRectRight as number) || 0;
        const cropB = (s.srcRectBottom as number) || 0;
        const cropL = (s.srcRectLeft as number) || 0;
        const hasCrop = cropT > 0 || cropR > 0 || cropB > 0 || cropL > 0;

        if (hasCrop) {
          const scaleX = 100 / (1 - cropL / 100 - cropR / 100);
          const scaleY = 100 / (1 - cropT / 100 - cropB / 100);
          return (
            <div
              className="w-full h-full pointer-events-none"
              style={{ borderRadius: br, overflow: 'hidden', border: imgBorder }}
            >
              <img
                src={element.content}
                alt=""
                style={{
                  width: `${scaleX}%`,
                  height: `${scaleY}%`,
                  transform: `translate(-${cropL}%, -${cropT}%)`,
                  objectFit: 'fill',
                }}
                draggable={false}
              />
            </div>
          );
        }

        return (
          <div
            className="w-full h-full pointer-events-none"
            style={{ borderRadius: br, overflow: br ? 'hidden' : undefined, border: imgBorder }}
          >
            <img
              src={element.content}
              alt=""
              className="w-full h-full"
              style={{ objectFit: s.objectFit || 'cover' }}
              draggable={false}
            />
          </div>
        );
      }

      case 'table': {
        let tableData: import('@/types/presentation').TableData;
        try { tableData = JSON.parse(element.content); } catch { tableData = { rows: [[{ text: '' }]] }; }
        const bColor = tableData.borderColor || '#e2e8f0';
        const cellPad = Math.max(4, element.height / tableData.rows.length * 0.15);
        const cellFontPx = s.fontSize ? s.fontSize : Math.max(10, element.height / tableData.rows.length * 0.45);
        const borderRad = s.borderRadius ?? 8;
        const numRows = tableData.rows.length;
        const numCols = tableData.rows[0]?.length || 1;

        const handleCellDoubleClick = (ri: number, ci: number) => {
          const td = document.querySelector(`[data-table-cell="${element.id}-${ri}-${ci}"]`) as HTMLElement;
          if (!td) return;
          td.contentEditable = 'true';
          td.focus();
          // Select all text
          const range = document.createRange();
          range.selectNodeContents(td);
          window.getSelection()?.removeAllRanges();
          window.getSelection()?.addRange(range);
        };

        const handleCellBlur = (ri: number, ci: number, e: React.FocusEvent<HTMLTableCellElement>) => {
          e.currentTarget.contentEditable = 'false';
          const newText = e.currentTarget.textContent || '';
          const newRows = tableData.rows.map((row, rri) =>
            row.map((cell, cci) => rri === ri && cci === ci ? { ...cell, text: newText } : cell)
          );
          updateElement(element.id, { content: JSON.stringify({ ...tableData, rows: newRows }) });
        };

        const cornerRadius = (ri: number, ci: number) => {
          if (!borderRad) return undefined;
          const isTopLeft = ri === 0 && ci === 0;
          const isTopRight = ri === 0 && ci === numCols - 1;
          const isBottomLeft = ri === numRows - 1 && ci === 0;
          const isBottomRight = ri === numRows - 1 && ci === numCols - 1;
          if (isTopLeft) return `${borderRad}px 0 0 0`;
          if (isTopRight) return `0 ${borderRad}px 0 0`;
          if (isBottomLeft) return `0 0 0 ${borderRad}px`;
          if (isBottomRight) return `0 0 ${borderRad}px 0`;
          return undefined;
        };

        return (
          <table className="w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', borderRadius: borderRad, overflow: 'hidden' }}>
            <tbody>
              {tableData.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      data-table-cell={`${element.id}-${ri}-${ci}`}
                      onDoubleClick={(e) => { e.stopPropagation(); handleCellDoubleClick(ri, ci); }}
                      onBlur={(e) => handleCellBlur(ri, ci, e)}
                      onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); const nextCi = (ci + 1) % numCols; const nextRi = ci + 1 >= numCols ? ri + 1 : ri; if (nextRi < numRows) handleCellDoubleClick(nextRi, nextCi); } e.stopPropagation(); }}
                      style={{
                        border: `1px solid ${bColor}`,
                        padding: cellPad,
                        fontSize: cellFontPx,
                        fontWeight: (tableData.headerRow && ri === 0) || cell.bold ? 'bold' : 'normal',
                        textAlign: cell.align || 'left',
                        backgroundColor: cell.bg || (tableData.headerRow && ri === 0 ? '#f1f5f9' : 'transparent'),
                        color: cell.color || '#1e293b',
                        overflow: 'hidden',
                        lineHeight: 1.3,
                        fontFamily: 'sans-serif',
                        borderRadius: cornerRadius(ri, ci),
                        outline: 'none',
                        cursor: 'text',
                      }}
                      suppressContentEditableWarning
                    >
                      {cell.text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
        isSelected && Math.min(element.width, element.height) >= 15 && 'ring-2 ring-[#4F46E5] ring-offset-0',
        element.locked && 'opacity-90',
      )}
      data-element-id={element.id}
      data-tiny={Math.min(element.width, element.height) < 15 ? 'true' : undefined}
    >
      {renderContent()}

      {/* Contextual toolbar — floats above selected non-text elements (text uses FormattingToolbar) */}
      {isSelected && !isEditing && element.type !== 'text' && !element.locked && (
        <ElementContextBar element={element} scale={scale} />
      )}

      {/* Resize handles — visual only, interact.js handles the actual resize */}
      {/* Hide handles on tiny elements (< 15px) — handles are 10px each, would dwarf the element */}
      {isSelected && !element.locked && !isEditing && Math.min(element.width, element.height) >= 15 && (
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

/** Contextual toolbar that floats above selected non-text elements */
function ElementContextBar({ element, scale }: { element: SlideElement; scale: number }) {
  const { updateElement, deleteElements, duplicateElements, bringToFront, sendToBack } = useEditorStore();
  const s = element.style;

  const btn = 'w-7 h-7 flex items-center justify-center rounded-md transition-colors';
  const btnNormal = `${btn} text-slate-600 hover:bg-slate-100`;
  const btnDanger = `${btn} text-red-500 hover:bg-red-50`;

  return (
    <div
      className="absolute z-[200] flex items-center gap-0.5 px-2 py-1 bg-white rounded-xl shadow-2xl border border-slate-200"
      style={{
        transform: `scale(${1 / scale})`,
        transformOrigin: 'bottom left',
        bottom: '100%',
        left: 0,
        marginBottom: 8 / scale,
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <button onClick={() => duplicateElements()} className={btnNormal} title="Duplicate">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      </button>
      <button onClick={() => deleteElements()} className={btnDanger} title="Delete">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </button>
      <button onClick={() => bringToFront(element.id)} className={btnNormal} title="Front">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
      <button onClick={() => sendToBack(element.id)} className={btnNormal} title="Back">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </button>

      {element.type === 'image' && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          {(['cover', 'contain', 'fill'] as const).map(fit => (
            <button key={fit} onClick={() => updateElement(element.id, { style: { objectFit: fit } })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.objectFit === fit ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>{fit}</button>
          ))}
        </>
      )}

      {element.type === 'shape' && s.shapeType !== 'line' && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <input type="color" value={s.shapeFill || '#6366f1'}
            onChange={e => updateElement(element.id, { style: { shapeFill: e.target.value } })}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Fill" />
        </>
      )}
    </div>
  );
}
