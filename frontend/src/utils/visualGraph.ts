import type { PointerEvent } from "react";

export type GraphPoint = { x: number; y: number };
export type GraphSize = { width: number; height: number };

export function clampGraphPoint(point: GraphPoint, bounds: GraphSize, nodeSize: GraphSize): GraphPoint {
  return {
    x: Math.min(bounds.width - nodeSize.width / 2, Math.max(nodeSize.width / 2, point.x)),
    y: Math.min(bounds.height - nodeSize.height / 2, Math.max(nodeSize.height / 2, point.y)),
  };
}

export function edgeConnectionPoints(source: GraphPoint, target: GraphPoint, sourceSize: GraphSize, targetSize: GraphSize) {
  return {
    from: { x: source.x + sourceSize.width / 2, y: source.y },
    to: { x: target.x - targetSize.width / 2, y: target.y },
  };
}

export function graphWidthPercent(width: number, graphWidth: number): string {
  return `${(width / graphWidth) * 100}%`;
}

export function pointerToGraphPoint(
  event: PointerEvent<HTMLElement>,
  rect: DOMRect,
  graphSize: GraphSize,
  zoomValue: number,
  panPadding = 0
): GraphPoint {
  return {
    x: ((event.clientX - rect.left) / rect.width) * graphSize.width,
    y: ((event.clientY - rect.top - panPadding) / (graphSize.height * zoomValue)) * graphSize.height,
  };
}

export function stackedGraphPoint(index: number, total: number, x: number, top: number, bottom: number): GraphPoint {
  if (total <= 1) return { x, y: (top + bottom) / 2 };
  const step = (bottom - top) / Math.max(1, total - 1);
  return { x, y: top + index * step };
}

function positionsOverlap(a: GraphPoint, b: GraphPoint, nodeSize: GraphSize, padding: number): boolean {
  return (
    a.x < b.x + nodeSize.width + padding &&
    a.x + nodeSize.width + padding > b.x &&
    a.y < b.y + nodeSize.height + padding &&
    a.y + nodeSize.height + padding > b.y
  );
}

export function resolveNonOverlappingPositions<T>(
  items: T[],
  getStoredPosition: (item: T, index: number) => GraphPoint | null,
  getFallbackPosition: (item: T, index: number) => GraphPoint,
  options: {
    nodeSize: GraphSize;
    rowGap: number;
    columnGap: number;
    minX: number;
    minY: number;
    maxY: number;
    padding?: number;
    maxIterations?: number;
  }
): Array<{ item: T; position: GraphPoint }> {
  const placed: GraphPoint[] = [];
  const padding = options.padding ?? 18;

  return items.map((item, index) => {
    const stored = getStoredPosition(item, index);
    const fallback = getFallbackPosition(item, index);
    let x = Math.max(options.minX, stored?.x ?? fallback.x);
    let y = Math.max(options.minY, stored?.y ?? fallback.y);
    let guard = 0;

    while (
      placed.some((position) => positionsOverlap({ x, y }, position, options.nodeSize, padding)) &&
      guard < (options.maxIterations ?? 80)
    ) {
      y += options.rowGap;
      if (y > options.maxY) {
        x += options.columnGap;
        y = options.minY;
      }
      guard += 1;
    }

    const position = { x, y };
    placed.push(position);
    return { item, position };
  });
}
