import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { BusinessFixedExpense, BusinessFixedExpenseWriteDTO } from "../../models/businessGoals";
import businessGoalsService from "../../services/businessGoals.service";
import { getErrorMessage } from "../../utils/error";
import GoalNav from "./components/GoalNav";
import { panelStyle } from "./constants";
import FixedExpenseModal from "./modals/FixedExpenseModal";
import { buildSplitFixedExpense, fixedExpenseSplitLabel, type FixedExpenseSplitMode } from "./utils/fixedExpenses";
import { money } from "./utils/goalCalculations";

export default function BusinessFixedExpensesPage() {
  const [expenses, setExpenses] = useState<BusinessFixedExpense[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BusinessFixedExpense | null>(null);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" as "info" | "success" | "error" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await businessGoalsService.listExpenses({ page: "1", page_size: "100", ordering: "fecha_pago" });
      setExpenses(res.results ?? []);
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudieron cargar gastos fijos."), type: "error" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? expenses.filter((expense) => `${expense.nombre} ${expense.categoria} ${expense.proveedor}`.toLowerCase().includes(q)) : expenses;
  }, [expenses, query]);

  const save = async (draft: BusinessFixedExpenseWriteDTO, splitMode: FixedExpenseSplitMode = "none") => {
    setLoading(true);
    try {
      const payload = buildSplitFixedExpense(draft, splitMode);
      if (selected && splitMode === "none") await businessGoalsService.patchExpense(selected.id, payload);
      else await businessGoalsService.createExpense(payload);
      setModal(false);
      setSelected(null);
      await load();
      setToast({
        open: true,
        type: "success",
        message: splitMode === "none" ? "Gasto guardado correctamente." : `Gasto ${fixedExpenseSplitLabel(splitMode).toLowerCase()} generado correctamente.`,
      });
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo guardar el gasto."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      <Card title="Gastos fijos" subtitle="Salarios, luz, agua, internet, alquiler, impuestos, proveedores y mantenimiento." rightSlot={<Button onClick={() => { setSelected(null); setModal(true); }}>+ Gasto</Button>}>
        <Input label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
        {loading && <Loader label="Cargando gastos..." />}
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {filtered.map((expense) => (
            <button key={expense.id} type="button" onClick={() => { setSelected(expense); setModal(true); }} style={{ ...panelStyle, color: "var(--color-text)", textAlign: "left", cursor: "pointer" }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px 120px 110px", gap: 12, alignItems: "center" }}>
                <strong>{expense.nombre}</strong>
                <span>{money(expense.monto)}</span>
                <span>{expense.fecha_pago}</span>
                <span style={{ color: expense.estado === "activo" ? "#8ee59f" : "#ffd24a", fontWeight: 900 }}>{expense.estado}</span>
              </div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                {expense.categoria} - {expense.proveedor || "Sin proveedor"} - {expense.frecuencia === "custom_days" ? `Cada ${expense.frecuencia_dias} dia(s)` : expense.frecuencia}
              </div>
            </button>
          ))}
        </div>
      </Card>
      {modal && createPortal(<FixedExpenseModal expense={selected ?? undefined} loading={loading} onClose={() => setModal(false)} onSubmit={save} />, document.body)}
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
