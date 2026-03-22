import { useEffect, useRef, useState } from 'react';

/**
 * Auto-shrink text to fit its container (like PowerPoint's "Shrink text on overflow").
 * Measures the natural height of the content by temporarily removing height constraints,
 * then computes the scale needed to fit.
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

    // Reset to full size first
    setScale(1);

    const measure = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;

      // Get the container's constrained height
      const containerHeight = el.parentElement?.clientHeight || el.clientHeight;
      const containerWidth = el.parentElement?.clientWidth || el.clientWidth;
      if (!containerHeight || !containerWidth) return;

      // Temporarily make the element auto-height to measure natural content size
      const origHeight = el.style.height;
      const origWidth = el.style.width;
      const origDisplay = el.style.display;
      const origTransform = el.style.transform;
      const origJustify = el.style.justifyContent;

      // Remove flex and constraints to get natural content height
      el.style.height = 'auto';
      el.style.width = `${containerWidth}px`;
      el.style.display = 'block';
      el.style.transform = 'none';
      el.style.justifyContent = '';

      const naturalHeight = el.scrollHeight;

      // Restore
      el.style.height = origHeight;
      el.style.width = origWidth;
      el.style.display = origDisplay;
      el.style.transform = origTransform;
      el.style.justifyContent = origJustify;

      if (naturalHeight > containerHeight + 2) {
        const ratio = containerHeight / naturalHeight;
        const newScale = Math.max(minScale, Math.floor(ratio * 100) / 100);
        setScale(newScale);
      }
    };

    // Measure after DOM update + after fonts load
    requestAnimationFrame(() => {
      measure();
      setTimeout(measure, 300);
    });
  }, [baseFontSize, content, minScale]);

  return { containerRef, scale };
}
