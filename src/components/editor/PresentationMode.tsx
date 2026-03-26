import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Slide, PresentationTheme, SlideElement, ChartData } from '@/types/presentation';
import ChartRenderer from './ChartRenderer';

interface Props {
  slides: Slide[];
  theme: PresentationTheme;
  startIndex?: number;
  onExit: () => void;
}

export default function PresentationMode({ slides, theme, startIndex = 0, onExit }: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [direction, setDirection] = useState(0);
  const { palette } = theme.tokens;
  const slide = slides[currentIndex];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        if (currentIndex < slides.length - 1) {
          setDirection(1);
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          setDirection(-1);
          setCurrentIndex(prev => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, slides.length, onExit]);

  // Enter fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // Compute background style
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

  const renderElement = (element: SlideElement) => {
    const s = element.style;
    // Scale from 1920x1080 to viewport using vw/vh
    const scaleX = 100 / 1920; // vw per px
    const scaleY = 100 / 1080; // vh per px

    const wrapperStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${element.x * scaleX}vw`,
      top: `${element.y * scaleY}vh`,
      width: `${element.width * scaleX}vw`,
      height: `${element.height * scaleY}vh`,
      transform: [
        element.rotation ? `rotate(${element.rotation}deg)` : '',
        element.style.flipH ? 'scaleX(-1)' : '',
        element.style.flipV ? 'scaleY(-1)' : '',
      ].filter(Boolean).join(' ') || undefined,
      opacity: element.opacity,
      zIndex: element.zIndex,
      overflow: 'hidden',
    };

    switch (element.type) {
      case 'text': {
        const vAlign = s.verticalAlign;
        return (
          <div key={element.id} style={wrapperStyle}>
            <div
              style={{
                fontFamily: s.fontFamily ? (s.fontFamily.includes('sans-serif') ? s.fontFamily : `${s.fontFamily}, sans-serif`) : 'sans-serif',
                fontSize: `${(s.fontSize ?? 24) * 2.666 * scaleX}vw`,
                fontWeight: s.fontWeight as React.CSSProperties['fontWeight'],
                fontStyle: s.fontStyle,
                textDecoration: s.textDecoration,
                textAlign: s.textAlign as React.CSSProperties['textAlign'],
                lineHeight: s.lineHeight || 1.4,
                color: s.color,
                padding: `${8 * scaleX}vw`,
                width: '100%',
                height: '100%',
                display: vAlign ? 'flex' : undefined,
                flexDirection: vAlign ? 'column' : undefined,
                justifyContent: vAlign === 'center' ? 'center' : vAlign === 'bottom' ? 'flex-end' : vAlign === 'top' ? 'flex-start' : undefined,
                wordBreak: 'break-word',
                whiteSpace: element.content.startsWith('<') ? undefined : 'pre-wrap', overflowWrap: 'break-word',
                overflow: 'hidden',
                opacity: typeof s.opacity === 'number' ? s.opacity : 1,
              }}
              className={element.content.startsWith('<') ? 'tiptap-preview' : undefined}
              dangerouslySetInnerHTML={
                element.content.startsWith('<')
                  ? { __html: element.content }
                  : undefined
              }
            >
              {element.content.startsWith('<') ? undefined : element.content}
            </div>
          </div>
        );
      }

      case 'shape': {
        const fillColor = s.shapeFill || s.backgroundColor || '#6366f1';
        const fill = s.shapeGradient ? 'url(#grad)' : fillColor;
        const stroke = s.shapeStroke || 'transparent';
        const sw = s.shapeStrokeWidth || 0;
        const shapeType = s.shapeType || 'rectangle';
        const da = s.shapeStrokeDash as string | undefined;
        const sp = { stroke, strokeWidth: sw, strokeDasharray: da || undefined };

        const renderShape = () => {
          if (shapeType === 'circle') {
            const vw = Math.round(element.width); const vh = Math.round(element.height); const esw = sp.stroke === 'transparent' ? 0 : sw;
            return <svg width="100%" height="100%" viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="none"><ellipse cx={vw/2} cy={vh/2} rx={vw/2-esw} ry={vh/2-esw} fill={fill} {...sp} vectorEffect="non-scaling-stroke" /></svg>;
          }
          if (shapeType === 'triangle') return <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,2 98,98 2,98" fill={fill} {...sp} /></svg>;
          if (shapeType === 'line') {
            const isVert = element.height > element.width * 2;
            const lineSW = Math.max(sw, 2);
            const headT = (element.style as any)?.lineHeadEnd;
            const tailT = (element.style as any)?.lineTailEnd;
            const ms = Math.max(lineSW * 2.5, 6);
            const mkr = (mid: string, t: string | undefined) => {
              if (!t || t === 'none') return null;
              const r = ms / lineSW, h = r / 2;
              if (t === 'arrow' || t === 'triangle') return <marker id={`p-${mid}`} markerWidth={r} markerHeight={r} refX={h} refY={h} orient="auto-start-reverse" markerUnits="strokeWidth"><polygon points={`0,0 ${r},${h} 0,${r}`} fill={fillColor}/></marker>;
              if (t === 'stealth') return <marker id={`p-${mid}`} markerWidth={r} markerHeight={r} refX={h} refY={h} orient="auto-start-reverse" markerUnits="strokeWidth"><polygon points={`0,0 ${r},${h} 0,${r} ${r*0.3},${h}`} fill={fillColor}/></marker>;
              if (t === 'oval') return <marker id={`p-${mid}`} markerWidth={r} markerHeight={r} refX={h} refY={h} orient="auto-start-reverse" markerUnits="strokeWidth"><circle cx={h} cy={h} r={h*0.8} fill={fillColor}/></marker>;
              if (t === 'diamond') return <marker id={`p-${mid}`} markerWidth={r} markerHeight={r} refX={h} refY={h} orient="auto-start-reverse" markerUnits="strokeWidth"><polygon points={`${h},0 ${r},${h} ${h},${r} 0,${h}`} fill={fillColor}/></marker>;
              return null;
            };
            return <svg width="100%" height="100%" preserveAspectRatio="none">
              <defs>{mkr('h', headT)}{mkr('t', tailT)}</defs>
              {isVert
                ? <line x1="50%" y1="0" x2="50%" y2="100%" stroke={fillColor} strokeWidth={lineSW} strokeDasharray={da || undefined} markerStart={headT && headT !== 'none' ? 'url(#p-h)' : undefined} markerEnd={tailT && tailT !== 'none' ? 'url(#p-t)' : undefined} />
                : <line x1="0" y1="50%" x2="100%" y2="50%" stroke={fillColor} strokeWidth={lineSW} strokeDasharray={da || undefined} markerStart={headT && headT !== 'none' ? 'url(#p-h)' : undefined} markerEnd={tailT && tailT !== 'none' ? 'url(#p-t)' : undefined} />}
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
          const svgPathData = s.svgPath || (shapeType === 'custom' && element.content ? element.content : null);
          if (shapeType === 'custom' && svgPathData) return <svg width="100%" height="100%" viewBox={s.svgViewBox || '0 0 100 100'} preserveAspectRatio="none"><path d={svgPathData} fill={fill} fillRule="evenodd" {...sp} vectorEffect="non-scaling-stroke" /></svg>;
          return <div className="w-full h-full" style={{ background: s.shapeGradient as string || fillColor, borderRadius: s.borderRadius ?? 0, border: stroke !== 'transparent' ? `${sw}px ${da ? 'dashed' : 'solid'} ${stroke}` : undefined }} />;
        };

        return (
          <div key={element.id} style={{ ...wrapperStyle, boxShadow: s.boxShadow || undefined }}>
            {renderShape()}
          </div>
        );
      }

      case 'image': {
        const br = s.borderRadius ?? 0;
        const imgBorder = s.borderColor && s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : undefined;

        const fit = (s.objectFit as React.CSSProperties['objectFit']) || 'cover';
        let pos = s.objectPosition || 'center center';
        if (!s.objectPosition && fit === 'cover') {
          const cropT = (s.srcRectTop as number) || 0;
          const cropR = (s.srcRectRight as number) || 0;
          const cropB = (s.srcRectBottom as number) || 0;
          const cropL = (s.srcRectLeft as number) || 0;
          if (cropT || cropR || cropB || cropL) {
            pos = `${(cropL + (100 - cropR)) / 2}% ${(cropT + (100 - cropB)) / 2}%`;
          }
        }

        return (
          <div key={element.id} style={{ ...wrapperStyle, borderRadius: br, overflow: 'hidden', border: imgBorder, boxShadow: s.boxShadow || undefined, filter: s.filter || undefined }}>
            <img src={element.content} alt="" className="w-full h-full"
              style={{ objectFit: fit, objectPosition: pos }} />
          </div>
        );
      }

      case 'table': {
        let td: import('@/types/presentation').TableData;
        try { td = JSON.parse(element.content); } catch { td = { rows: [[{ text: '' }]] }; }
        const bc = td.borderColor || '#e2e8f0';
        const cp = Math.max(4, element.height / td.rows.length * 0.15);
        const cf = Math.max(10, element.height / td.rows.length * 0.45);
        return (
          <div key={element.id} style={{ ...wrapperStyle, boxShadow: s.boxShadow || undefined }}>
            <table className="w-full h-full" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
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
          </div>
        );
      }

      case 'chart': {
        let chartConfig: ChartData;
        try { chartConfig = JSON.parse(element.content); } catch { return null; }
        return (
          <div key={element.id} style={{ ...wrapperStyle, borderRadius: s.borderRadius ?? 0 }}>
            <ChartRenderer config={chartConfig} interactive />
          </div>
        );
      }

      default:
        return null;
    }
  };

  const sortedElements = [...(slide.elements || [])].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all opacity-0 hover:opacity-100"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Slide */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute inset-0"
          style={bgStyle}
        >
          {sortedElements.map(renderElement)}
        </motion.div>
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center gap-4 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity">
        <span className="text-white/70 text-sm font-mono">
          {currentIndex + 1} / {slides.length}
        </span>
        <div className="flex gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
              className={`h-1.5 rounded-full transition-all ${
                i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
