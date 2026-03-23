import React, { useCallback, useState, useRef } from 'react';
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
        // Auto-select entire group when clicking a grouped element
        const clicked = slide.elements?.find(e => e.id === id);
        if (clicked?.groupId) {
          const groupIds = slide.elements.filter(e => e.groupId === clicked.groupId).map(e => e.id);
          setSelectedElementIds(groupIds);
        } else {
          setSelectedElementIds([id]);
        }
      }
    },
    [setSelectedElementIds, toggleElementSelection, slide.elements],
  );

  // Sort elements by zIndex for rendering
  const sortedElements = [...(slide.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

  const activeElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;

  // ---- Marquee (drag-to-select) ----
  const stageRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isEditing) return;
    // Don't start marquee if clicking on a canvas element (they handle their own selection)
    const target = e.target as HTMLElement;
    if (target.closest('.canvas-element')) return;
    e.preventDefault();
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    isDragging.current = true;
    setMarquee({ x1: x, y1: y, x2: x, y2: y });
    if (!e.shiftKey) clearSelection();
  }, [isEditing, scale, clearSelection]);

  // Use window-level listeners so dragging outside canvas still works
  React.useEffect(() => {
    if (!isEditing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      setMarquee(prev => prev ? { ...prev, x2: x, y2: y } : null);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setMarquee(prev => {
        if (!prev) return null;
        const left = Math.min(prev.x1, prev.x2);
        const right = Math.max(prev.x1, prev.x2);
        const top = Math.min(prev.y1, prev.y2);
        const bottom = Math.max(prev.y1, prev.y2);

        if (right - left > 5 || bottom - top > 5) {
          const intersecting = (slide.elements || [])
            .filter(el => !el.locked &&
              !(el.x + el.width < left || el.x > right || el.y + el.height < top || el.y > bottom)
            )
            .map(el => el.id);
          if (intersecting.length > 0) {
            setSelectedElementIds(intersecting);
          }
        }
        return null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEditing, scale, slide.elements, setSelectedElementIds]);

  // Marquee box style
  const marqueeStyle: React.CSSProperties | null = marquee ? {
    position: 'absolute',
    left: Math.min(marquee.x1, marquee.x2),
    top: Math.min(marquee.y1, marquee.y2),
    width: Math.abs(marquee.x2 - marquee.x1),
    height: Math.abs(marquee.y2 - marquee.y1),
    border: '1.5px dashed #4F46E5',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderRadius: 2,
    pointerEvents: 'none',
    zIndex: 9999,
  } : null;

  return (
    <div
      ref={stageRef}
      className="slide-stage origin-top-left select-text relative"
      style={{
        transform: `scale(${scale})`,
        borderRadius: theme.tokens.radii,
        ...bgStyle,
      }}
      onClick={isEditing ? handleCanvasClick : undefined}
      onMouseDown={isEditing ? handleMouseDown : undefined}
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
          <StaticElement key={element.id} element={element} />
        )
      ))}

      {/* Contextual toolbar — rendered at canvas level so it's not clipped by element overflow */}
      {isEditing && selectedElementIds.length === 1 && (() => {
        const el = slide.elements?.find(e => e.id === selectedElementIds[0]);
        if (!el || el.type === 'text' || el.locked) return null;
        return (
          <div
            className="absolute z-[200] flex items-center gap-0.5 px-2 py-1 bg-white rounded-xl shadow-2xl border border-slate-200 pointer-events-auto"
            style={{
              left: el.x,
              top: Math.max(2, el.y - 44 / scale),
              transform: `scale(${1 / scale})`,
              transformOrigin: 'bottom left',
            }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <ContextToolbar element={el} />
          </div>
        );
      })()}

      {/* Marquee selection box */}
      {marqueeStyle && <div style={marqueeStyle} />}
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
    boxShadow: s.boxShadow || undefined,
    filter: s.filter || undefined,
  };

  const renderContent = () => {
    switch (element.type) {
      case 'text': {
        const vAlign = s.verticalAlign;
        const fontFamily = s.fontFamily
          ? (s.fontFamily.includes('sans-serif') ? s.fontFamily : `${s.fontFamily}, sans-serif`)
          : 'sans-serif';
        return (
          <div
            style={{
              fontFamily,
              fontSize: (s.fontSize ?? 12) * 2.666,
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
              width: '100%',
              height: '100%',
              display: vAlign ? 'flex' : undefined,
              flexDirection: vAlign ? 'column' : undefined,
              justifyContent: vAlign === 'center' ? 'center' : vAlign === 'bottom' ? 'flex-end' : vAlign === 'top' ? 'flex-start' : undefined,
              whiteSpace: element.content.startsWith('<') ? undefined : 'pre-wrap', overflowWrap: 'break-word',
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
      }

      case 'shape': {
        const shapeType = s.shapeType || 'rectangle';
        const fillColor = s.shapeFill || s.backgroundColor || '#6366f1';
        // SVG shapes can't use CSS gradients — for thumbnails, fall back to first color
        const fill = fillColor;
        const stroke = s.shapeStroke || 'transparent';
        const strokeWidth = s.shapeStrokeWidth || 0;
        const da = s.shapeStrokeDash as string | undefined;
        const effectiveStroke = (stroke === fill || stroke === 'transparent' || Math.min(element.width, element.height) < 15) ? 'none' : stroke;
        const sp = { stroke: effectiveStroke, strokeWidth: effectiveStroke !== 'none' ? strokeWidth : 0, strokeDasharray: da || undefined };

        if (shapeType === 'circle') {
          if (Math.min(element.width, element.height) < 20) {
            return <div className="w-full h-full" style={{ borderRadius: '50%', backgroundColor: fill !== 'transparent' ? fill : undefined, border: effectiveStroke !== 'none' ? `${strokeWidth}px solid ${effectiveStroke}` : undefined }} />;
          }
          return <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="49" ry="49" fill={fill} {...sp} /></svg>;
        }
        if (shapeType === 'triangle') return <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,2 98,98 2,98" fill={fill} {...sp} /></svg>;
        if (shapeType === 'line') {
          const isVert = element.height > element.width * 2;
          const lineSW = Math.max(strokeWidth, 2);
          const headT = (element.style as any)?.lineHeadEnd;
          const tailT = (element.style as any)?.lineTailEnd;
          const ms = Math.max(lineSW * 2.5, 6);
          const mkr = (id: string, t: string | undefined) => {
            if (!t || t === 'none') return null;
            const r = ms / lineSW, h = r / 2;
            if (t === 'arrow' || t === 'triangle') return <marker id={`s-${id}`} markerWidth={r} markerHeight={r} refX={h} refY={h} orient="auto-start-reverse" markerUnits="strokeWidth"><polygon points={`0,0 ${r},${h} 0,${r}`} fill={fillColor}/></marker>;
            if (t === 'stealth') return <marker id={`s-${id}`} markerWidth={r} markerHeight={r} refX={h} refY={h} orient="auto-start-reverse" markerUnits="strokeWidth"><polygon points={`0,0 ${r},${h} 0,${r} ${r*0.3},${h}`} fill={fillColor}/></marker>;
            if (t === 'oval') return <marker id={`s-${id}`} markerWidth={r} markerHeight={r} refX={h} refY={h} orient="auto-start-reverse" markerUnits="strokeWidth"><circle cx={h} cy={h} r={h*0.8} fill={fillColor}/></marker>;
            if (t === 'diamond') return <marker id={`s-${id}`} markerWidth={r} markerHeight={r} refX={h} refY={h} orient="auto-start-reverse" markerUnits="strokeWidth"><polygon points={`${h},0 ${r},${h} ${h},${r} 0,${h}`} fill={fillColor}/></marker>;
            return null;
          };
          return <svg width="100%" height="100%" preserveAspectRatio="none">
            <defs>{mkr('h', headT)}{mkr('t', tailT)}</defs>
            {isVert
              ? <line x1="50%" y1="0" x2="50%" y2="100%" stroke={fillColor} strokeWidth={lineSW} strokeDasharray={da || undefined} markerStart={headT && headT !== 'none' ? 'url(#s-h)' : undefined} markerEnd={tailT && tailT !== 'none' ? 'url(#s-t)' : undefined} />
              : <line x1="0" y1="50%" x2="100%" y2="50%" stroke={fillColor} strokeWidth={lineSW} strokeDasharray={da || undefined} markerStart={headT && headT !== 'none' ? 'url(#s-h)' : undefined} markerEnd={tailT && tailT !== 'none' ? 'url(#s-t)' : undefined} />}
          </svg>;
        }
        if (shapeType === 'arrow-right') return <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none"><polygon points="0,15 70,15 70,0 100,30 70,60 70,45 0,45" fill={fill} {...sp} /></svg>;
        if (shapeType === 'arrow-left') return <svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none"><polygon points="100,15 30,15 30,0 0,30 30,60 30,45 100,45" fill={fill} {...sp} /></svg>;
        if (shapeType === 'arrow-up') return <svg width="100%" height="100%" viewBox="0 0 60 100" preserveAspectRatio="none"><polygon points="30,0 60,30 45,30 45,100 15,100 15,30 0,30" fill={fill} {...sp} /></svg>;
        if (shapeType === 'arrow-down') return <svg width="100%" height="100%" viewBox="0 0 60 100" preserveAspectRatio="none"><polygon points="15,0 45,0 45,70 60,70 30,100 0,70 15,70" fill={fill} {...sp} /></svg>;
        if (shapeType === 'star') return <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,2 63,38 98,38 70,60 80,95 50,75 20,95 30,60 2,38 37,38" fill={fill} {...sp} /></svg>;
        if (shapeType === 'pentagon') return <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,2 97,36 79,96 21,96 3,36" fill={fill} {...sp} /></svg>;
        if (shapeType === 'hexagon') return <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="25,2 75,2 98,50 75,98 25,98 2,50" fill={fill} {...sp} /></svg>;
        if (shapeType === 'heart') return <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M50,88 C25,65 2,50 2,30 C2,12 18,2 32,2 C40,2 46,6 50,14 C54,6 60,2 68,2 C82,2 98,12 98,30 C98,50 75,65 50,88Z" fill={fill} {...sp} /></svg>;
        if (shapeType === 'custom' && s.svgPath) return <svg width="100%" height="100%" viewBox={s.svgViewBox || '0 0 100 100'} preserveAspectRatio="xMidYMid meet"><path d={s.svgPath} fill={fill} fillRule="evenodd" {...sp} vectorEffect="non-scaling-stroke" /></svg>;
        return (
          <div
            className="w-full h-full"
            style={{
              background: s.shapeGradient as string || fillColor,
              borderRadius: s.borderRadius ?? 0,
              border: stroke !== 'transparent' ? `${strokeWidth}px ${da ? 'dashed' : 'solid'} ${stroke}` : undefined,
            }}
          />
        );
      }

      case 'image': {
        const br = s.borderRadius ?? 0;
        const imgBorder = s.borderColor && s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : undefined;

        // srcRect crop from PPTX import
        const cropT = (s.srcRectTop as number) || 0;
        const cropR = (s.srcRectRight as number) || 0;
        const cropB = (s.srcRectBottom as number) || 0;
        const cropL = (s.srcRectLeft as number) || 0;
        const hasCrop = cropT > 0 || cropR > 0 || cropB > 0 || cropL > 0;

        if (hasCrop) {
          const scaleX = 100 / (1 - cropL / 100 - cropR / 100);
          const scaleY = 100 / (1 - cropT / 100 - cropB / 100);
          return (
            <div className="w-full h-full" style={{ borderRadius: br, overflow: 'hidden', border: imgBorder }}>
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
          <div className="w-full h-full" style={{ borderRadius: br, overflow: br ? 'hidden' : undefined, border: imgBorder }}>
            <img
              src={element.content}
              alt=""
              className="w-full h-full"
              style={{ objectFit: (s.objectFit as React.CSSProperties['objectFit']) || 'cover' }}
              draggable={false}
            />
          </div>
        );
      }

      case 'table': {
        let td: import('@/types/presentation').TableData;
        try { td = JSON.parse(element.content); } catch { td = { rows: [[{ text: '' }]] }; }
        const bc = td.borderColor || '#e2e8f0';
        const cp = Math.max(2, element.height / td.rows.length * 0.12);
        const cf = Math.max(6, element.height / td.rows.length * 0.4);
        const br = s.borderRadius ?? 8;
        return (
          <table className="w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed', borderRadius: br, overflow: 'hidden' }}>
            <tbody>
              {td.rows.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => (
                  <td key={ci} style={{ border: `1px solid ${bc}`, padding: cp, fontSize: cf, fontWeight: (td.headerRow && ri === 0) || cell.bold ? 'bold' : 'normal', textAlign: cell.align || 'left', backgroundColor: cell.bg || (td.headerRow && ri === 0 ? '#f1f5f9' : 'transparent'), color: cell.color || '#1e293b', overflow: 'hidden', lineHeight: 1.3, fontFamily: 'sans-serif' }}>
                    {cell.text}
                  </td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        );
      }

      default:
        return null;
    }
  };

  return <div style={wrapperStyle}>{renderContent()}</div>;
}

/** Contextual toolbar rendered at canvas level (not inside element's overflow) */
function ContextToolbar({ element }: { element: SlideElement }) {
  const { updateElement, deleteElements, duplicateElements, bringToFront, sendToBack } = useEditorStore();
  const s = element.style;
  const btn = 'w-7 h-7 flex items-center justify-center rounded-md transition-colors';

  return (
    <>
      <button onClick={() => duplicateElements()} className={`${btn} text-slate-600 hover:bg-slate-100`} title="Duplicate">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      </button>
      <button onClick={() => deleteElements()} className={`${btn} text-red-500 hover:bg-red-50`} title="Delete">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </button>
      <button onClick={() => bringToFront(element.id)} className={`${btn} text-slate-600 hover:bg-slate-100`} title="Front">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      </button>
      <button onClick={() => sendToBack(element.id)} className={`${btn} text-slate-600 hover:bg-slate-100`} title="Back">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      </button>
      {element.type === 'image' && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          {(['cover', 'contain', 'fill'] as const).map(fit => (
            <button key={fit} onClick={() => updateElement(element.id, { style: { objectFit: fit } })}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.objectFit === fit ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>{fit}</button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <button onClick={() => window.dispatchEvent(new CustomEvent('slideai-open-ai-image'))}
            className={`${btn} text-indigo-600 hover:bg-indigo-50`} title="Recreate with AI">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10l1.4 1.4M3 12h2m14 0h2M5.6 18.4l1.4-1.4m10-10l1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>
          </button>
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
    </>
  );
}
