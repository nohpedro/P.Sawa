import Button from "../../../components/ui/Button";
import type { InventoryPurchaseBatch } from "../../../models/inventory";
import type { BusinessFixedExpense } from "../../../models/businessGoals";
import { formatBolivianos } from "../../../utils/currency";
import type { AutomaticVariableKind } from "../components/GoalNodeBoard";
import ModalShell from "./ModalShell";

type AutomaticVariableOption = {
  kind: AutomaticVariableKind;
  label: string;
  description: string;
};

const cardStyle = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.025)",
  padding: 12,
  display: "grid",
  gap: 8,
} as const;

export default function GoalVariablePickerModal({
  expenses,
  batches,
  automaticVariables,
  loading,
  onClose,
  onSelectExpense,
  onSelectBatch,
  onSelectAutomatic,
}: {
  expenses: BusinessFixedExpense[];
  batches: InventoryPurchaseBatch[];
  automaticVariables: AutomaticVariableOption[];
  loading: boolean;
  onClose: () => void;
  onSelectExpense: (expense: BusinessFixedExpense) => void;
  onSelectBatch: (batch: InventoryPurchaseBatch) => void;
  onSelectAutomatic: (kind: AutomaticVariableKind) => void;
}) {
  const empty = expenses.length === 0 && batches.length === 0 && automaticVariables.length === 0;

  return (
    <ModalShell title="Seleccionar variable existente" subtitle="Elige una variable y luego conectala desde la meta dentro del mapa." onClose={onClose}>
      <div style={{ display: "grid", gap: 16 }}>
        {empty && (
          <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
            No hay variables disponibles para agregar. Las variables ya asignadas no se muestran en esta lista.
          </div>
        )}

        {expenses.length > 0 && (
          <section style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 950 }}>Gastos fijos</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>Gastos existentes registrados en el modulo.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {expenses.map((expense) => (
                <div key={expense.id} style={{ ...cardStyle, borderColor: "rgba(245,158,11,0.42)", background: "rgba(245,158,11,0.07)" }}>
                  <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 950, textTransform: "uppercase" }}>Gasto fijo</div>
                  <strong>{expense.nombre}</strong>
                  <div style={{ color: "#fbbf24", fontWeight: 950 }}>{formatBolivianos(expense.monto)}</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{expense.categoria} - {expense.frecuencia} - {expense.estado}</div>
                  <Button size="sm" disabled={loading} onClick={() => onSelectExpense(expense)}>Seleccionar</Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {batches.length > 0 && (
          <section style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 950 }}>Gastos variables: lotes de compra</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                Selecciona una compra de inventario para asignarla a esta meta. Solo se sumara despues de asignarla.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {batches.map((batch) => (
                <div key={batch.id} style={{ ...cardStyle, borderColor: "rgba(248,113,113,0.48)", background: "rgba(248,113,113,0.08)" }}>
                  <div style={{ color: "#fca5a5", fontSize: 10, fontWeight: 950, textTransform: "uppercase" }}>Gasto variable</div>
                  <strong>{batch.item_nombre ?? "Lote de inventario"}</strong>
                  <div style={{ color: "#fca5a5", fontWeight: 950 }}>{formatBolivianos(batch.costo_total)}</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                    Compra: {batch.fecha_compra} - Cantidad: {batch.cantidad}
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                    {batch.proveedor || "Sin proveedor"}{batch.compra_por_mayor ? " - Por mayor" : ""}
                  </div>
                  <Button size="sm" disabled={loading} onClick={() => onSelectBatch(batch)}>Asignar a la meta</Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {automaticVariables.length > 0 && (
          <section style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 950 }}>Entradas del sistema</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>Datos automaticos que se calculan desde ventas y reservas.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {automaticVariables.map((variable) => (
                <div key={variable.kind} style={{ ...cardStyle, borderColor: "rgba(142,229,159,0.42)", background: "rgba(142,229,159,0.07)" }}>
                  <div style={{ color: "#8ee59f", fontSize: 10, fontWeight: 950, textTransform: "uppercase" }}>Entrada automatica</div>
                  <strong>{variable.label}</strong>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{variable.description}</div>
                  <Button size="sm" disabled={loading} onClick={() => onSelectAutomatic(variable.kind)}>Seleccionar</Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ModalShell>
  );
}
