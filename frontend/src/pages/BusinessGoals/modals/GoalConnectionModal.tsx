import { useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import type { BusinessGoalConnection } from "../../../models/businessGoals";
import { panelStyle, selectStyle } from "../constants";
import ModalShell from "./ModalShell";

type ConnectionDraft = Pick<BusinessGoalConnection, "operador" | "peso">;

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

  return (
    <ModalShell
      title="Editar conexion"
      subtitle="Define como participa esta variable en el calculo de la meta."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ ...panelStyle, display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Origen</div>
          <strong>{connection.source_label ?? "Variable"}</strong>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Destino: {connection.target_label ?? "Meta"}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(150px, 220px) minmax(150px, 1fr)", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12 }}>Operacion</span>
            <select
              value={draft.operador}
              onChange={(event) => setDraft((state) => ({ ...state, operador: event.target.value }))}
              style={selectStyle}
            >
              <option value="+">Sumar</option>
              <option value="-">Restar</option>
              <option value="*">Multiplicar</option>
            </select>
          </label>
          <Input
            label="Peso"
            type="number"
            step="0.01"
            min="0"
            value={draft.peso}
            onChange={(event) => setDraft((state) => ({ ...state, peso: event.target.value }))}
          />
        </div>

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
