import Button from "../../../components/ui/Button";
import type { PointerEventHandler } from "react";
import type { BusinessGoalNode } from "../../../models/businessGoals";
import { formatBolivianos } from "../../../utils/currency";

function metaValue(node: BusinessGoalNode, key: string): string {
  const value = node.config?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export default function GoalNodeCard({
  node,
  position,
  selected = false,
  onPointerDown,
  onEdit,
  onDelete,
}: {
  node: BusinessGoalNode;
  position?: { x: number; y: number };
  selected?: boolean;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = metaValue(node, "estado");
  const frequency = metaValue(node, "frecuencia");

  return (
    <div
      style={{
        position: "absolute",
        left: position?.x ?? node.posicion_x,
        top: position?.y ?? node.posicion_y,
        width: 210,
        border: `1px solid ${selected ? "rgba(255,210,74,0.85)" : "rgba(255,210,74,0.35)"}`,
        borderRadius: 8,
        padding: 12,
        background: selected ? "#172033" : "#111827",
        boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
        cursor: "grab",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ minWidth: 0 }}>{node.etiqueta}</strong>
      </div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>{node.tipo_label ?? node.tipo}</div>
      <div style={{ color: "#ffd24a", fontSize: 13, fontWeight: 900, marginTop: 8 }}>
        {formatBolivianos(node.valor)} {Number(node.porcentaje) > 0 ? `- ${node.porcentaje}%` : ""}
      </div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 11, marginTop: 6 }}>
        {frequency || "Sin frecuencia"} {status ? `- ${status}` : ""}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
        <Button size="sm" variant="outline" onClick={onEdit}>Editar</Button>
        <Button size="sm" variant="danger" onClick={onDelete}>Eliminar</Button>
      </div>
    </div>
  );
}
