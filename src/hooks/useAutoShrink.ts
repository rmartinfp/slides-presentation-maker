import { useEffect, useRef, useState } from 'react';

/**
 * Auto-shrink text to fit its container (like PowerPoint's "Shrink text on overflow").
 * Uses CSS transform: scale() so it works even when inline styles set explicit font-size.
 *
 * Returns a ref to attach to the text container and a scale factor (0..1).
 *
 * @param baseFontSize - The original font size in px (used as dependency)
 * @param content - The text content (used as dependency to recalculate)
 * @param minScale - Minimum scale factor (default 0.4 = 40% of original size)
 */
export function useAutoShrink(baseFontSize: number, content: string, minScale = 0.4) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Reset to full size first to measure true overflow
    setScale(1);

    // Use requestAnimationFrame to wait for the DOM to update with scale=1
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const { scrollHeight, clientHeight } = containerRef.current;

      if (scrollHeight > clientHeight + 2) {
        // Calculate the ratio needed to fit
        const ratio = clientHeight / scrollHeight;
        // Clamp to minScale
        const newScale = Math.max(minScale, Math.floor(ratio * 100) / 100);
        setScale(newScale);
      }
    });
  }, [baseFontSize, content, minScale]);

  return { containerRef, scale };
}
