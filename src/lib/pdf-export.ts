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
          elDiv.style.fontFamily = s.fontFamily || 'sans-serif';
          elDiv.style.fontSize = `${s.fontSize || 24}px`;
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
          img.style.cssText = `width:100%;height:100%;object-fit:${el.style.objectFit || 'cover'};border-radius:${el.style.borderRadius || 0}px;`;
          img.crossOrigin = 'anonymous';
          elDiv.appendChild(img);
        } else if (el.type === 'shape') {
          const fill = el.style.shapeFill || el.style.backgroundColor || '#6366f1';
          elDiv.style.backgroundColor = fill;
          elDiv.style.borderRadius = `${el.style.borderRadius || 0}px`;
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
