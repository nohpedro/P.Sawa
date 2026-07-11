import { useState } from "react";
import Button from "../../../components/ui/Button";
import DateInput from "../../../components/ui/DateInput";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import type { BusinessFixedExpense, BusinessFixedExpenseWriteDTO, ExpenseFrequency, ExpenseStatus, GoalPriority } from "../../../models/businessGoals";
import { goalPriorities, selectStyle } from "../constants";
import { fixedExpenseSplitLabel, previewSplitAmount, type FixedExpenseSplitMode } from "../utils/fixedExpenses";
import { money } from "../utils/goalCalculations";
import { validateFixedExpenseDraft } from "../utils/validations";
import ModalShell from "./ModalShell";

const emptyExpense = (): BusinessFixedExpenseWriteDTO => ({ nombre: "", categoria: "servicios", monto: "0", frecuencia: "monthly", frecuencia_dias: 30, fecha_pago: new Date().toISOString().slice(0, 10), prioridad: "media", estado: "activo", proveedor: "", notas: "" });

export default function FixedExpenseModal({ expense, loading, onClose, onSubmit }: { expense?: BusinessFixedExpense; loading: boolean; onClose: () => void; onSubmit: (draft: BusinessFixedExpenseWriteDTO, splitMode: FixedExpenseSplitMode) => void }) {
  const [draft, setDraft] = useState<BusinessFixedExpenseWriteDTO>(expense ? { nombre: expense.nombre, categoria: expense.categoria, monto: expense.monto, frecuencia: expense.frecuencia, frecuencia_dias: expense.frecuencia_dias, fecha_pago: expense.fecha_pago, prioridad: expense.prioridad, estado: expense.estado, proveedor: expense.proveedor, notas: expense.notas } : emptyExpense());
  const [splitMode, setSplitMode] = useState<FixedExpenseSplitMode>("none");
  const set = (patch: Partial<BusinessFixedExpenseWriteDTO>) => setDraft((state) => ({ ...state, ...patch }));
  const validation = validateFixedExpenseDraft(draft);
  const splitAmount = previewSplitAmount(draft.monto, splitMode);
  const baseName = draft.nombre.replace(/\s+(Semanal|Diario)$/i, "").trim();
  const splitName = splitMode === "none" ? baseName : `${baseName} ${fixedExpenseSplitLabel(splitMode)}`.trim();
  return (
    <ModalShell title={expense ? "Editar gasto fijo" : "Nuevo gasto fijo"} subtitle="Salarios, servicios, alquiler, impuestos, proveedores o mantenimiento." onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <Input label="Nombre" value={draft.nombre} onChange={(e) => set({ nombre: e.target.value })} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Input label="Categoria" value={draft.categoria} onChange={(e) => set({ categoria: e.target.value })} />
          <Input label="Monto" type="number" step="0.01" value={draft.monto} onChange={(e) => set({ monto: e.target.value })} />
          <DateInput label="Fecha pago" value={draft.fecha_pago} onChange={(e) => set({ fecha_pago: e.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12 }}>Frecuencia</span><select value={draft.frecuencia} onChange={(e) => set({ frecuencia: e.target.value as ExpenseFrequency })} style={selectStyle}><option value="once">Una vez</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="custom_days">Cada dias</option></select></label>
          <Input label="Dias" type="number" min="1" value={String(draft.frecuencia_dias)} onChange={(e) => set({ frecuencia_dias: Number(e.target.value) })} />
          <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12 }}>Prioridad</span><select value={draft.prioridad} onChange={(e) => set({ prioridad: e.target.value as GoalPriority })} style={selectStyle}>{goalPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12 }}>Estado</span><select value={draft.estado} onChange={(e) => set({ estado: e.target.value as ExpenseStatus })} style={selectStyle}><option value="activo">Activo</option><option value="pausado">Pausado</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option><option value="cancelado">Cancelado</option></select></label>
        </div>
        <Input label="Proveedor" value={draft.proveedor} onChange={(e) => set({ proveedor: e.target.value })} />
        <Input label="Notas" value={draft.notas} onChange={(e) => set({ notas: e.target.value })} />
        <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12, display: "grid", gap: 10, background: "rgba(255,255,255,0.02)" }}>
          <div>
            <strong>Dividir gasto</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
              Usa el monto ingresado como base. Semanal divide entre 4 y diario divide entre 30.
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {(["none", "weekly", "daily"] as FixedExpenseSplitMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSplitMode(mode)}
                style={{
                  border: `1px solid ${splitMode === mode ? "#ffd24a" : "var(--color-border)"}`,
                  borderRadius: 8,
                  background: splitMode === mode ? "rgba(255,210,74,0.12)" : "#0f1420",
                  color: "var(--color-text)",
                  cursor: "pointer",
                  fontWeight: 900,
                  padding: "10px 12px",
                }}
              >
                {fixedExpenseSplitLabel(mode)}
              </button>
            ))}
          </div>
          {splitMode !== "none" && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--color-text)", fontSize: 13 }}>
              <span>Se guardara: <strong>{splitName || fixedExpenseSplitLabel(splitMode)}</strong></span>
              <span>Monto: <strong style={{ color: "#ffd24a" }}>{money(splitAmount)}</strong></span>
            </div>
          )}
        </div>
        <Button fullWidth disabled={loading || !!validation} onClick={() => onSubmit(draft, splitMode)}>{loading ? <Loader label="Guardando..." /> : splitMode === "none" ? "Guardar gasto" : "Guardar gasto dividido"}</Button>
      </div>
    </ModalShell>
  );
}
