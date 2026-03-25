import React, { useMemo } from 'react';
import { SlideElement } from '@/types/presentation';

interface Props {
  elements: SlideElement[];
  activeElementId: string | null;
  canvasWidth?: number;
  canvasHeight?: number;
}

const SNAP_THRESHOLD = 6;

interface GuideLine {
  type: 'h' | 'v';
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

    // Only compare with UNLOCKED, VISIBLE elements (skip decorations)
    const others = elements.filter(e => e.id !== activeElementId && !e.locked && e.visible !== false);
    const lines: GuideLine[] = [];

    const aCx = active.x + active.width / 2;
    const aCy = active.y + active.height / 2;
    const aRight = active.x + active.width;
    const aBottom = active.y + active.height;

    // Canvas center guides (always useful)
    if (Math.abs(aCx - canvasWidth / 2) < SNAP_THRESHOLD) {
      lines.push({ type: 'v', position: canvasWidth / 2 });
    }
    if (Math.abs(aCy - canvasHeight / 2) < SNAP_THRESHOLD) {
      lines.push({ type: 'h', position: canvasHeight / 2 });
    }

    // Compare against other unlocked elements — only key alignments
    for (const other of others) {
      const oCx = other.x + other.width / 2;
      const oCy = other.y + other.height / 2;
      const oRight = other.x + other.width;
      const oBottom = other.y + other.height;

      // Vertical: left-left, center-center, right-right (3 checks, not 9)
      if (Math.abs(active.x - other.x) < SNAP_THRESHOLD) lines.push({ type: 'v', position: other.x });
      if (Math.abs(aCx - oCx) < SNAP_THRESHOLD) lines.push({ type: 'v', position: oCx });
      if (Math.abs(aRight - oRight) < SNAP_THRESHOLD) lines.push({ type: 'v', position: oRight });

      // Horizontal: top-top, center-center, bottom-bottom
      if (Math.abs(active.y - other.y) < SNAP_THRESHOLD) lines.push({ type: 'h', position: other.y });
      if (Math.abs(aCy - oCy) < SNAP_THRESHOLD) lines.push({ type: 'h', position: oCy });
      if (Math.abs(aBottom - oBottom) < SNAP_THRESHOLD) lines.push({ type: 'h', position: oBottom });
    }

    // Deduplicate and limit
    const seen = new Set<string>();
    return lines.filter(l => {
      const key = `${l.type}-${Math.round(l.position)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6); // Max 6 guides at once
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
          <line key={i} x1={g.position} y1={0} x2={g.position} y2={canvasHeight}
            stroke="#4F46E5" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
        ) : (
          <line key={i} x1={0} y1={g.position} x2={canvasWidth} y2={g.position}
            stroke="#4F46E5" strokeWidth={1} strokeDasharray="4 3" opacity={0.5} />
        ),
      )}
    </svg>
  );
}
