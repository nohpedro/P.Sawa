import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import GraphZoomToolbar from "../../../components/visualGraph/GraphZoomToolbar";
import type { InventoryPurchaseBatch } from "../../../models/inventory";
import type { BusinessFixedExpense, BusinessGoal, BusinessGoalConnection, BusinessGoalNode } from "../../../models/businessGoals";
import { formatBolivianos } from "../../../utils/currency";
import {
  clampGraphPoint,
  edgeConnectionPoints,
  graphWidthPercent,
  pointerToGraphPoint,
  stackedGraphPoint,
  type GraphPoint,
  type GraphSize,
} from "../../../utils/visualGraph";

const graphSize: GraphSize = { width: 1000, height: 620 };
const graphPanPadding = 180;
const goalNodeSize: GraphSize = { width: 150, height: 108 };
const variableNodeSize: GraphSize = { width: 155, height: 78 };
const defaultGoalNode: GraphPoint = { x: 150, y: 310 };

export type AutomaticVariableKind = "ventas" | "reservas";

type VisualNodeKind = "assigned" | "expense" | "automatic";
type DraggingNode = { id: string; offset: GraphPoint };
type PanningGraph = { x: number; y: number; scrollLeft: number; scrollTop: number };

type VisualNode = {
  id: string;
  kind: VisualNodeKind;
  title: string;
  subtitle: string;
  detail: string;
  assigned: boolean;
  node?: BusinessGoalNode;
  pendingExpense?: BusinessFixedExpense;
  pendingBatch?: InventoryPurchaseBatch;
  pendingAutomaticKind?: AutomaticVariableKind;
};

export type PendingGoalVariable =
  | { type: "expense"; expense: BusinessFixedExpense }
  | { type: "batch"; batch: InventoryPurchaseBatch }
  | { type: "automatic"; kind: AutomaticVariableKind; label: string; description: string };

