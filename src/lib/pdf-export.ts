import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Presentation } from '@/types/presentation';

/**
 * Export presentation as PDF by rendering each slide to canvas then assembling pages.
 */
export async function exportToPdf(
  presentation: Presentation,
  renderSlide: (index: number) => HTMLElement | null,
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080],
  });

  for (let i = 0; i < presentation.slides.length; i++) {
    const element = renderSlide(i);
    if (!element) continue;

    const canvas = await html2canvas(element, {
      width: 1920,
      height: 1080,
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) pdf.addPage([1920, 1080], 'landscape');
    pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
  }

  pdf.save(`${sanitizeFilename(presentation.title)}.pdf`);
}

/**
 * Simplified PDF export — renders from a single off-screen container.
 * Creates a hidden div, renders each slide, captures, removes.
 */
export async function exportToPdfFromSlides(presentation: Presentation): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080],
  });

  // Create off-screen container
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1920px;height:1080px;overflow:hidden;';
  document.body.appendChild(container);

  try {
    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = presentation.slides[i];

      // Build slide HTML
      container.innerHTML = '';
      const slideDiv = document.createElement('div');
      slideDiv.style.cssText = `width:1920px;height:1080px;position:relative;overflow:hidden;`;

      // Background
      if (slide.background) {
        if (slide.background.type === 'solid') {
          slideDiv.style.backgroundColor = slide.background.value;
        } else if (slide.background.type === 'gradient') {
          slideDiv.style.background = slide.background.value;
        } else if (slide.background.type === 'image') {
          slideDiv.style.backgroundImage = `url(${slide.background.value})`;
          slideDiv.style.backgroundSize = 'cover';
        }
      }

      // Elements
      for (const el of (slide.elements || []).sort((a, b) => a.zIndex - b.zIndex)) {
        const elDiv = document.createElement('div');
        elDiv.style.cssText = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;opacity:${el.opacity};z-index:${el.zIndex};overflow:hidden;`;
        if (el.rotation) elDiv.style.transform = `rotate(${el.rotation}deg)`;

        if (el.type === 'text') {
          const s = el.style;
          elDiv.style.fontFamily = s.fontFamily ? `${s.fontFamily}, sans-serif` : 'sans-serif';
          elDiv.style.fontSize = `${(s.fontSize || 24) * 2.666}px`;
          elDiv.style.fontWeight = s.fontWeight || 'normal';
          elDiv.style.fontStyle = s.fontStyle || 'normal';
          elDiv.style.color = s.color || '#000';
          elDiv.style.textAlign = (s.textAlign as string) || 'left';
          elDiv.style.lineHeight = String(s.lineHeight || 1.4);
          elDiv.style.padding = '8px';
          elDiv.style.wordBreak = 'break-word';
          elDiv.style.overflowWrap = 'break-word';

          if (el.content.startsWith('<')) {
            elDiv.style.whiteSpace = 'normal';
            elDiv.innerHTML = el.content;
          } else {
            elDiv.style.whiteSpace = 'pre-wrap';
            elDiv.textContent = el.content;
          }
        } else if (el.type === 'image') {
          const img = document.createElement('img');
          img.src = el.content;
          img.crossOrigin = 'anonymous';

          // srcRect crop from PPTX import
          const cropT = (el.style.srcRectTop as number) || 0;
          const cropR = (el.style.srcRectRight as number) || 0;
          const cropB = (el.style.srcRectBottom as number) || 0;
          const cropL = (el.style.srcRectLeft as number) || 0;
          const hasCrop = cropT > 0 || cropR > 0 || cropB > 0 || cropL > 0;

          if (hasCrop) {
            const scaleX = 100 / (1 - cropL / 100 - cropR / 100);
            const scaleY = 100 / (1 - cropT / 100 - cropB / 100);
            elDiv.style.overflow = 'hidden';
            elDiv.style.borderRadius = `${el.style.borderRadius || 0}px`;
            img.style.cssText = `width:${scaleX}%;height:${scaleY}%;transform:translate(-${cropL}%,-${cropT}%);object-fit:fill;`;
          } else {
            img.style.cssText = `width:100%;height:100%;object-fit:${el.style.objectFit || 'cover'};border-radius:${el.style.borderRadius || 0}px;`;
          }
          elDiv.appendChild(img);
        } else if (el.type === 'shape') {
          const fill = el.style.shapeFill || el.style.backgroundColor || '#6366f1';
          const shapeType = el.style.shapeType || 'rectangle';
          const stroke = el.style.shapeStroke || 'transparent';
          const strokeWidth = el.style.shapeStrokeWidth || 0;

          if (shapeType === 'custom' && el.style.svgPath) {
            // Render custom SVG shapes properly
            const svgNs = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNs, 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', el.style.svgViewBox || '0 0 100 100');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            const path = document.createElementNS(svgNs, 'path');
            path.setAttribute('d', el.style.svgPath as string);
            path.setAttribute('fill', fill);
            path.setAttribute('fill-rule', 'evenodd');
            if (stroke !== 'transparent') {
              path.setAttribute('stroke', stroke);
              path.setAttribute('stroke-width', String(strokeWidth));
            }
            svg.appendChild(path);
            elDiv.appendChild(svg);
          } else if (shapeType === 'circle') {
            elDiv.style.borderRadius = '50%';
            elDiv.style.backgroundColor = fill;
          } else if (shapeType === 'line') {
            const svgNs = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNs, 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            const isVert = el.height > el.width * 2;
            const lineColor = fill !== 'transparent' ? fill : stroke;
            const lineSW = Math.max(strokeWidth, 2);
            const headEnd = (el.style as any)?.lineHeadEnd;
            const tailEnd = (el.style as any)?.lineTailEnd;
            const ms = Math.max(lineSW * 2.5, 6);
            const addMarker = (id: string, t: string | undefined) => {
              if (!t || t === 'none') return;
              const r = ms / lineSW, h = r / 2;
              const marker = document.createElementNS(svgNs, 'marker');
              marker.setAttribute('id', id); marker.setAttribute('markerWidth', String(r));
              marker.setAttribute('markerHeight', String(r)); marker.setAttribute('refX', String(h));
              marker.setAttribute('refY', String(h)); marker.setAttribute('orient', 'auto-start-reverse');
              marker.setAttribute('markerUnits', 'strokeWidth');
              if (t === 'arrow' || t === 'triangle') {
                const p = document.createElementNS(svgNs, 'polygon');
                p.setAttribute('points', `0,0 ${r},${h} 0,${r}`); p.setAttribute('fill', lineColor);
                marker.appendChild(p);
              } else if (t === 'stealth') {
                const p = document.createElementNS(svgNs, 'polygon');
                p.setAttribute('points', `0,0 ${r},${h} 0,${r} ${r*0.3},${h}`); p.setAttribute('fill', lineColor);
                marker.appendChild(p);
              } else if (t === 'oval') {
                const c = document.createElementNS(svgNs, 'circle');
                c.setAttribute('cx', String(h)); c.setAttribute('cy', String(h));
                c.setAttribute('r', String(h * 0.8)); c.setAttribute('fill', lineColor);
                marker.appendChild(c);
              } else if (t === 'diamond') {
                const p = document.createElementNS(svgNs, 'polygon');
                p.setAttribute('points', `${h},0 ${r},${h} ${h},${r} 0,${h}`); p.setAttribute('fill', lineColor);
                marker.appendChild(p);
              }
              let defs = svg.querySelector('defs');
              if (!defs) { defs = document.createElementNS(svgNs, 'defs'); svg.appendChild(defs); }
              defs.appendChild(marker);
            };
            addMarker('pdf-h', headEnd); addMarker('pdf-t', tailEnd);
            const line = document.createElementNS(svgNs, 'line');
            if (isVert) {
              line.setAttribute('x1', '50%'); line.setAttribute('y1', '0');
              line.setAttribute('x2', '50%'); line.setAttribute('y2', '100%');
            } else {
              line.setAttribute('x1', '0'); line.setAttribute('y1', '50%');
              line.setAttribute('x2', '100%'); line.setAttribute('y2', '50%');
            }
            line.setAttribute('stroke', lineColor);
            line.setAttribute('stroke-width', String(lineSW));
            if (el.style.shapeStrokeDash) line.setAttribute('stroke-dasharray', el.style.shapeStrokeDash);
            if (headEnd && headEnd !== 'none') line.setAttribute('marker-start', 'url(#pdf-h)');
            if (tailEnd && tailEnd !== 'none') line.setAttribute('marker-end', 'url(#pdf-t)');
            svg.appendChild(line);
            elDiv.appendChild(svg);
          } else {
            elDiv.style.backgroundColor = fill;
            elDiv.style.borderRadius = `${el.style.borderRadius || 0}px`;
            if (stroke !== 'transparent') {
              elDiv.style.border = `${strokeWidth}px solid ${stroke}`;
            }
          }
        }

        slideDiv.appendChild(elDiv);
      }

      container.appendChild(slideDiv);

      // Wait a beat for images to load
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(slideDiv, {
        width: 1920,
        height: 1080,
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) pdf.addPage([1920, 1080], 'landscape');
      pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
    }

    pdf.save(`${sanitizeFilename(presentation.title)}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50) || 'presentation';
}
