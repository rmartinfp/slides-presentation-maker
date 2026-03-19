import html2canvas from 'html2canvas';

/**
 * Export a single slide element as a PNG image.
 */
export async function exportSlideToPng(
  slideElement: HTMLElement,
  filename: string = 'slide.png',
): Promise<void> {
  const canvas = await html2canvas(slideElement, {
    width: 1920,
    height: 1080,
    scale: 2,
    useCORS: true,
    backgroundColor: null,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Export slide as a Blob (for clipboard or upload).
 */
export async function slideToBlob(
  slideElement: HTMLElement,
): Promise<Blob | null> {
  const canvas = await html2canvas(slideElement, {
    width: 1920,
    height: 1080,
    scale: 2,
    useCORS: true,
    backgroundColor: null,
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}