function nodeConfigValue(node: BusinessGoalNode, key: string): string {
  const value = node.config?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function getVariablePoint(index: number, total: number): GraphPoint {
  return stackedGraphPoint(index, total, 760, 86, 534);
}

function toGraphWidth(width: number): string {
  return graphWidthPercent(width, graphSize.width);
}

function toGraphPoint(event: PointerEvent<HTMLElement>, rect: DOMRect, zoom: number): GraphPoint {
  return pointerToGraphPoint(event, rect, graphSize, zoom, graphPanPadding);
}

function connectionPoints(goalPoint: GraphPoint, variablePoint: GraphPoint) {
  return edgeConnectionPoints(goalPoint, variablePoint, goalNodeSize, variableNodeSize);
}

function assignedNodeDetail(node: BusinessGoalNode): string {
  const amount = formatBolivianos(node.valor);
  const percent = Number(node.porcentaje) > 0 ? ` / ${node.porcentaje}%` : "";
  return `${amount}${percent}`;
}

function isFixedExpenseVisualNode(visualNode: VisualNode): boolean {
  return Boolean(visualNode.node && nodeConfigValue(visualNode.node, "fixed_expense_id"));
}

function isBatchVisualNode(visualNode: VisualNode): boolean {
  return Boolean(visualNode.node && nodeConfigValue(visualNode.node, "batch_id"));
}

function visualNodePalette(visualNode: VisualNode) {
  const fixedExpense = isFixedExpenseVisualNode(visualNode);
  const batchExpense = isBatchVisualNode(visualNode) || visualNode.kind === "expense";
  if (fixedExpense) {
    return {
      border: visualNode.assigned ? "#f59e0b" : "rgba(245,158,11,0.58)",
      background: visualNode.assigned ? "rgba(245,158,11,0.16)" : "rgba(245,158,11,0.08)",
      text: "#fbbf24",
      shadow: visualNode.assigned ? "0 12px 30px rgba(245,158,11,0.10)" : "none",
    };
  }

  if (batchExpense) {
    return {
      border: visualNode.assigned ? "#f87171" : "rgba(248,113,113,0.58)",
      background: visualNode.assigned ? "rgba(248,113,113,0.16)" : "rgba(248,113,113,0.08)",
      text: "#fca5a5",
      shadow: visualNode.assigned ? "0 12px 30px rgba(248,113,113,0.10)" : "none",
    };
  }

  return {
    border: visualNode.assigned ? "#8ee59f" : "var(--color-border)",
    background: visualNode.assigned ? "rgba(142,229,159,0.12)" : "#0f1420",
    text: visualNode.assigned ? "#8ee59f" : "#94a3b8",
    shadow: visualNode.assigned ? "0 12px 30px rgba(142,229,159,0.08)" : "none",
  };
}

export default function GoalNodeBoard({
  goal,
  nodes,
  connections,
  onEditNode,
  onDeleteNode,
  onMoveNode,
  onEditConnection,
  pendingVariable,
  onRequestVariablePicker,
  onConnectExistingNode,
  onAssignPendingExpense,
  onAssignPendingBatch,
  onAssignPendingAutomatic,
}: {
  goal: BusinessGoal;
  nodes: BusinessGoalNode[];
  connections: BusinessGoalConnection[];
  onEditNode: (node: BusinessGoalNode) => void;
  onDeleteNode: (node: BusinessGoalNode) => void;
  onMoveNode: (node: BusinessGoalNode, position: GraphPoint) => void;
  onEditConnection: (connection: BusinessGoalConnection) => void;
  pendingVariable?: PendingGoalVariable | null;
  onRequestVariablePicker: () => void;
  onConnectExistingNode: (node: BusinessGoalNode) => void;
  onAssignPendingExpense: (expense: BusinessFixedExpense) => void;
  onAssignPendingBatch: (batch: InventoryPurchaseBatch) => void;
  onAssignPendingAutomatic: (kind: AutomaticVariableKind) => void;
}) {
  const graphViewportRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);

  const [nodePositions, setNodePositions] = useState<Record<string, GraphPoint>>({});
  const [draggingNode, setDraggingNode] = useState<DraggingNode | null>(null);
  const [dragLine, setDragLine] = useState<{ to: GraphPoint } | null>(null);
  const [panningGraph, setPanningGraph] = useState<PanningGraph | null>(null);
  const [zoom, setZoom] = useState(1);

  const goalNode = nodes.find((node) => node.config?.role === "goal_target");
  const variableNodes = nodes.filter((node) => node.config?.role !== "goal_target");
  const connectionBySource = new Map(connections.filter((connection) => !goalNode || connection.target === goalNode.id).map((connection) => [connection.source, connection]));
  const hasReconnectableNodes = variableNodes.some((node) => !connectionBySource.has(node.id));

  const visualNodes = useMemo<VisualNode[]>(() => {
    const assigned = variableNodes.map((node) => ({
      id: `assigned:${node.id}`,
      kind: "assigned" as const,
      title: node.etiqueta,
      subtitle: node.tipo_label ?? node.tipo,
      detail: assignedNodeDetail(node),
      assigned: true,
      node,
    }));

    if (!pendingVariable) return assigned;

    if (pendingVariable.type === "expense") {
      return [
        ...assigned,
        {
          id: `pending-expense:${pendingVariable.expense.id}`,
          kind: "expense" as const,
          title: pendingVariable.expense.nombre,
          subtitle: pendingVariable.expense.categoria,
          detail: formatBolivianos(pendingVariable.expense.monto),
          assigned: false,
          pendingExpense: pendingVariable.expense,
        },
      ];
    }

    if (pendingVariable.type === "batch") {
      return [
        ...assigned,
        {
          id: `pending-batch:${pendingVariable.batch.id}`,
          kind: "expense" as const,
          title: `Lote de ${pendingVariable.batch.item_nombre ?? "inventario"}`,
          subtitle: "Gasto variable",
          detail: formatBolivianos(pendingVariable.batch.costo_total),
          assigned: false,
          pendingBatch: pendingVariable.batch,
        },
      ];
    }

    return [
      ...assigned,
      {
        id: `pending-automatic:${pendingVariable.kind}`,
        kind: "automatic" as const,
        title: pendingVariable.label,
        subtitle: pendingVariable.description,
        detail: "Soltar linea aqui",
        assigned: false,
        pendingAutomaticKind: pendingVariable.kind,
      },
    ];
  }, [nodes, pendingVariable]);

  useEffect(() => {
    setDraggingNode(null);
    setDragLine(null);
    setPanningGraph(null);
    setNodePositions((current) => {
      const next: Record<string, GraphPoint> = {};
      visualNodes.forEach((visualNode, index) => {
        const stored = visualNode.node && visualNode.node.posicion_x >= 650
          ? { x: visualNode.node.posicion_x, y: visualNode.node.posicion_y }
          : null;
        next[visualNode.id] = current[visualNode.id] ?? stored ?? getVariablePoint(index, visualNodes.length);
      });
      return next;
    });
  }, [visualNodes]);

  const startNodeDrag = (event: PointerEvent<HTMLElement>, visualNode: VisualNode) => {
    if (dragLine) return;
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toGraphPoint(event, rect, zoom);
    const current = nodePositions[visualNode.id] ?? point;
    setDraggingNode({ id: visualNode.id, offset: { x: point.x - current.x, y: point.y - current.y } });
  };

  const startGraphPan = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingNode || dragLine) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-graph-ignore-pan='true']")) return;
    const viewport = graphViewportRef.current;
    if (!viewport) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanningGraph({
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    });
  };

  const startLineDrag = (event: PointerEvent<HTMLElement>) => {
    if (!pendingVariable && !hasReconnectableNodes) {
      event.stopPropagation();
      onRequestVariablePicker();
      return;
    }

    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.stopPropagation();
    setDraggingNode(null);
    setDragLine({ to: toGraphPoint(event, rect, zoom) });
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (panningGraph) {
      const viewport = graphViewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = panningGraph.scrollLeft - (event.clientX - panningGraph.x);
      viewport.scrollTop = panningGraph.scrollTop - (event.clientY - panningGraph.y);
      return;
    }

    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toGraphPoint(event, rect, zoom);

    if (draggingNode) {
      const nextPoint = clampGraphPoint({ x: point.x - draggingNode.offset.x, y: point.y - draggingNode.offset.y }, graphSize, variableNodeSize);
      setNodePositions((current) => ({ ...current, [draggingNode.id]: nextPoint }));
      return;
    }

    if (dragLine) setDragLine({ to: point });
  };

  const finishDrag = () => {
    if (draggingNode) {
      const visualNode = visualNodes.find((item) => item.id === draggingNode.id);
      const point = nodePositions[draggingNode.id];
      if (visualNode?.node && point) onMoveNode(visualNode.node, { x: Math.round(point.x), y: Math.round(point.y) });
    }
    if (draggingNode) setDraggingNode(null);
    if (dragLine) setDragLine(null);
    if (panningGraph) setPanningGraph(null);
  };

  const cancelDrag = () => {
    if (draggingNode) setDraggingNode(null);
    if (dragLine) setDragLine(null);
    if (panningGraph) setPanningGraph(null);
  };

  const assignPendingVariable = (visualNode: VisualNode) => {
    if (!dragLine) return;
    setDragLine(null);
    if (visualNode.pendingExpense) onAssignPendingExpense(visualNode.pendingExpense);
    if (visualNode.pendingBatch) onAssignPendingBatch(visualNode.pendingBatch);
    if (visualNode.pendingAutomaticKind) onAssignPendingAutomatic(visualNode.pendingAutomaticKind);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ border: "1px solid var(--color-border)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 900 }}>
          {goal.nombre}
        </span>
        <span style={{ border: "1px solid var(--color-border)", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 900 }}>
          Asignadas: {variableNodes.length}
        </span>
        <span style={{ color: "var(--color-text-muted)", fontSize: 12, marginLeft: "auto" }}>
          {pendingVariable || hasReconnectableNodes ? "Arrastra desde el punto amarillo hacia una variable." : "Pulsa el punto amarillo para seleccionar una variable."}
        </span>
      </div>

      <GraphZoomToolbar zoom={zoom} onZoomChange={setZoom} />

      <div
        ref={graphViewportRef}
        onPointerDown={startGraphPan}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerLeave={cancelDrag}
        style={{
          position: "relative",
          height: graphSize.height,
          minHeight: graphSize.height,
          maxHeight: graphSize.height,
          border: "1px solid rgba(255,210,74,0.22)",
          borderRadius: 10,
          overflow: "auto",
          cursor: panningGraph ? "grabbing" : "grab",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.035) 1px, transparent 1px), #070b13",
          backgroundSize: "46px 46px",
        }}
      >
        <div
          ref={graphRef}
          style={{
            position: "relative",
            width: `${zoom * 100}%`,
            height: graphSize.height * zoom + graphPanPadding * 2,
            minHeight: graphSize.height + graphPanPadding * 2,
          }}
        >
          <svg
            viewBox={`0 0 ${graphSize.width} ${graphSize.height}`}
            preserveAspectRatio="none"
            style={{
              position: "absolute",
              left: 0,
              top: graphPanPadding,
              width: "100%",
              height: graphSize.height * zoom,
              pointerEvents: "none",
            }}
          >
            <defs>
              <linearGradient id="goalAssignedLine" gradientUnits="userSpaceOnUse" x1="0" x2={graphSize.width} y1="0" y2="0">
                <stop offset="0%" stopColor="#ffd24a" />
                <stop offset="100%" stopColor="#8ee59f" />
              </linearGradient>
            </defs>

            {visualNodes.map((visualNode, index) => {
              if (!visualNode.assigned) return null;
              const point = nodePositions[visualNode.id] ?? getVariablePoint(index, visualNodes.length);
              const line = connectionPoints(defaultGoalNode, point);
              const connection = visualNode.node ? connectionBySource.get(visualNode.node.id) : null;
              if (!connection) return null;

              return (
                <g
                  key={visualNode.id}
                  data-graph-ignore-pan="true"
                  style={{ pointerEvents: "auto", cursor: connection ? "pointer" : "default" }}
                  onClick={() => {
                    if (connection) onEditConnection(connection);
                  }}
                >
                  <line x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke="transparent" strokeWidth="28" />
                  <line
                    x1={line.from.x}
                    y1={line.from.y}
                    x2={line.to.x}
                    y2={line.to.y}
                    stroke="url(#goalAssignedLine)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <circle cx={line.to.x} cy={line.to.y} r="7" fill="#8ee59f" />
                </g>
              );
            })}
            {dragLine && (
              <line
                x1={defaultGoalNode.x + goalNodeSize.width / 2}
                y1={defaultGoalNode.y}
                x2={dragLine.to.x}
                y2={dragLine.to.y}
                stroke="#ffd24a"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="14 10"
              />
            )}

          </svg>

          <div
            data-graph-ignore-pan="true"
            role="button"
            tabIndex={0}
            style={{
              position: "absolute",
              left: `${(defaultGoalNode.x / graphSize.width) * 100}%`,
              top: graphPanPadding + (defaultGoalNode.y / graphSize.height) * graphSize.height * zoom,
              transform: "translate(-50%, -50%)",
              width: toGraphWidth(goalNodeSize.width),
              minHeight: 118,
              boxSizing: "border-box",
              border: "2px solid #ffd24a",
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(255,210,74,0.24), #111827 62%)",
              color: "#f8fafc",
              boxShadow: "0 18px 46px rgba(255,210,74,0.12)",
              cursor: "grab",
              padding: 14,
              textAlign: "center",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            <div style={{ fontSize: 11, color: "#ffd24a", fontWeight: 950, textTransform: "uppercase" }}>Meta</div>
            <div style={{ fontSize: 18, fontWeight: 950, marginTop: 6, lineHeight: 1.15 }}>{goal.nombre}</div>
            <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8 }}>{pendingVariable || hasReconnectableNodes ? "Mueve o conecta" : "Selecciona variable"}</div>
            <span
              data-graph-ignore-pan="true"
              role="button"
              tabIndex={0}
                aria-label={pendingVariable || hasReconnectableNodes ? "Crear conexion" : "Seleccionar variable"}
              onPointerDown={startLineDrag}
              style={{
                position: "absolute",
                right: -10,
                top: "50%",
                width: 20,
                height: 20,
                transform: "translateY(-50%)",
                borderRadius: "50%",
                border: "2px solid #070b13",
                background: "#ffd24a",
                boxShadow: "0 0 0 5px rgba(255,210,74,0.20)",
                cursor: pendingVariable || hasReconnectableNodes ? "crosshair" : "pointer",
              }}
            />
          </div>

          {visualNodes.map((visualNode, index) => {
            const point = nodePositions[visualNode.id] ?? getVariablePoint(index, visualNodes.length);
            const palette = visualNodePalette(visualNode);
            return (
              <button
                key={visualNode.id}
                data-graph-ignore-pan="true"
                type="button"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (visualNode.node) onEditNode(visualNode.node);
                }}
                onContextMenu={(event) => {
                  if (!visualNode.node) return;
                  event.preventDefault();
                  onDeleteNode(visualNode.node);
                }}
                onPointerDown={(event) => startNodeDrag(event, visualNode)}
                onPointerUp={(event) => {
                  event.stopPropagation();
                  if (dragLine) assignPendingVariable(visualNode);
                  if (dragLine && visualNode.node && !connectionBySource.has(visualNode.node.id)) {
                    onConnectExistingNode(visualNode.node);
                  }
                  if (draggingNode?.id === visualNode.id && visualNode.node) {
                    const point = nodePositions[visualNode.id];
                    if (point) onMoveNode(visualNode.node, { x: Math.round(point.x), y: Math.round(point.y) });
                  }
                  setDraggingNode(null);
                }}
                style={{
                  position: "absolute",
                  left: `${(point.x / graphSize.width) * 100}%`,
                  top: graphPanPadding + (point.y / graphSize.height) * graphSize.height * zoom,
                  transform: "translate(-50%, -50%)",
                  width: toGraphWidth(variableNodeSize.width),
                  minHeight: 86,
                  boxSizing: "border-box",
                  border: `1px solid ${palette.border}`,
                  borderRadius: 12,
                  background: palette.background,
                  color: "var(--color-text)",
                  padding: 12,
                  cursor: draggingNode?.id === visualNode.id ? "grabbing" : "grab",
                  boxShadow: palette.shadow,
                  touchAction: "none",
                  userSelect: "none",
                }}
                title={visualNode.node ? "Doble click para editar. Click derecho para eliminar." : "Suelta la linea aqui para asignar."}
              >
                {isFixedExpenseVisualNode(visualNode) && (
                  <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 950, textTransform: "uppercase", marginBottom: 5 }}>
                    Gasto fijo
                  </div>
                )}
                {isBatchVisualNode(visualNode) && (
                  <div style={{ color: "#fca5a5", fontSize: 10, fontWeight: 950, textTransform: "uppercase", marginBottom: 5 }}>
                    Gasto variable - lote
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 950, lineHeight: 1.2 }}>{visualNode.title}</div>
                <div style={{ color: palette.text, fontSize: 11, fontWeight: 900, marginTop: 8, lineHeight: 1.25 }}>
                  {visualNode.assigned ? `${visualNode.detail}` : visualNode.detail}
                </div>
              </button>
            );
          })}

          {visualNodes.length === 0 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                color: "var(--color-text-muted)",
                fontSize: 13,
              }}
            >
              No hay variables para mostrar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
