import {
  edgeConnectionPoints,
  graphWidthPercent,
  pointerToGraphPoint,
  stackedGraphPoint,
  type GraphPoint,
} from "../../../../utils/visualGraph";
import { activityNodeSize, graphPanPadding, graphSize, spaceNodeSize } from "../constants";
import type { PointerEvent } from "react";

export function getActivityPoint(index: number, total: number): GraphPoint {
  return stackedGraphPoint(index, total, 760, 86, 534);
}

export function connectionPoints(spacePoint: GraphPoint, activityPoint: GraphPoint) {
  return edgeConnectionPoints(spacePoint, activityPoint, spaceNodeSize, activityNodeSize);
}

export function toGraphPoint(event: PointerEvent<HTMLElement>, rect: DOMRect, zoomValue: number): GraphPoint {
  return pointerToGraphPoint(event, rect, graphSize, zoomValue, graphPanPadding);
}

export function toGraphWidthPercent(width: number): string {
  return graphWidthPercent(width, graphSize.width);
}
