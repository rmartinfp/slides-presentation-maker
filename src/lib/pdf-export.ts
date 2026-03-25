import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Presentation, ChartData, TableData } from '@/types/presentation';

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

// ---------------------------------------------------------------------------
// Helpers: chart SVG rendering
// ---------------------------------------------------------------------------

function renderBarChartSvg(chart: ChartData, w: number, h: number): string {
  const padding = { top: 40, right: 20, bottom: 50, left: 60 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;
  const { data, dataKeys, nameKey, colors, title, unit } = chart;

  // Compute max value across all dataKeys
  let maxVal = 0;
  for (const row of data) {
    for (const key of dataKeys) {
      const v = Number(row[key]) || 0;
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 1;

  const groupCount = data.length;
  const barGroupWidth = plotW / groupCount;
  const barWidth = (barGroupWidth * 0.7) / dataKeys.length;
  const barGap = barGroupWidth * 0.3 / (dataKeys.length + 1);

  let bars = '';
  let labels = '';

  for (let gi = 0; gi < groupCount; gi++) {
    const row = data[gi];
    const groupX = padding.left + gi * barGroupWidth;
    // X-axis label
    const labelX = groupX + barGroupWidth / 2;
    labels += `<text x="${labelX}" y="${h - 10}" text-anchor="middle" font-size="14" fill="#555">${String(row[nameKey] ?? '')}</text>`;

    for (let di = 0; di < dataKeys.length; di++) {
      const val = Number(row[dataKeys[di]]) || 0;
      const barH = (val / maxVal) * plotH;
      const x = groupX + barGap * (di + 1) + barWidth * di;
      const y = padding.top + plotH - barH;
      const color = colors[di % colors.length] || '#6366f1';
      bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" rx="2"/>`;
    }
  }

  // Y-axis ticks
  let yTicks = '';
  const tickCount = 5;
  for (let t = 0; t <= tickCount; t++) {
    const val = Math.round((maxVal / tickCount) * t);
    const y = padding.top + plotH - (t / tickCount) * plotH;
    yTicks += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#888">${val}${unit || ''}</text>`;
    yTicks += `<line x1="${padding.left}" y1="${y}" x2="${w - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
  }

  const titleSvg = title
    ? `<text x="${w / 2}" y="24" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${escapeXml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:#fff;border-radius:4px">${titleSvg}${yTicks}${bars}${labels}</svg>`;
}

function renderLineChartSvg(chart: ChartData, w: number, h: number): string {
  const padding = { top: 40, right: 20, bottom: 50, left: 60 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;
  const { data, dataKeys, nameKey, colors, title, unit } = chart;

  let maxVal = 0;
  for (const row of data) {
    for (const key of dataKeys) {
      const v = Number(row[key]) || 0;
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 1;

  let lines = '';
  let dots = '';
  const groupCount = data.length;

  for (let di = 0; di < dataKeys.length; di++) {
    const color = colors[di % colors.length] || '#6366f1';
    const points: string[] = [];
    for (let gi = 0; gi < groupCount; gi++) {
      const val = Number(data[gi][dataKeys[di]]) || 0;
      const x = padding.left + (gi / Math.max(groupCount - 1, 1)) * plotW;
      const y = padding.top + plotH - (val / maxVal) * plotH;
      points.push(`${x},${y}`);
      dots += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
    }
    lines += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`;
  }

  // X-axis labels
  let labels = '';
  for (let gi = 0; gi < groupCount; gi++) {
    const x = padding.left + (gi / Math.max(groupCount - 1, 1)) * plotW;
    labels += `<text x="${x}" y="${h - 10}" text-anchor="middle" font-size="14" fill="#555">${String(data[gi][nameKey] ?? '')}</text>`;
  }

  // Y-axis ticks
  let yTicks = '';
  const tickCount = 5;
  for (let t = 0; t <= tickCount; t++) {
    const val = Math.round((maxVal / tickCount) * t);
    const y = padding.top + plotH - (t / tickCount) * plotH;
    yTicks += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#888">${val}${unit || ''}</text>`;
    yTicks += `<line x1="${padding.left}" y1="${y}" x2="${w - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
  }

  const titleSvg = title
    ? `<text x="${w / 2}" y="24" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${escapeXml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:#fff;border-radius:4px">${titleSvg}${yTicks}${lines}${dots}${labels}</svg>`;
}

function renderPieChartSvg(chart: ChartData, w: number, h: number): string {
  const { data, dataKeys, nameKey, colors, title } = chart;
  const cx = w / 2;
  const cy = h / 2 + (title ? 10 : 0);
  const r = Math.min(w, h) / 2 - 60;

  const key = dataKeys[0] || 'value';
  let total = 0;
  for (const row of data) total += Number(row[key]) || 0;
  if (total === 0) total = 1;

  let slices = '';
  let legendItems = '';
  let startAngle = -Math.PI / 2;

  for (let i = 0; i < data.length; i++) {
    const val = Number(data[i][key]) || 0;
    const sliceAngle = (val / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const color = colors[i % colors.length] || `hsl(${(i * 60) % 360}, 65%, 55%)`;

    if (data.length === 1) {
      slices += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
    } else {
      slices += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}"/>`;
    }

    // Legend
    const ly = h - 30 + (i >= 4 ? 18 : 0);
    const lx = 20 + (i % 4) * (w / 4);
    legendItems += `<rect x="${lx}" y="${ly - 10}" width="12" height="12" fill="${color}" rx="2"/>`;
    legendItems += `<text x="${lx + 16}" y="${ly}" font-size="12" fill="#555">${escapeXml(String(data[i][nameKey] ?? ''))}</text>`;

    startAngle = endAngle;
  }

  const titleSvg = title
    ? `<text x="${w / 2}" y="24" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${escapeXml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:#fff;border-radius:4px">${titleSvg}${slices}${legendItems}</svg>`;
}

function renderAreaChartSvg(chart: ChartData, w: number, h: number): string {
  const padding = { top: 40, right: 20, bottom: 50, left: 60 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;
  const { data, dataKeys, nameKey, colors, title, unit } = chart;

  let maxVal = 0;
  for (const row of data) {
    for (const key of dataKeys) {
      const v = Number(row[key]) || 0;
      if (v > maxVal) maxVal = v;
    }
  }
  if (maxVal === 0) maxVal = 1;

  let areas = '';
  const groupCount = data.length;

  for (let di = 0; di < dataKeys.length; di++) {
    const color = colors[di % colors.length] || '#6366f1';
    const points: string[] = [];
    for (let gi = 0; gi < groupCount; gi++) {
      const val = Number(data[gi][dataKeys[di]]) || 0;
      const x = padding.left + (gi / Math.max(groupCount - 1, 1)) * plotW;
      const y = padding.top + plotH - (val / maxVal) * plotH;
      points.push(`${x},${y}`);
    }
    const baseline = padding.top + plotH;
    const firstX = padding.left;
    const lastX = padding.left + plotW;
    areas += `<polygon points="${firstX},${baseline} ${points.join(' ')} ${lastX},${baseline}" fill="${color}" opacity="0.3"/>`;
    areas += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`;
  }

  // X-axis labels
  let labels = '';
  for (let gi = 0; gi < groupCount; gi++) {
    const x = padding.left + (gi / Math.max(groupCount - 1, 1)) * plotW;
    labels += `<text x="${x}" y="${h - 10}" text-anchor="middle" font-size="14" fill="#555">${String(data[gi][nameKey] ?? '')}</text>`;
  }

  // Y-axis ticks
  let yTicks = '';
  const tickCount = 5;
  for (let t = 0; t <= tickCount; t++) {
    const val = Math.round((maxVal / tickCount) * t);
    const y = padding.top + plotH - (t / tickCount) * plotH;
    yTicks += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#888">${val}${unit || ''}</text>`;
    yTicks += `<line x1="${padding.left}" y1="${y}" x2="${w - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
  }

  const titleSvg = title
    ? `<text x="${w / 2}" y="24" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${escapeXml(title)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:#fff;border-radius:4px">${titleSvg}${yTicks}${areas}${labels}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Preload images to avoid blank renders
// ---------------------------------------------------------------------------

function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve();
          img.onerror = () => resolve(); // don't block on broken images
          img.src = url;
        }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Main off-screen PDF export
// ---------------------------------------------------------------------------

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

  // Collect all image URLs for preloading
  const imageUrls: string[] = [];
  for (const slide of presentation.slides) {
    if (slide.background?.type === 'image') imageUrls.push(slide.background.value);
    for (const el of slide.elements || []) {
      if (el.type === 'image' && el.content) imageUrls.push(el.content);
    }
  }
  await preloadImages(imageUrls);

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
        const st = el.style;
        const elDiv = document.createElement('div');
        elDiv.style.cssText = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;opacity:${el.opacity};z-index:${el.zIndex};overflow:hidden;`;
        if (el.rotation) elDiv.style.transform = `rotate(${el.rotation}deg)`;

        // Box shadow (applies to all element types)
        if (st.boxShadow) {
          elDiv.style.boxShadow = st.boxShadow;
        }

        // ---- TEXT ----
        if (el.type === 'text') {
          elDiv.style.fontFamily = st.fontFamily ? `${st.fontFamily}, sans-serif` : 'sans-serif';
          elDiv.style.fontSize = `${(st.fontSize || 24) * 2.666}px`;
          elDiv.style.fontWeight = st.fontWeight || 'normal';
          elDiv.style.fontStyle = st.fontStyle || 'normal';
          elDiv.style.color = st.color || '#000';
          elDiv.style.textAlign = (st.textAlign as string) || 'left';
          elDiv.style.lineHeight = String(st.lineHeight || 1.4);
          elDiv.style.padding = '8px';
          elDiv.style.wordBreak = 'break-word';
          elDiv.style.overflowWrap = 'break-word';

          // Text background fill
          if (st.backgroundColor) {
            elDiv.style.backgroundColor = st.backgroundColor;
          }
          if (st.backgroundGradient) {
            elDiv.style.background = st.backgroundGradient;
          }

          // Border on text boxes
          if (st.borderColor && st.borderWidth) {
            elDiv.style.border = `${st.borderWidth}px ${st.borderStyle || 'solid'} ${st.borderColor}`;
          }
          if (st.borderRadius) {
            elDiv.style.borderRadius = `${st.borderRadius}px`;
          }

          if (el.content.startsWith('<')) {
            elDiv.style.whiteSpace = 'normal';
            elDiv.innerHTML = el.content;
          } else {
            elDiv.style.whiteSpace = 'pre-wrap';
            elDiv.textContent = el.content;
          }

        // ---- IMAGE ----
        } else if (el.type === 'image') {
          const img = document.createElement('img');
          img.src = el.content;
          img.crossOrigin = 'anonymous';

          const fit = st.objectFit || 'cover';
          let pos = st.objectPosition || 'center center';
          if (!st.objectPosition && fit === 'cover') {
            const cropT = (st.srcRectTop as number) || 0;
            const cropR = (st.srcRectRight as number) || 0;
            const cropB = (st.srcRectBottom as number) || 0;
            const cropL = (st.srcRectLeft as number) || 0;
            if (cropT || cropR || cropB || cropL) {
              pos = `${(cropL + (100 - cropR)) / 2}% ${(cropT + (100 - cropB)) / 2}%`;
            }
          }
          elDiv.style.overflow = 'hidden';
          elDiv.style.borderRadius = `${st.borderRadius || 0}px`;

          // Image border
          if (st.borderColor && st.borderWidth) {
            elDiv.style.border = `${st.borderWidth}px ${st.borderStyle || 'solid'} ${st.borderColor}`;
          }

          img.style.cssText = `width:100%;height:100%;object-fit:${fit};object-position:${pos};`;
          elDiv.appendChild(img);

        // ---- SHAPE ----
        } else if (el.type === 'shape') {
          const fill = st.shapeFill || st.backgroundColor || '#6366f1';
          const shapeType = st.shapeType || 'rectangle';
          const stroke = st.shapeStroke || 'transparent';
          const strokeWidth = st.shapeStrokeWidth || 0;

          if (shapeType === 'custom' && st.svgPath) {
            // Render custom SVG shapes properly
            const svgNs = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNs, 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('viewBox', (st.svgViewBox as string) || '0 0 100 100');
            svg.setAttribute('preserveAspectRatio', 'none');
            const path = document.createElementNS(svgNs, 'path');
            path.setAttribute('d', st.svgPath as string);
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
            const headEnd = (st as Record<string, unknown>)?.lineHeadEnd as string | undefined;
            const tailEnd = (st as Record<string, unknown>)?.lineTailEnd as string | undefined;
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
            if (st.shapeStrokeDash) line.setAttribute('stroke-dasharray', st.shapeStrokeDash as string);
            if (headEnd && headEnd !== 'none') line.setAttribute('marker-start', 'url(#pdf-h)');
            if (tailEnd && tailEnd !== 'none') line.setAttribute('marker-end', 'url(#pdf-t)');
            svg.appendChild(line);
            elDiv.appendChild(svg);
          } else {
            elDiv.style.backgroundColor = fill;
            elDiv.style.borderRadius = `${st.borderRadius || 0}px`;
            if (stroke !== 'transparent') {
              elDiv.style.border = `${strokeWidth}px solid ${stroke}`;
            }
          }

        // ---- TABLE ----
        } else if (el.type === 'table') {
          let tableData: TableData;
          try {
            tableData = JSON.parse(el.content) as TableData;
          } catch {
            // Fallback: show raw content
            elDiv.textContent = el.content;
            slideDiv.appendChild(elDiv);
            continue;
          }

          const borderColor = tableData.borderColor || '#d1d5db';
          const table = document.createElement('table');
          table.style.cssText = `width:100%;height:100%;border-collapse:collapse;table-layout:fixed;font-family:${st.fontFamily ? `${st.fontFamily}, sans-serif` : 'sans-serif'};`;

          for (let ri = 0; ri < tableData.rows.length; ri++) {
            const row = tableData.rows[ri];
            const tr = document.createElement('tr');
            const isHeader = tableData.headerRow && ri === 0;

            for (const cell of row) {
              const td = document.createElement(isHeader ? 'th' : 'td');
              td.style.cssText = `
                border:1px solid ${borderColor};
                padding:8px 12px;
                font-size:${((st.fontSize || 16) * 2.666)}px;
                text-align:${cell.align || 'left'};
                color:${cell.color || st.color || '#333'};
                background-color:${cell.bg || (isHeader ? '#f3f4f6' : 'transparent')};
                font-weight:${cell.bold || isHeader ? 'bold' : 'normal'};
                vertical-align:middle;
                overflow:hidden;
                word-break:break-word;
              `;
              td.textContent = cell.text;
              tr.appendChild(td);
            }
            table.appendChild(tr);
          }

          // Background fill for table container
          if (st.backgroundColor) {
            elDiv.style.backgroundColor = st.backgroundColor;
          }
          if (st.borderRadius) {
            elDiv.style.borderRadius = `${st.borderRadius}px`;
          }

          elDiv.appendChild(table);

        // ---- CHART ----
        } else if (el.type === 'chart') {
          let chartData: ChartData;
          try {
            chartData = JSON.parse(el.content) as ChartData;
          } catch {
            elDiv.textContent = el.content;
            slideDiv.appendChild(elDiv);
            continue;
          }

          let svgHtml: string;
          switch (chartData.chartType) {
            case 'bar':
              svgHtml = renderBarChartSvg(chartData, el.width, el.height);
              break;
            case 'line':
              svgHtml = renderLineChartSvg(chartData, el.width, el.height);
              break;
            case 'pie':
              svgHtml = renderPieChartSvg(chartData, el.width, el.height);
              break;
            case 'area':
              svgHtml = renderAreaChartSvg(chartData, el.width, el.height);
              break;
            default:
              svgHtml = renderBarChartSvg(chartData, el.width, el.height);
          }

          // Background fill for chart container
          if (st.backgroundColor) {
            elDiv.style.backgroundColor = st.backgroundColor;
          }
          if (st.borderRadius) {
            elDiv.style.borderRadius = `${st.borderRadius}px`;
          }
          if (st.borderColor && st.borderWidth) {
            elDiv.style.border = `${st.borderWidth}px ${st.borderStyle || 'solid'} ${st.borderColor}`;
          }

          elDiv.innerHTML = svgHtml;
        }

        slideDiv.appendChild(elDiv);
      }

      container.appendChild(slideDiv);

      // Wait for images to load (increased from 100ms)
      await new Promise(resolve => setTimeout(resolve, 500));

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
