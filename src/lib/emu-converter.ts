/**
 * Google Slides uses EMU (English Metric Units) for positioning.
 * 1 inch = 914400 EMU
 * Google Slides default size: 9144000 x 6858000 EMU (10" x 7.5")
 * Our canvas: 1920 x 1080 px
 */

const SLIDES_WIDTH_EMU = 9144000;
const SLIDES_HEIGHT_EMU = 6858000;
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export function emuToX(emu: number): number {
  return Math.round((emu / SLIDES_WIDTH_EMU) * CANVAS_WIDTH);
}

export function emuToY(emu: number): number {
  return Math.round((emu / SLIDES_HEIGHT_EMU) * CANVAS_HEIGHT);
}

export function emuToWidth(emu: number): number {
  return Math.round((emu / SLIDES_WIDTH_EMU) * CANVAS_WIDTH);
}

export function emuToHeight(emu: number): number {
  return Math.round((emu / SLIDES_HEIGHT_EMU) * CANVAS_HEIGHT);
}

/** Convert EMU font size to px (at 96 DPI) */
export function emuToFontPx(emu: number): number {
  // 1 pt = 12700 EMU, 1 pt ≈ 1.333 px at 96 DPI
  return Math.round((emu / 12700) * 1.333);
}

/** Google Slides uses magnitude in "points × 10000" for font size */
export function magnitudeToFontPx(magnitude: number, unit: string = 'PT'): number {
  if (unit === 'PT') {
    return Math.round(magnitude * 1.333);
  }
  if (unit === 'EMU') {
    return emuToFontPx(magnitude);
  }
  return Math.round(magnitude);
}

/**
 * Convert Google Slides RGBA color to hex string.
 * Google uses 0-1 float range.
 */
export function rgbaToHex(
  color: { red?: number; green?: number; blue?: number } | undefined,
): string {
  if (!color) return '#000000';
  const r = Math.round((color.red ?? 0) * 255);
  const g = Math.round((color.green ?? 0) * 255);
  const b = Math.round((color.blue ?? 0) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
