import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { BusinessFixedExpense, BusinessGoal, BusinessGoalConnection, BusinessGoalNode } from "../../../models/businessGoals";
import { formatBolivianos } from "../../../utils/currency";
import { panelStyle } from "../constants";
import GoalNodeCard from "./GoalNodeCard";

const NODE_WIDTH = 210;
const NODE_HEIGHT = 146;
const NODE_BASE_X = 520;
const NODE_BASE_Y = 70;
const NODE_ROW_GAP = 172;
const NODE_COL_GAP = 270;

type NodePosition = { x: number; y: number };
export type AutomaticVariableKind = "ventas" | "reservas";

const automaticVariables: Array<{ kind: AutomaticVariableKind; label: string; description: string }> = [
  { kind: "ventas", label: "Ventas de productos", description: "Suma ventas registradas en inventario." },
  { kind: "reservas", label: "Reservas", description: "Suma reservas no canceladas del periodo." },
];

function nodeConfigValue(node: BusinessGoalNode, key: string): string {
  const value = node.config?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function overlaps(a: NodePosition, b: NodePosition): boolean {
  return (
    a.x < b.x + NODE_WIDTH + 18 &&
    a.x + NODE_WIDTH + 18 > b.x &&
    a.y < b.y + NODE_HEIGHT + 18 &&
    a.y + NODE_HEIGHT + 18 > b.y
  );
}

function layoutNodes(nodes: BusinessGoalNode[]): Array<{ node: BusinessGoalNode; position: NodePosition }> {
  const placed: NodePosition[] = [];
  return nodes.map((node, index) => {
    let x = Number.isFinite(node.posicion_x) && node.posicion_x >= NODE_BASE_X ? node.posicion_x : NODE_BASE_X + Math.floor(index / 3) * NODE_COL_GAP;
    let y = Number.isFinite(node.posicion_y) && node.posicion_y >= 24 ? node.posicion_y : NODE_BASE_Y + (index % 3) * NODE_ROW_GAP;
    let guard = 0;

    while (placed.some((position) => overlaps({ x, y }, position)) && guard < 80) {
      y += NODE_ROW_GAP;
      if (y > 560) {
        x += NODE_COL_GAP;
        y = NODE_BASE_Y;
      }
      guard += 1;
    }

    const position = { x, y };
    placed.push(position);
    return { node, position };
  });
}

export default function GoalNodeBoard({
  goal,
  nodes,
  connections,
  expenses,
  onDropExpense,
  onDropAutomaticVariable,
  onEditNode,
  onDeleteNode,
  onMoveNode,
  onEditConnection,
}: {
  goal: BusinessGoal;
  nodes: BusinessGoalNode[];
  connections: BusinessGoalConnection[];
  expenses: BusinessFixedExpense[];
  onDropExpense: (expense: BusinessFixedExpense) => void;
  onDropAutomaticVariable: (kind: AutomaticVariableKind) => void;
  onEditNode: (node: BusinessGoalNode) => void;
  onDeleteNode: (node: BusinessGoalNode) => void;
  onMoveNode: (node: BusinessGoalNode, position: NodePosition) => void;
  onEditConnection: (connection: BusinessGoalConnection) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [draftPositions, setDraftPositions] = useState<Record<string, NodePosition>>({});
  const [dragging, setDragging] = useState<{ id: string; pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const goalNode = nodes.find((node) => node.config?.role === "goal_target");
  const variableNodes = nodes.filter((node) => node.config?.role !== "goal_target");
  const laidOutNodes = useMemo(() => layoutNodes(variableNodes), [variableNodes]);
  const positionedNodes = laidOutNodes.map(({ node, position }) => ({ node, position: draftPositions[node.id] ?? position }));
  const positionByNode = new Map(positionedNodes.map(({ node, position }) => [node.id, position]));
  const assignedExpenseIds = new Set(variableNodes.map((node) => nodeConfigValue(node, "fixed_expense_id")).filter(Boolean));
  const availableExpenses = expenses.filter((expense) => !assignedExpenseIds.has(expense.id));
  const assignedAutomaticKinds = new Set(variableNodes.filter((node) => !nodeConfigValue(node, "fixed_expense_id")).map((node) => node.tipo));
  const availableAutomaticVariables = automaticVariables.filter((variable) => !assignedAutomaticKinds.has(variable.kind));

  const goalX = 34;
  const goalY = 220;
  const canvasHeight = Math.max(620, ...positionedNodes.map(({ position }) => position.y + NODE_HEIGHT + 36));
  const canvasWidth = Math.max(980, ...positionedNodes.map(({ position }) => position.x + NODE_WIDTH + 60));

  useEffect(() => {
    setDraftPositions({});
  }, [nodes.map((node) => `${node.id}:${node.posicion_x}:${node.posicion_y}`).join("|")]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>, node: BusinessGoalNode) => {
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,select,textarea")) return;

    const canvas = canvasRef.current;
    const position = positionByNode.get(node.id);
    if (!canvas || !position) return;

    const rect = canvas.getBoundingClientRect();
    setDragging({
      id: node.id,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left + canvas.scrollLeft - position.x,
      offsetY: event.clientY - rect.top + canvas.scrollTop - position.y,
    });
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(300, event.clientX - rect.left + canvas.scrollLeft - dragging.offsetX);
    const y = Math.max(24, event.clientY - rect.top + canvas.scrollTop - dragging.offsetY);
    setDraftPositions((state) => ({ ...state, [dragging.id]: { x: Math.round(x), y: Math.round(y) } }));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;

    const node = variableNodes.find((item) => item.id === dragging.id);
    let position = draftPositions[dragging.id] ?? positionByNode.get(dragging.id);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      position = {
        x: Math.round(Math.max(300, event.clientX - rect.left + canvas.scrollLeft - dragging.offsetX)),
        y: Math.round(Math.max(24, event.clientY - rect.top + canvas.scrollTop - dragging.offsetY)),
      };
    }
    if (node && position) onMoveNode(node, position);

    if (canvasRef.current?.hasPointerCapture(dragging.pointerId)) {
      canvasRef.current.releasePointerCapture(dragging.pointerId);
    }
    setDragging(null);
    event.preventDefault();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(230px, 300px) minmax(0, 1fr)", gap: 14 }}>
      <div style={{ ...panelStyle, display: "grid", gap: 10, alignContent: "start" }}>
        <div>
          <div style={{ fontWeight: 950 }}>Gastos fijos</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Arrastra un gasto sobre la meta.</div>
        </div>

        {availableExpenses.map((expense) => (
          <div
            key={expense.id}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", expense.id)}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              background: "#111827",
              padding: 12,
              cursor: "grab",
            }}
          >
            <strong>{expense.nombre}</strong>
            <div style={{ color: "#ffd24a", fontWeight: 900, fontSize: 13, marginTop: 5 }}>{formatBolivianos(expense.monto)}</div>
            <div style={{ color: "var(--color-text-muted)", fontSize: 11, marginTop: 4 }}>
              {expense.categoria} - {expense.frecuencia} - {expense.estado}
            </div>
          </div>
        ))}

        {availableExpenses.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay gastos pendientes por asignar.</div>}

        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12, marginTop: 4 }}>
          <div style={{ fontWeight: 950 }}>Variables automaticas</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Arrastra ventas o reservas para que alimenten la meta.</div>
        </div>

        {availableAutomaticVariables.map((variable) => (
          <div
            key={variable.kind}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("application/x-goal-variable", variable.kind)}
            style={{
              border: "1px solid rgba(216,240,106,0.42)",
              borderRadius: 8,
              background: "#101927",
              padding: 12,
              cursor: "grab",
            }}
          >
            <strong>{variable.label}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 11, marginTop: 5 }}>{variable.description}</div>
          </div>
        ))}
      </div>

      <div
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const automaticKind = event.dataTransfer.getData("application/x-goal-variable") as AutomaticVariableKind;
          if (automaticKind) {
            onDropAutomaticVariable(automaticKind);
            return;
          }
          const expense = expenses.find((item) => item.id === event.dataTransfer.getData("text/plain"));
          if (expense) onDropExpense(expense);
        }}
        style={{ ...panelStyle, position: "relative", minHeight: 620, overflow: "auto", background: "#0b101a" }}
      >
        <div style={{ position: "relative", minWidth: canvasWidth, minHeight: canvasHeight }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          {connections.map((connection) => {
            const sourcePosition = positionByNode.get(connection.source);
            if (!sourcePosition || (goalNode && connection.target !== goalNode.id)) return null;
            return (
              <g key={connection.id}>
                <line
                  x1={goalX + 214}
                  y1={goalY + 58}
                  x2={sourcePosition.x}
                  y2={sourcePosition.y + 58}
                  stroke="transparent"
                  strokeWidth={18}
                  style={{ cursor: "pointer", pointerEvents: "stroke" }}
                  onClick={() => onEditConnection(connection)}
                />
                <line
                  x1={goalX + 214}
                  y1={goalY + 58}
                  x2={sourcePosition.x}
                  y2={sourcePosition.y + 58}
                  stroke="#d8f06a"
                  strokeWidth={4}
                  opacity={0.88}
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>

        <div
          style={{
            position: "absolute",
            left: goalX,
            top: goalY,
            width: 230,
            minHeight: 116,
            border: "2px solid #ffd24a",
            borderRadius: 8,
            padding: 14,
            background: "linear-gradient(90deg, rgba(255,210,74,0.16), rgba(255,255,255,0.02))",
          }}
        >
          <div style={{ color: "#ffd24a", fontSize: 11, fontWeight: 950 }}>META</div>
          <h3 style={{ margin: "8px 0 0", fontSize: 18 }}>{goal.nombre}</h3>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 8 }}>
            Objetivo {formatBolivianos(goal.monto_objetivo)}
          </div>
          <div style={{ color: goal.progress?.cumplimiento_estimado ? "#8ee59f" : "#ffb4b4", fontSize: 12, fontWeight: 950, marginTop: 8 }}>
            {goal.progress?.cumplimiento_estimado ? "Proyeccion favorable" : "Proyeccion en riesgo"}
          </div>
        </div>

        {positionedNodes.map(({ node, position }) => (
          <GoalNodeCard
            key={node.id}
            node={node}
            position={position}
            selected={dragging?.id === node.id}
            onPointerDown={(event) => handlePointerDown(event, node)}
            onEdit={() => onEditNode(node)}
            onDelete={() => onDeleteNode(node)}
          />
        ))}

        {connections.length > 0 && (
          <div style={{ position: "absolute", right: 14, top: 14, width: 230, ...panelStyle, background: "#111827", fontSize: 12, color: "var(--color-text-muted)" }}>
            Click en una linea para editarla o eliminar la relacion.
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
