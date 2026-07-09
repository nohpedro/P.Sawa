import { useState } from "react";
import Button from "../../../components/ui/Button";
import DateInput from "../../../components/ui/DateInput";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import type { BusinessFixedExpense, BusinessFixedExpenseWriteDTO, ExpenseFrequency, ExpenseStatus, GoalPriority } from "../../../models/businessGoals";
import { goalPriorities, selectStyle } from "../constants";
import { validateFixedExpenseDraft } from "../utils/validations";
import ModalShell from "./ModalShell";

const emptyExpense = (): BusinessFixedExpenseWriteDTO => ({ nombre: "", categoria: "servicios", monto: "0", frecuencia: "monthly", frecuencia_dias: 30, fecha_pago: new Date().toISOString().slice(0, 10), prioridad: "media", estado: "activo", proveedor: "", notas: "" });

export default function FixedExpenseModal({ expense, loading, onClose, onSubmit }: { expense?: BusinessFixedExpense; loading: boolean; onClose: () => void; onSubmit: (draft: BusinessFixedExpenseWriteDTO) => void }) {
  const [draft, setDraft] = useState<BusinessFixedExpenseWriteDTO>(expense ? { nombre: expense.nombre, categoria: expense.categoria, monto: expense.monto, frecuencia: expense.frecuencia, frecuencia_dias: expense.frecuencia_dias, fecha_pago: expense.fecha_pago, prioridad: expense.prioridad, estado: expense.estado, proveedor: expense.proveedor, notas: expense.notas } : emptyExpense());
  const set = (patch: Partial<BusinessFixedExpenseWriteDTO>) => setDraft((state) => ({ ...state, ...patch }));
  const validation = validateFixedExpenseDraft(draft);
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
        <Button fullWidth disabled={loading || !!validation} onClick={() => onSubmit(draft)}>{loading ? <Loader label="Guardando..." /> : "Guardar gasto"}</Button>
      </div>
    </ModalShell>
  );
}
