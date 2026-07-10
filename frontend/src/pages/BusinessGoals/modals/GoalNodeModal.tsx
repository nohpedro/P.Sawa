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
    return { goal: goalId, cycle: cycleId ?? null, tipo: "ingreso_manual", etiqueta: "", valor: "0", porcentaje: "100", periodo_inicio: null, periodo_fin: null, posicion_x: 140, posicion_y: 140, config: {} };
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
  const initialIsSystemAutomatic = Boolean(node && (node.tipo === "ventas" || node.tipo === "reservas") && !node.config?.fixed_expense_id);
  const [showAdvancedContribution, setShowAdvancedContribution] = useState(false);
  const [allowSystemEdit, setAllowSystemEdit] = useState(!initialIsSystemAutomatic);
  const set = (patch: Partial<BusinessGoalNodeWriteDTO>) => setDraft((state) => ({ ...state, ...patch }));
  const hasFixedExpense = Boolean(draft.config?.fixed_expense_id);
  const isSystemAutomatic = (draft.tipo === "ventas" || draft.tipo === "reservas") && !hasFixedExpense;
  const canEditFields = !isSystemAutomatic || allowSystemEdit;
  const appliedAmount = (Number(draft.valor || 0) * Number(draft.porcentaje || 0)) / 100;
  const valueLabel = hasFixedExpense ? "Monto del gasto fijo" : "Monto base";
  const valueHint = hasFixedExpense
    ? "Se completa desde el gasto fijo. Puedes ajustarlo solo para esta meta si corresponde."
    : "Monto inicial de la variable. En ventas o reservas automaticas normalmente puede quedar en 0.";
  const percentageHint = "Porcion del monto que participa en la meta. 100% usa todo el monto, 50% usa la mitad.";
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
      porcentaje: "100",
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
          <select value={String(draft.config?.fixed_expense_id ?? "")} onChange={(e) => applyExpense(e.target.value)} style={selectStyle} disabled={!canEditFields}>
            <option value="">Variable manual o calculada</option>
            {expenses.map((expense) => (
              <option key={expense.id} value={expense.id}>
                {expense.nombre} - {formatBolivianos(expense.monto)} - {expense.estado}
              </option>
            ))}
          </select>
        </label>
        <Input label="Etiqueta" value={draft.etiqueta} onChange={(e) => set({ etiqueta: e.target.value })} disabled={!canEditFields} />
        <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12 }}>Tipo</span><select value={draft.tipo} onChange={(e) => set({ tipo: e.target.value as GoalNodeType })} style={selectStyle} disabled={!canEditFields}>{nodeTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        {isSystemAutomatic && (
          <div style={{ border: "1px solid rgba(142,229,159,0.24)", borderRadius: 10, background: "rgba(142,229,159,0.06)", padding: 12, display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 950 }}>Variable automatica del sistema</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                Ventas de productos y reservas se actualizan con datos reales del sistema. Sus montos son informativos salvo que habilites la edicion manual.
              </div>
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 850 }}>
              <input type="checkbox" checked={allowSystemEdit} onChange={(event) => setAllowSystemEdit(event.target.checked)} />
              Permitir edicion manual de esta variable
            </label>
          </div>
        )}
        <div
          style={{
            border: "1px solid rgba(255,210,74,0.18)",
            borderRadius: 10,
            background: "rgba(255,210,74,0.04)",
            padding: 12,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 950 }}>Aporte al calculo</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                Monto base x porcentaje aplicado.
              </div>
            </div>
            <strong style={{ color: "#ffd24a", fontSize: 18 }}>{formatBolivianos(appliedAmount)}</strong>
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 850 }}>
            <input type="checkbox" checked={showAdvancedContribution} onChange={(event) => setShowAdvancedContribution(event.target.checked)} disabled={!canEditFields} />
            Mostrar opciones avanzadas de calculo
          </label>
        </div>
        {showAdvancedContribution && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[25, 50, 100].map((value) => (
                <Button key={value} type="button" size="sm" variant={Number(draft.porcentaje) === value ? "primary" : "outline"} onClick={() => set({ porcentaje: String(value) })} disabled={!canEditFields}>
                  {value}%
                </Button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              <Input label={valueLabel} hint={valueHint} type="number" step="0.01" value={draft.valor} onChange={(e) => set({ valor: e.target.value })} disabled={!canEditFields} />
              <Input label="Porcentaje aplicado" hint={percentageHint} type="number" step="0.01" min="0" max="100" value={draft.porcentaje} onChange={(e) => set({ porcentaje: e.target.value })} disabled={!canEditFields} />
              <DateInput label="Inicio" value={draft.periodo_inicio ?? ""} onChange={(e) => set({ periodo_inicio: e.target.value || null })} disabled={!canEditFields} />
              <DateInput label="Fin" value={draft.periodo_fin ?? ""} onChange={(e) => set({ periodo_fin: e.target.value || null })} disabled={!canEditFields} />
            </div>
          </>
        )}
        <Button fullWidth disabled={loading || !draft.etiqueta.trim()} onClick={() => onSubmit(draft)}>{loading ? <Loader label="Guardando..." /> : node ? "Guardar cambios" : "Guardar nodo"}</Button>
      </div>
    </ModalShell>
  );
}
