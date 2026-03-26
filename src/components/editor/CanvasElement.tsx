import React, { useRef, useEffect, useState, useCallback } from 'react';
import interact from 'interactjs';
import { SlideElement } from '@/types/presentation';
import { useEditorStore } from '@/stores/editor-store';
import { cn } from '@/lib/utils';
import RichTextEditor from './RichTextEditor';
// Auto-shrink is now built into RichTextEditor directly
import { resolveConnectorPosition } from '@/lib/connector-utils';
import ChartRenderer from './ChartRenderer';
import type { ChartData } from '@/types/presentation';

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
  const [isCropping, setIsCropping] = useState(false);
  const isDragging = useRef(false);
  const cropStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  // Exit crop mode when deselected
  useEffect(() => {
    if (!isSelected && isCropping) setIsCropping(false);
  }, [isSelected, isCropping]);

  // Use refs to always have latest values without re-running the effect
  const elementRef = useRef(element);
  elementRef.current = element;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const { moveElement, resizeElement, pushSnapshot, updateElement } = useEditorStore();

  // Treat full-canvas background images as locked (they block clicks on text elements)
  const isEffectivelyLocked = element.locked || (
    element.type === 'image' && element.width >= 1900 && element.height >= 1060
  );

  // interact.js setup — only recreate when id, locked, or editing changes
  useEffect(() => {
    const node = ref.current;
    if (!node || isEffectivelyLocked || isEditing || isCropping) return;

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
  }, [element.id, isEffectivelyLocked, isEditing, isCropping, moveElement, resizeElement, pushSnapshot]);

  // Use mousedown for selection — doesn't interfere with interact.js pointer events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // If this element is locked, find the topmost UNLOCKED element at this click position
      // and select that instead. This solves the problem where locked decorative shapes
      // with high z-index sit on top of unlocked text elements with low z-index.
      // CSS pointer-events:none does NOT work for this — it passes clicks to z-index N-1,
      // not to the nearest unlocked element.
      if (isEffectivelyLocked && !isSelected) {
        // Get click position relative to the slide stage (canvas coordinates)
        const stage = (e.currentTarget as HTMLElement).closest('.slide-stage') as HTMLElement;
        if (stage) {
          const rect = stage.getBoundingClientRect();
          const s = scaleRef.current;
          const cx = (e.clientX - rect.left) / s;
          const cy = (e.clientY - rect.top) / s;
          // Find the topmost unlocked element whose bounding box contains the click
          const state = useEditorStore.getState();
          const slide = state.presentation.slides[state.activeSlideIndex];
          const elements = slide?.elements || [];
          const isElLocked = (el: any) => el.locked || (el.type === 'image' && el.width >= 1900 && el.height >= 1060);
          const hit = elements
            .filter(el => !isElLocked(el) && cx >= el.x && cx <= el.x + el.width && cy >= el.y && cy <= el.y + el.height)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
          if (hit) {
            onSelect(hit.id, e.shiftKey);
            e.stopPropagation(); // Prevent stage from clearing selection
            return;
          }
        }
        // No unlocked element found at this position — don't select locked element
        return;
      }
      onSelect(element.id, e.shiftKey);
    },
    [element.id, element.locked, isSelected, onSelect],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Forward double-click on locked elements to unlocked element underneath
      if (element.locked) {
        const stage = (e.currentTarget as HTMLElement).closest('.slide-stage') as HTMLElement;
        if (stage) {
          const rect = stage.getBoundingClientRect();
          const s = scaleRef.current;
          const cx = (e.clientX - rect.left) / s;
          const cy = (e.clientY - rect.top) / s;
          const state = useEditorStore.getState();
          const slide = state.presentation.slides[state.activeSlideIndex];
          const elements = slide?.elements || [];
          const isElLocked = (el: any) => el.locked || (el.type === 'image' && el.width >= 1900 && el.height >= 1060);
          const hit = elements
            .filter(el => !isElLocked(el) && cx >= el.x && cx <= el.x + el.width && cy >= el.y && cy <= el.y + el.height)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
          if (hit) {
            // Select the element and trigger edit mode via DOM
            onSelect(hit.id, false);
            const targetDom = document.querySelector(`[data-element-id="${hit.id}"]`);
            if (targetDom) {
              targetDom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: e.clientX, clientY: e.clientY }));
            }
          }
        }
        return;
      }
      if (element.type === 'text') {
        setIsEditing(true);
        onDoubleClick?.(element.id);
      } else if (element.type === 'image') {
        // Enter crop/pan mode — only useful for cover mode
        const fit = element.style.objectFit || 'cover';
        if (fit === 'cover') {
          setIsCropping(true);
          pushSnapshot();
        }
      } else if (element.type === 'chart') {
        // Open chart editor
        window.dispatchEvent(new CustomEvent('slideai-edit-chart', { detail: element.id }));
      }
    },
    [element.id, element.type, element.style.objectFit, onDoubleClick, pushSnapshot],
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Image crop/pan: exit on click outside or Escape
  useEffect(() => {
    if (!isCropping) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsCropping(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCropping(false);
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isCropping]);

  // Image crop/pan: drag to reposition
  const handleCropMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isCropping) return;
    e.stopPropagation();
    e.preventDefault();
    const s = element.style;
    // Parse current objectPosition to get starting percentages
    const pos = s.objectPosition || '50% 50%';
    const parts = pos.split(/\s+/);
    const posX = parseFloat(parts[0]) || 50;
    const posY = parseFloat(parts[1]) || 50;
    cropStartRef.current = { x: e.clientX, y: e.clientY, posX, posY };

    const handleMove = (ev: MouseEvent) => {
      if (!cropStartRef.current) return;
      const dx = ev.clientX - cropStartRef.current.x;
      const dy = ev.clientY - cropStartRef.current.y;
      // Convert pixel delta to percentage based on element size and scale
      const pctX = (dx / (element.width * scale)) * 100;
      const pctY = (dy / (element.height * scale)) * 100;
      // Moving mouse right → image moves right → objectPosition X decreases
      const newX = Math.max(0, Math.min(100, cropStartRef.current.posX - pctX));
      const newY = Math.max(0, Math.min(100, cropStartRef.current.posY - pctY));
      updateElement(element.id, { style: { objectPosition: `${newX.toFixed(1)}% ${newY.toFixed(1)}%` } });
    };
    const handleUp = () => {
      cropStartRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [isCropping, element.id, element.style, element.width, element.height, scale, updateElement]);

  // Build inline style for the element wrapper
  const wrapperStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: Math.max(1, element.width),
    height: Math.max(1, element.height),
    overflow: isEditing ? 'visible' : 'hidden',
    transform: [
      element.rotation ? `rotate(${element.rotation}deg)` : '',
      element.style.flipH ? 'scaleX(-1)' : '',
      element.style.flipV ? 'scaleY(-1)' : '',
    ].filter(Boolean).join(' ') || undefined,
    opacity: element.opacity,
    zIndex: (isEditing || isCropping) ? 9999 : element.zIndex,
    cursor: isCropping ? 'grab' : isEditing ? 'text' : element.locked ? 'default' : 'move',
    // Locked decorations: keep pointer-events active so they capture clicks,
    // then forward the click to any unlocked element underneath (see handleMouseDown).
    // Using 'none' here is WRONG: CSS pointer-events:none passes clicks to the next
    // element in z-order (another locked element), NOT to unlocked elements with lower z-index.
    pointerEvents: undefined,
    touchAction: 'none',
    userSelect: isEditing ? 'text' : 'none' as const,
    // Critical: prevent browser default drag behavior
    WebkitUserDrag: 'none' as any,
    // Selection indicator — double border (white + indigo) visible on ANY background
    outline: isSelected ? '2px solid #4F46E5' : undefined,
    outlineOffset: isSelected ? '2px' : undefined,
    boxShadow: isSelected
      ? [element.style.boxShadow, '0 0 0 1px rgba(255,255,255,0.9)', '0 0 0 4px rgba(79,70,229,0.7)'].filter(Boolean).join(', ')
      : element.style.boxShadow || undefined,
    filter: element.style.filter || undefined,
  };

  // Auto-shrink is now handled internally by RichTextEditor (no external hook needed)

  // Render element content based on type
  const renderContent = () => {
    const s = element.style;

    switch (element.type) {
      case 'text': {
        // ALWAYS use RichTextEditor for BOTH static and edit modes.
        // This guarantees zero visual difference when toggling edit mode.
        // In static mode: editable=false, no toolbar, no cursor.
        // In edit mode: editable=true, toolbar shown, cursor active.
        return (
          <RichTextEditor
            element={element}
            scale={scale}
            onBlur={handleBlur}
            readOnly={!isEditing}
          />
        );
      }

      case 'shape': {
        const shapeType = s.shapeType || 'rectangle';
        const fill = s.shapeGradient ? 'url(#grad)' : (s.shapeFill || s.backgroundColor || '#6366f1');
        const stroke = s.shapeStroke || 'transparent';
        const strokeWidth = s.shapeStrokeWidth || 0;
        const dashArray = s.shapeStrokeDash as string | undefined;

        const svgStyle: React.CSSProperties = { pointerEvents: 'none' };
        // Only skip stroke when explicitly transparent or width is 0
        const effectiveStroke = (stroke === 'transparent' || stroke === 'none' || !strokeWidth) ? 'none' : stroke;
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
          if (Math.min(element.width, element.height) < 20) {
            return (
              <div className="w-full h-full pointer-events-none" style={{
                borderRadius: '50%',
                backgroundColor: fill !== 'transparent' ? fill : undefined,
                border: effectiveStroke !== 'none' ? `${strokeWidth}px solid ${effectiveStroke}` : undefined,
              }} />
            );
          }
          // Use actual element dimensions as viewBox to avoid stroke distortion
          // with preserveAspectRatio="none" (stroke scales non-uniformly in 100x100 viewBox)
          const vw = Math.round(element.width);
          const vh = Math.round(element.height);
          const sw = effectiveStroke !== 'none' ? strokeWidth : 0;
          return (
            <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none" style={svgStyle}>
              {gradDef}
              <ellipse cx={vw / 2} cy={vh / 2} rx={vw / 2 - sw} ry={vh / 2 - sw} fill={fill} {...strokeProps} vectorEffect="non-scaling-stroke" />
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
        // Custom SVG path — check both style.svgPath and element.content (import stores path in content)
        const svgPathData = s.svgPath || (shapeType === 'custom' && element.content ? element.content : null);
        if (shapeType === 'custom' && svgPathData) {
          return (
            <svg width="100%" height="100%" viewBox={s.svgViewBox || '0 0 100 100'} preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
              {gradDef}
              <path d={svgPathData} fill={fill} fillRule="evenodd" {...strokeProps} vectorEffect="non-scaling-stroke" />
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

        // Derive objectPosition from srcRect (PPTX crop) if no explicit position set
        const fit = (s.objectFit as React.CSSProperties['objectFit']) || 'cover';
        let pos = s.objectPosition || 'center center';
        if (!s.objectPosition && fit === 'cover') {
          const cropT = (s.srcRectTop as number) || 0;
          const cropR = (s.srcRectRight as number) || 0;
          const cropB = (s.srcRectBottom as number) || 0;
          const cropL = (s.srcRectLeft as number) || 0;
          if (cropT || cropR || cropB || cropL) {
            const cx = (cropL + (100 - cropR)) / 2;
            const cy = (cropT + (100 - cropB)) / 2;
            pos = `${cx}% ${cy}%`;
          }
        }

        return (
          <div
            className={cn('w-full h-full', isCropping ? 'pointer-events-auto' : 'pointer-events-none')}
            style={{
              borderRadius: br,
              overflow: 'hidden',
              border: isCropping ? '2px dashed #4F46E5' : imgBorder,
              cursor: isCropping ? 'grab' : undefined,
            }}
            onMouseDown={isCropping ? handleCropMouseDown : undefined}
          >
            <img
              src={element.content}
              alt=""
              className="w-full h-full"
              style={{ objectFit: fit, objectPosition: pos, pointerEvents: 'none' }}
              draggable={false}
            />
            {isCropping && (
              <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
                <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-full">
                  Drag to reposition · Esc to exit
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'table': {
        let tableData: import('@/types/presentation').TableData;
        try { tableData = JSON.parse(element.content); } catch { tableData = { rows: [[{ text: '' }]] }; }
        const bColor = tableData.borderColor || '#e2e8f0';
        const cellPad = Math.max(4, element.height / tableData.rows.length * 0.15);
        const cellFontPx = s.fontSize ? s.fontSize * 2.666 : Math.max(10, element.height / tableData.rows.length * 0.45);
        const tableFontFamily = s.fontFamily ? `${s.fontFamily}, sans-serif` : 'sans-serif';
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
          <table className="w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', borderRadius: borderRad, overflow: 'hidden', fontFamily: tableFontFamily, pointerEvents: 'auto' }}>
            <tbody>
              {tableData.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      data-table-cell={`${element.id}-${ri}-${ci}`}
                      onDoubleClick={(e) => { e.stopPropagation(); handleCellDoubleClick(ri, ci); }}
                      onBlur={(e) => handleCellBlur(ri, ci, e)}
                      onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); const nextCi = (ci + 1) % numCols; const nextRi = ci + 1 >= numCols ? ri + 1 : ri; if (nextRi < numRows) handleCellDoubleClick(nextRi, nextCi); } else if (e.key === 'Escape') { (e.target as HTMLElement).blur(); } }}
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

      case 'chart': {
        let chartConfig: ChartData;
        try { chartConfig = JSON.parse(element.content); } catch { return <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-slate-400 text-xs pointer-events-none">Invalid chart</div>; }
        return (
          <div className="w-full h-full pointer-events-none relative" style={{ borderRadius: s.borderRadius ?? 0 }}>
            <ChartRenderer config={chartConfig} interactive={false} />
            {isSelected && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md shadow-sm text-[10px] text-slate-500 pointer-events-auto cursor-pointer hover:text-[#4F46E5]"
                onClick={() => window.dispatchEvent(new CustomEvent('slideai-edit-chart', { detail: element.id }))}>
                Double-click to edit data
              </div>
            )}
          </div>
        );
      }

      case 'video': {
        return (
          <div className="w-full h-full overflow-hidden pointer-events-none" style={{ borderRadius: s.borderRadius ?? 0 }}>
            <video
              src={element.content}
              autoPlay muted loop playsInline
              className="w-full h-full"
              style={{ objectFit: (s.objectFit as any) || 'cover' }}
            />
          </div>
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
        element.locked && 'opacity-90',
      )}
      data-element-id={element.id}
      data-tiny={Math.min(element.width, element.height) < 15 ? 'true' : undefined}
    >
      {renderContent()}

      {/* Resize handles — visual only, interact.js handles the actual resize */}
      {/* Hide handles on tiny elements (< 15px) — handles are 10px each, would dwarf the element */}
      {isSelected && !element.locked && !isEditing && !isCropping && Math.min(element.width, element.height) >= 15 && (
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

