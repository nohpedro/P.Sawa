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
      data-graph-ignore-pan="true"
      style={{
        position: "absolute",
        left: position?.x ?? node.posicion_x,
        top: position?.y ?? node.posicion_y,
        width: 220,
        minHeight: 112,
        border: `1px solid ${selected ? "#ffd24a" : "#8ee59f"}`,
        borderRadius: 12,
        padding: 12,
        background: selected ? "rgba(255,210,74,0.14)" : "rgba(142,229,159,0.10)",
        boxShadow: selected ? "0 18px 42px rgba(255,210,74,0.12)" : "0 12px 30px rgba(142,229,159,0.08)",
        cursor: selected ? "grabbing" : "grab",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
    >
      <div style={{ fontSize: 13, fontWeight: 950, lineHeight: 1.25 }}>{node.etiqueta}</div>
      <div style={{ color: "#cbd5e1", fontSize: 11, marginTop: 5 }}>{node.tipo_label ?? node.tipo}</div>
      <div style={{ color: "#ffd24a", fontSize: 12, fontWeight: 950, marginTop: 8 }}>
        {formatBolivianos(node.valor)} {Number(node.porcentaje) > 0 ? `- ${node.porcentaje}%` : ""}
      </div>
      <div style={{ color: "#8ee59f", fontSize: 11, fontWeight: 900, marginTop: 5 }}>
        {frequency || "Sin frecuencia"} {status ? `- ${status}` : ""}
      </div>
      <div data-graph-ignore-pan="true" style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
        <Button size="sm" variant="outline" onClick={onEdit} style={{ padding: "7px 10px" }}>Editar</Button>
        <Button size="sm" variant="danger" onClick={onDelete} style={{ padding: "7px 10px" }}>Eliminar</Button>
      </div>
    </div>
  );
}
