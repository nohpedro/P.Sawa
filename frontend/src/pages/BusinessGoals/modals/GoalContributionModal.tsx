import { useState } from "react";
import Button from "../../../components/ui/Button";
import DateInput from "../../../components/ui/DateInput";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import type { MovementType } from "../../../models/businessGoals";
import { selectStyle } from "../constants";
import ModalShell from "./ModalShell";

export default function GoalContributionModal({ loading, onClose, onSubmit }: { loading: boolean; onClose: () => void; onSubmit: (payload: any) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({ tipo: "ingreso" as MovementType, concepto: "", monto: "0", fecha: today, categoria: "", notas: "" });
  const set = (patch: Partial<typeof draft>) => setDraft((state) => ({ ...state, ...patch }));
  return (
    <ModalShell title="Registrar movimiento" subtitle="Ingreso, gasto, reserva o ajuste para el ciclo actual." onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12 }}>Tipo</span><select value={draft.tipo} onChange={(e) => set({ tipo: e.target.value as MovementType })} style={selectStyle}><option value="ingreso">Ingreso</option><option value="gasto">Gasto</option><option value="reserva">Reserva</option><option value="ajuste">Ajuste</option></select></label>
          <Input label="Monto" type="number" step="0.01" value={draft.monto} onChange={(e) => set({ monto: e.target.value })} />
        </div>
        <Input label="Concepto" value={draft.concepto} onChange={(e) => set({ concepto: e.target.value })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <DateInput label="Fecha" value={draft.fecha} onChange={(e) => set({ fecha: e.target.value })} />
          <Input label="Categoria" value={draft.categoria} onChange={(e) => set({ categoria: e.target.value })} />
        </div>
        <Input label="Notas" value={draft.notas} onChange={(e) => set({ notas: e.target.value })} />
        <Button fullWidth disabled={loading || !draft.concepto.trim()} onClick={() => onSubmit(draft)}>{loading ? <Loader label="Guardando..." /> : "Registrar"}</Button>
      </div>
    </ModalShell>
  );
}
