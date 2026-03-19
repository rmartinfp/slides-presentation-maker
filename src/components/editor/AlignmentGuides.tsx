import React, { useMemo } from 'react';
import { SlideElement } from '@/types/presentation';

interface Props {
  elements: SlideElement[];
  activeElementId: string | null;
  canvasWidth?: number;
  canvasHeight?: number;
}

const SNAP_THRESHOLD = 8; // px threshold to show guide

interface GuideLine {
  type: 'h' | 'v'; // horizontal or vertical
  position: number;
}

export default function AlignmentGuides({
  elements,
  activeElementId,
  canvasWidth = 1920,
  canvasHeight = 1080,
}: Props) {
  const guides = useMemo(() => {
    if (!activeElementId) return [];

    const active = elements.find(e => e.id === activeElementId);
    if (!active) return [];

    const others = elements.filter(e => e.id !== activeElementId);
    const lines: GuideLine[] = [];

    // Active element edges and centers
    const aCx = active.x + active.width / 2;
    const aCy = active.y + active.height / 2;
    const aRight = active.x + active.width;
    const aBottom = active.y + active.height;

    // Canvas center guides
    if (Math.abs(aCx - canvasWidth / 2) < SNAP_THRESHOLD) {
      lines.push({ type: 'v', position: canvasWidth / 2 });
    }
    if (Math.abs(aCy - canvasHeight / 2) < SNAP_THRESHOLD) {
      lines.push({ type: 'h', position: canvasHeight / 2 });
    }

    // Other element alignment
    for (const other of others) {
      const oCx = other.x + other.width / 2;
      const oCy = other.y + other.height / 2;
      const oRight = other.x + other.width;
      const oBottom = other.y + other.height;

      // Vertical alignment (x-axis)
      const vChecks = [
        { a: active.x, o: other.x },
        { a: active.x, o: oCx },
        { a: active.x, o: oRight },
        { a: aCx, o: other.x },
        { a: aCx, o: oCx },
        { a: aCx, o: oRight },
        { a: aRight, o: other.x },
        { a: aRight, o: oCx },
        { a: aRight, o: oRight },
      ];
      for (const check of vChecks) {
        if (Math.abs(check.a - check.o) < SNAP_THRESHOLD) {
          lines.push({ type: 'v', position: check.o });
        }
      }

      // Horizontal alignment (y-axis)
      const hChecks = [
        { a: active.y, o: other.y },
        { a: active.y, o: oCy },
        { a: active.y, o: oBottom },
        { a: aCy, o: other.y },
        { a: aCy, o: oCy },
        { a: aCy, o: oBottom },
        { a: aBottom, o: other.y },
        { a: aBottom, o: oCy },
        { a: aBottom, o: oBottom },
      ];
      for (const check of hChecks) {
        if (Math.abs(check.a - check.o) < SNAP_THRESHOLD) {
          lines.push({ type: 'h', position: check.o });
        }
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return lines.filter(l => {
      const key = `${l.type}-${Math.round(l.position)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [elements, activeElementId, canvasWidth, canvasHeight]);

  if (guides.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-[100]"
      width={canvasWidth}
      height={canvasHeight}
    >
      {guides.map((g, i) =>
        g.type === 'v' ? (
          <line
            key={i}
            x1={g.position}
            y1={0}
            x2={g.position}
            y2={canvasHeight}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="6 4"
            opacity={0.7}
          />
        ) : (
          <line
            key={i}
            x1={0}
            y1={g.position}
            x2={canvasWidth}
            y2={g.position}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="6 4"
            opacity={0.7}
          />
        ),
      )}
    </svg>
  );
}
