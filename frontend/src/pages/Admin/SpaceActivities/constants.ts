import type { CSSProperties } from "react";
import type { GraphPoint, GraphSize } from "../../../utils/visualGraph";

export const graphSize: GraphSize = { width: 1000, height: 620 };
export const graphPanPadding = 180;
export const defaultSpaceNode: GraphPoint = { x: 150, y: 310 };
export const spaceNodeSize: GraphSize = { width: 150, height: 108 };
export const activityNodeSize: GraphSize = { width: 155, height: 78 };

export const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

export const badgeStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
};
