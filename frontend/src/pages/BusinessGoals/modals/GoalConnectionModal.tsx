import { useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import type { BusinessGoalConnection } from "../../../models/businessGoals";
import { panelStyle, selectStyle } from "../constants";
import ModalShell from "./ModalShell";

type ConnectionDraft = Pick<BusinessGoalConnection, "operador" | "peso">;

function participationText(operator: string) {
  if (operator === "-") {
    return {
      title: "Salida de dinero",
      tone: "#fbbf24",
      description: "Este gasto se cubre primero. El dinero disponible para la meta se calcula despues de descontarlo.",
      pill: "Descuenta antes de la meta",
    };
  }

  return {
    title: "Entrada de dinero",
    tone: "#8ee59f",
    description: "Esta variable aporta dinero para avanzar la meta. Aplica para reservas, ventas o ingresos.",
    pill: "Suma al avance",
  };
}

export default function GoalConnectionModal({
  connection,
  loading,
  onClose,
  onSubmit,
  onDelete,
}: {
  connection: BusinessGoalConnection;
  loading: boolean;
  onClose: () => void;
  onSubmit: (draft: ConnectionDraft) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<ConnectionDraft>({
    operador: connection.operador || "+",
    peso: connection.peso || "1",
  });
  const [advanced, setAdvanced] = useState(false);
  const participation = participationText(draft.operador);

  return (
    <ModalShell
      title="Editar conexion"
      subtitle="Define si esta variable es entrada de dinero o salida que debe cubrirse antes de la meta."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ ...panelStyle, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Variable</div>
          <strong>{connection.source_label ?? "Variable"}</strong>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Meta: {connection.target_label ?? "Meta"}</div>
        </div>

        <div style={{ border: `1px solid ${participation.tone}66`, borderRadius: 10, background: "rgba(255,255,255,0.025)", padding: 14, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ color: participation.tone }}>{participation.title}</strong>
            <span style={{ border: `1px solid ${participation.tone}66`, color: participation.tone, borderRadius: 999, padding: "5px 9px", fontSize: 12, fontWeight: 900 }}>
              {participation.pill}
            </span>
          </div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{participation.description}</div>
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 850 }}>
          <input type="checkbox" checked={advanced} onChange={(event) => setAdvanced(event.target.checked)} />
          Mostrar opciones avanzadas
        </label>

        {advanced && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 260px) minmax(170px, 1fr)", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12 }}>Tipo de movimiento</span>
              <select
                value={draft.operador}
                onChange={(event) => setDraft((state) => ({ ...state, operador: event.target.value }))}
                style={selectStyle}
              >
                <option value="+">Entrada: suma dinero</option>
                <option value="-">Salida: gasto primero</option>
                <option value="*">Avanzado: multiplicar</option>
              </select>
            </label>
            <Input
              label="Peso"
              hint="Normalmente queda en 1. Usa otro valor solo para ponderaciones especiales."
              type="number"
              step="0.01"
              min="0"
              value={draft.peso}
              onChange={(event) => setDraft((state) => ({ ...state, peso: event.target.value }))}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={() => onSubmit(draft)} disabled={loading}>
            {loading ? <Loader label="Guardando..." /> : "Guardar conexion"}
          </Button>
          <Button variant="danger" onClick={onDelete} disabled={loading}>
            Eliminar relacion
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
