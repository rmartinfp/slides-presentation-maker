import { useEffect, useRef, useState } from 'react';

/**
 * Auto-shrink text to fit its container (like PowerPoint's "Shrink text on overflow").
 * Uses CSS transform: scale() so it works even when inline styles set explicit font-size.
 *
 * @param baseFontSize - The original font size in px (used as dependency)
 * @param content - The text content (used as dependency to recalculate)
 * @param minScale - Minimum scale factor (default 0.3 = 30% of original size)
 */
export function useAutoShrink(baseFontSize: number, content: string, minScale = 0.3) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Reset to full size first to measure true overflow
    setScale(1);

    // Measure after DOM update — try twice (second attempt catches late font loading)
    const measure = () => {
      if (!containerRef.current) return;
      const { scrollHeight, clientHeight } = containerRef.current;

      if (scrollHeight > clientHeight + 2) {
        const ratio = clientHeight / scrollHeight;
        const newScale = Math.max(minScale, Math.floor(ratio * 100) / 100);
        setScale(newScale);
      }
    };

    // First measurement after DOM update
    requestAnimationFrame(() => {
      measure();
      // Second measurement after fonts might have loaded (200ms delay)
      setTimeout(measure, 200);
    });
  }, [baseFontSize, content, minScale]);

  return { containerRef, scale };
}
