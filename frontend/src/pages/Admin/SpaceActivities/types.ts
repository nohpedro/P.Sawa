import type { GraphPoint } from "../../../utils/visualGraph";

export type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };
export type ViewMode = "list" | "graph";
export type DraggingNode = { type: "space" | "activity"; id?: string; offset: GraphPoint };
export type PanningGraph = { x: number; y: number; scrollLeft: number; scrollTop: number };
