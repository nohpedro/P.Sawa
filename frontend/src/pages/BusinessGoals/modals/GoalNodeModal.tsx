import { useState } from "react";
import Button from "../../../components/ui/Button";
import DateInput from "../../../components/ui/DateInput";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import type { BusinessFixedExpense, BusinessGoalNode, BusinessGoalNodeWriteDTO, GoalNodeType } from "../../../models/businessGoals";
import { formatBolivianos } from "../../../utils/currency";
import { nodeTypes, selectStyle } from "../constants";
import { nodeTypeForFixedExpense } from "../utils/variableMapping";
import ModalShell from "./ModalShell";

function draftFromNode(goalId: string, cycleId?: string, node?: BusinessGoalNode): BusinessGoalNodeWriteDTO {
  if (!node) {
    return { goal: goalId, cycle: cycleId ?? null, tipo: "ingreso_manual", etiqueta: "", valor: "0", porcentaje: "0", periodo_inicio: null, periodo_fin: null, posicion_x: 140, posicion_y: 140, config: {} };
  }

  return {
    goal: node.goal,
    cycle: node.cycle ?? cycleId ?? null,
    tipo: node.tipo,
    etiqueta: node.etiqueta,
    valor: node.valor,
    porcentaje: node.porcentaje,
    periodo_inicio: node.periodo_inicio ?? null,
    periodo_fin: node.periodo_fin ?? null,
    posicion_x: node.posicion_x,
    posicion_y: node.posicion_y,
    config: node.config ?? {},
  };
}

export default function GoalNodeModal({
  goalId,
  cycleId,
  node,
  expenses = [],
  loading,
  onClose,
  onSubmit,
}: {
  goalId: string;
  cycleId?: string;
  node?: BusinessGoalNode | null;
  expenses?: BusinessFixedExpense[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (draft: BusinessGoalNodeWriteDTO) => void;
}) {
  const [draft, setDraft] = useState<BusinessGoalNodeWriteDTO>(draftFromNode(goalId, cycleId, node ?? undefined));
  const set = (patch: Partial<BusinessGoalNodeWriteDTO>) => setDraft((state) => ({ ...state, ...patch }));
  const applyExpense = (expenseId: string) => {
    const expense = expenses.find((item) => item.id === expenseId);
    if (!expense) {
      set({ config: { ...draft.config, fixed_expense_id: "" } });
      return;
    }

    set({
      tipo: nodeTypeForFixedExpense(expense),
      etiqueta: expense.nombre,
      valor: expense.monto,
      config: {
        ...draft.config,
        fixed_expense_id: expense.id,
        frecuencia: expense.frecuencia,
        estado: expense.estado,
        categoria: expense.categoria,
      },
    });
  };

  return (
    <ModalShell title={node ? "Editar nodo" : "Nodo de calculo"} subtitle="Asocia variables financieras guardadas con la meta." onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12 }}>Gasto fijo asociado</span>
          <select value={String(draft.config?.fixed_expense_id ?? "")} onChange={(e) => applyExpense(e.target.value)} style={selectStyle}>
            <option value="">Variable manual o calculada</option>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.nombre} - {formatBolivianos(expense.monto)} - {expense.estado}
              </option>
            ))}
          </select>
        </label>
        <Input label="Etiqueta" value={draft.etiqueta} onChange={(e) => set({ etiqueta: e.target.value })} />
        <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12 }}>Tipo</span><select value={draft.tipo} onChange={(e) => set({ tipo: e.target.value as GoalNodeType })} style={selectStyle}>{nodeTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <Input label="Valor" type="number" step="0.01" value={draft.valor} onChange={(e) => set({ valor: e.target.value })} />
          <Input label="Porcentaje" type="number" step="0.01" value={draft.porcentaje} onChange={(e) => set({ porcentaje: e.target.value })} />
          <DateInput label="Inicio" value={draft.periodo_inicio ?? ""} onChange={(e) => set({ periodo_inicio: e.target.value || null })} />
          <DateInput label="Fin" value={draft.periodo_fin ?? ""} onChange={(e) => set({ periodo_fin: e.target.value || null })} />
        </div>
        <Button fullWidth disabled={loading || !draft.etiqueta.trim()} onClick={() => onSubmit(draft)}>{loading ? <Loader label="Guardando..." /> : node ? "Guardar cambios" : "Guardar nodo"}</Button>
      </div>
    </ModalShell>
  );
}
