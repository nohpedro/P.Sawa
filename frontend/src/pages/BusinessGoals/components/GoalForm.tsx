import { useState } from "react";
import DateInput from "../../../components/ui/DateInput";
import Input from "../../../components/ui/Input";
import type { BalanceHandling, BusinessGoalWriteDTO, GoalPriority, GoalStatus } from "../../../models/businessGoals";
import { goalPriorities, goalStatuses, selectStyle } from "../constants";
import { applyGoalRenewalDefaults } from "../utils/renewalDefaults";

type GoalFormMode = "create" | "edit";

function switchStyle(active: boolean) {
  return {
    border: `1px solid ${active ? "rgba(255,210,74,0.42)" : "var(--color-border)"}`,
    borderRadius: 10,
    background: active ? "rgba(255,210,74,0.08)" : "rgba(255,255,255,0.02)",
    padding: 12,
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    cursor: "pointer",
  };
}

export default function GoalForm({
  value,
  onChange,
  mode = "edit",
}: {
  value: BusinessGoalWriteDTO;
  onChange: (value: BusinessGoalWriteDTO) => void;
  mode?: GoalFormMode;
}) {
  const [showReservedResources, setShowReservedResources] = useState(Number(value.recursos_reservados || 0) > 0);
  const isCreate = mode === "create";
  const isRenewable = value.tipo === "renovable";
  const frequencyValue = isRenewable && value.frecuencia_renovacion === "weekly" ? "weekly" : isRenewable ? "monthly" : "";

  const set = (patch: Partial<BusinessGoalWriteDTO>) => {
    const nextPatch = isCreate ? { ...patch, estado: "activa" as GoalStatus } : patch;
    onChange(applyGoalRenewalDefaults(value, nextPatch));
  };

  const toggleReservedResources = (checked: boolean) => {
    setShowReservedResources(checked);
    if (!checked) set({ recursos_reservados: "0" });
  };

  const toggleRenewal = (checked: boolean) => {
    set({
      tipo: checked ? "renovable" : "no_renovable",
      frecuencia_renovacion: checked ? "monthly" : "",
      manejo_saldo: checked ? value.manejo_saldo : "reset",
      conservar_nodos: checked ? value.conservar_nodos : true,
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 950 }}>Informacion principal</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
            Define que quieres lograr y el monto necesario.
          </div>
        </div>

        <Input label="Nombre de la meta" value={value.nombre} onChange={(event) => set({ nombre: event.target.value })} />
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85 }}>Descripcion opcional</span>
          <textarea value={value.descripcion} onChange={(event) => set({ descripcion: event.target.value })} rows={3} style={{ ...selectStyle, resize: "vertical" }} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Input label="Monto objetivo" hint="Total que se necesita alcanzar." type="number" min="0.01" step="0.01" value={value.monto_objetivo} onChange={(event) => set({ monto_objetivo: event.target.value })} />
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Prioridad</span>
            <select value={value.prioridad} onChange={(event) => set({ prioridad: event.target.value as GoalPriority })} style={selectStyle}>
              {goalPriorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          {!isCreate && (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Estado</span>
              <select value={value.estado} onChange={(event) => set({ estado: event.target.value as GoalStatus })} style={selectStyle}>
                {goalStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          )}
        </div>

        {isCreate && (
          <div style={{ border: "1px solid rgba(142,229,159,0.25)", borderRadius: 10, background: "rgba(142,229,159,0.06)", padding: 12, color: "#8ee59f", fontSize: 13, fontWeight: 850 }}>
            La meta se creara activa automaticamente.
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 950 }}>Periodo</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
            Usa fecha inicio y fecha fin. Si la meta se renueva, la fecha fin tambien define el proximo ciclo.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <DateInput label="Fecha inicio" value={value.fecha_inicio} onChange={(event) => set({ fecha_inicio: event.target.value })} />
          <DateInput label="Fecha fin" value={value.fecha_fin} onChange={(event) => set({ fecha_fin: event.target.value, proximo_ciclo: event.target.value || null })} />
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <label style={switchStyle(showReservedResources)}>
          <input type="checkbox" checked={showReservedResources} onChange={(event) => toggleReservedResources(event.target.checked)} />
          <span>
            <strong>Reservar recursos iniciales</strong>
            <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
              Marca esta opcion si ya existe dinero separado para esta meta.
            </span>
          </span>
        </label>
        {showReservedResources && (
          <Input label="Recursos reservados" hint="Monto que ya esta apartado para esta meta." type="number" min="0" step="0.01" value={value.recursos_reservados} onChange={(event) => set({ recursos_reservados: event.target.value })} />
        )}
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <label style={switchStyle(isRenewable)}>
          <input type="checkbox" checked={isRenewable} onChange={(event) => toggleRenewal(event.target.checked)} />
          <span>
            <strong>Renovar esta meta automaticamente</strong>
            <span style={{ display: "block", color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
              Activalo para metas que se repiten por semana o por mes. Si no se activa, la meta se ejecuta una sola vez.
            </span>
          </span>
        </label>

        {isRenewable && (
          <div style={{ border: "1px solid rgba(255,210,74,0.18)", borderRadius: 10, background: "rgba(255,210,74,0.04)", padding: 12, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.85 }}>Frecuencia</span>
                <select value={frequencyValue} onChange={(event) => set({ frecuencia_renovacion: event.target.value as any })} style={selectStyle}>
                  <option value="weekly">Semanal / 7 dias</option>
                  <option value="monthly">Mensual / 30 dias</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.85 }}>Manejo de saldo</span>
                <select value={value.manejo_saldo} onChange={(event) => set({ manejo_saldo: event.target.value as BalanceHandling })} style={selectStyle}>
                  <option value="reset">Reiniciar saldo</option>
                  <option value="carry_over">Arrastrar acumulado</option>
                  <option value="reserve_only">Conservar reservado</option>
                </select>
              </label>
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 850 }}>
              <input type="checkbox" checked={value.conservar_nodos} onChange={(event) => set({ conservar_nodos: event.target.checked })} />
              Conservar nodos y variables en cada ciclo
            </label>
          </div>
        )}
      </section>
    </div>
  );
}
