import { SlideElement, AnchorPosition } from '@/types/presentation';

interface Point { x: number; y: number; }
interface Rect { x: number; y: number; width: number; height: number; }

/** Get the anchor point (px) on an element's edge */
export function getAnchorPoint(el: Rect, anchor: AnchorPosition | 'auto', targetEl?: Rect): Point {
  const pos = anchor === 'auto' && targetEl ? nearestEdge(el, targetEl) : anchor === 'auto' ? 'right' : anchor;
  switch (pos) {
    case 'top': return { x: el.x + el.width / 2, y: el.y };
    case 'bottom': return { x: el.x + el.width / 2, y: el.y + el.height };
    case 'left': return { x: el.x, y: el.y + el.height / 2 };
    case 'right': return { x: el.x + el.width, y: el.y + el.height / 2 };
    default: return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
  }
}

/** Determine which edge of `from` is closest to `to` */
function nearestEdge(from: Rect, to: Rect): 'top' | 'right' | 'bottom' | 'left' {
  const fcx = from.x + from.width / 2;
  const fcy = from.y + from.height / 2;
  const tcx = to.x + to.width / 2;
  const tcy = to.y + to.height / 2;
  const dx = tcx - fcx;
  const dy = tcy - fcy;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'bottom' : 'top';
}

/** Resolve connector endpoints and return the bounding box + relative line coords */
export function resolveConnectorPosition(
  connector: { startElementId: string; endElementId: string; startAnchor: AnchorPosition; endAnchor: AnchorPosition },
  elements: SlideElement[],
): { x: number; y: number; width: number; height: number; x1: number; y1: number; x2: number; y2: number } | null {
  const startEl = elements.find(e => e.id === connector.startElementId);
  const endEl = elements.find(e => e.id === connector.endElementId);
  if (!startEl || !endEl) return null;

  const p1 = getAnchorPoint(startEl, connector.startAnchor, endEl);
  const p2 = getAnchorPoint(endEl, connector.endAnchor, startEl);

  const pad = 4; // padding so markers aren't clipped
  const minX = Math.min(p1.x, p2.x) - pad;
  const minY = Math.min(p1.y, p2.y) - pad;
  const maxX = Math.max(p1.x, p2.x) + pad;
  const maxY = Math.max(p1.y, p2.y) + pad;

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 8),
    height: Math.max(maxY - minY, 8),
    x1: p1.x - minX,
    y1: p1.y - minY,
    x2: p2.x - minX,
    y2: p2.y - minY,
  };
}

/** Find all connector elements referencing a given element ID */
export function getConnectorsForElement(elementId: string, elements: SlideElement[]): SlideElement[] {
  return elements.filter(
    e => e.connector && (e.connector.startElementId === elementId || e.connector.endElementId === elementId)
  );
}
