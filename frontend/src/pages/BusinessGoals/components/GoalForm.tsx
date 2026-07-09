import Input from "../../../components/ui/Input";
import DateInput from "../../../components/ui/DateInput";
import type { BusinessGoalWriteDTO, GoalPriority, GoalStatus, GoalType } from "../../../models/businessGoals";
import { goalPriorities, goalStatuses, selectStyle } from "../constants";
import { applyGoalRenewalDefaults } from "../utils/renewalDefaults";

export default function GoalForm({ value, onChange }: { value: BusinessGoalWriteDTO; onChange: (value: BusinessGoalWriteDTO) => void }) {
  const set = (patch: Partial<BusinessGoalWriteDTO>) => onChange(applyGoalRenewalDefaults(value, patch));
  const isRenewable = value.tipo === "renovable";
  const frequencyValue = isRenewable && value.frecuencia_renovacion === "weekly" ? "weekly" : isRenewable ? "monthly" : "";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Input label="Nombre" value={value.nombre} onChange={(event) => set({ nombre: event.target.value })} />
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 12, opacity: 0.85 }}>Descripcion</span>
        <textarea value={value.descripcion} onChange={(event) => set({ descripcion: event.target.value })} rows={3} style={{ ...selectStyle, resize: "vertical" }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Input label="Monto objetivo" type="number" min="0.01" step="0.01" value={value.monto_objetivo} onChange={(event) => set({ monto_objetivo: event.target.value })} />
        <Input label="Recursos reservados" type="number" min="0" step="0.01" value={value.recursos_reservados} onChange={(event) => set({ recursos_reservados: event.target.value })} />
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Prioridad</span>
          <select value={value.prioridad} onChange={(event) => set({ prioridad: event.target.value as GoalPriority })} style={selectStyle}>
            {goalPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <DateInput label="Fecha inicio" value={value.fecha_inicio} onChange={(event) => set({ fecha_inicio: event.target.value })} />
        <DateInput label="Fecha fin" value={value.fecha_fin} onChange={(event) => set({ fecha_fin: event.target.value })} />
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Estado</span>
          <select value={value.estado} onChange={(event) => set({ estado: event.target.value as GoalStatus })} style={selectStyle}>
            {goalStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Tipo</span>
          <select value={value.tipo} onChange={(event) => set({ tipo: event.target.value as GoalType })} style={selectStyle}>
            <option value="no_renovable">No renovable</option>
            <option value="renovable">Renovable</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Frecuencia</span>
          <select value={frequencyValue} onChange={(event) => set({ frecuencia_renovacion: event.target.value as any })} style={selectStyle} disabled={!isRenewable}>
            <option value="">No aplica</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
        </label>
        <DateInput label="Proximo ciclo" value={value.proximo_ciclo ?? ""} onChange={(event) => set({ proximo_ciclo: event.target.value || null })} disabled={!isRenewable} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Manejo de saldo</span>
          <select value={value.manejo_saldo} onChange={(event) => set({ manejo_saldo: event.target.value as any })} style={selectStyle}>
            <option value="reset">Reiniciar saldo</option>
            <option value="carry_over">Arrastrar acumulado</option>
            <option value="reserve_only">Conservar reservado</option>
          </select>
        </label>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 850 }}>
          <input type="checkbox" checked={value.conservar_nodos} onChange={(event) => set({ conservar_nodos: event.target.checked })} />
          Conservar nodos
        </label>
      </div>
    </div>
  );
}
