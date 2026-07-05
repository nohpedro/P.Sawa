import { useEffect, useMemo, useState } from "react";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Loader from "../ui/Loader";

import { useEspacios } from "../../hooks/useEspacios";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import { useEspacioActividad } from "../../hooks/useEspacioActividad";
import { useClientes } from "../../hooks/useClientes";

import type { ReservaWriteDTO } from "../../models/reserva";
import type { Espacio } from "../../models/espacio";
import { espacioTieneActividad, calcularCostoPorHora, calcularCostoPorBloques } from "../../utils/reservas";
import { combineDateAndTimeToISO } from "../../utils/date";

import ClientePicker from "../clientes/ClientePicker";
import QuickCreateClienteModal from "../clientes/QuickCreateClienteModal";
import type { ClienteWriteDTO } from "../../models/cliente";

import { extractErrorMessage, humanizeReservaError } from "../../utils/apiError";

import TimeRangePicker from "./TimeRangePicker";
import type { HHMM } from "./ClockTimePicker";

function hhmmToMinutes(v: string): number {
  const [h, m] = v.split(":").map((x) => Number(x));
  return h * 60 + m;
}

function minutesToHHMM(total: number): HHMM {
  const normalized = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad2(h)}:${pad2(m)}` as HHMM;
}

function addMinutes(hhmm: HHMM, add: number): HHMM {
  return minutesToHHMM(hhmmToMinutes(hhmm) + add);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getEspacioEstadoReservaMeta(espacio: Espacio | null): {
  disponible: boolean;
  label: string;
  message: string;
} {
  if (!espacio) {
    return { disponible: true, label: "", message: "" };
  }

  if (espacio.estado_operativo === "MANTENIMIENTO") {
    return {
      disponible: false,
      label: "Mantenimiento",
      message: "Este espacio esta en mantenimiento. No es posible crear reservas hasta que vuelva a estar libre.",
    };
  }

  if (espacio.estado_operativo === "FUERA_DE_SERVICIO") {
    return {
      disponible: false,
      label: "Fuera de servicio",
      message: "Este espacio esta fuera de servicio. Selecciona otro espacio disponible para reservar.",
    };
  }

  return { disponible: true, label: "Libre", message: "" };
}

export default function ReservaForm({
  day,
  onSubmit,
  loading,
}: {
  day: string;
  loading: boolean;
  onSubmit: (payload: ReservaWriteDTO) => Promise<void>;
}) {
  const espacios = useEspacios();
  const tipos = useTiposActividad();
  const ea = useEspacioActividad();
  const clientes = useClientes();

  const [clienteId, setClienteId] = useState("");
  const [espacioId, setEspacioId] = useState("");
  const [actividadId, setActividadId] = useState("");
  const [inicioHHMM, setInicioHHMM] = useState<HHMM>("19:00");
  const [finHHMM, setFinHHMM] = useState<HHMM>("20:00");
  const [notas, setNotas] = useState("");
  const [uiError, setUiError] = useState<string | null>(null);
  const [createClienteOpen, setCreateClienteOpen] = useState(false);

  useEffect(() => {
    espacios.list({ page: "1" }).catch(() => {});
    tipos.list({ page: "1" }).catch(() => {});
    clientes.list({ page: "1" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const espacioObj: Espacio | null = useMemo(() => {
    return (espacios.data?.results ?? []).find((e) => e.id === espacioId) ?? null;
  }, [espacios.data, espacioId]);

  const espacioEstadoReserva = useMemo(() => getEspacioEstadoReservaMeta(espacioObj), [espacioObj]);

  useEffect(() => {
    if (!espacioId) return;
    ea.list({ page: "1", espacio: espacioId }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espacioId]);

  const actividadesDisponiblesParaEspacio = useMemo(() => {
    const all = tipos.data?.results ?? [];
    if (!espacioObj) return [];
    const ids = new Set((espacioObj.actividades ?? []).map((a) => a.id));
    return all.filter((t) => ids.has(t.id));
  }, [tipos.data, espacioObj]);

  const espacioOptions = useMemo(() => {
    const res = espacios.data?.results ?? [];
    return [
      { label: "Selecciona espacio...", value: "" },
      ...res.map((e) => {
        const estado = getEspacioEstadoReservaMeta(e);
        return { label: `${e.nombre} - ${estado.label}`, value: e.id };
      }),
    ];
  }, [espacios.data]);

  const actividadOptions = useMemo(() => {
    return [
      { label: espacioId ? "Selecciona actividad..." : "Selecciona un espacio primero...", value: "" },
      ...actividadesDisponiblesParaEspacio.map((t) => ({ label: t.nombre, value: t.id })),
    ];
  }, [actividadesDisponiblesParaEspacio, espacioId]);

  const relEA = useMemo(() => {
    const rels = ea.data?.results ?? [];
    return rels.find((r) => r.tipo === actividadId) ?? null;
  }, [ea.data, actividadId]);

  useEffect(() => {
    if (!relEA?.duracion_minutos) return;
    setFinHHMM(addMinutes(inicioHHMM, relEA.duracion_minutos));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relEA?.duracion_minutos]);

  const inicioISO = useMemo(() => combineDateAndTimeToISO(day, inicioHHMM), [day, inicioHHMM]);
  const finISO = useMemo(() => combineDateAndTimeToISO(day, finHHMM), [day, finHHMM]);

  const actividadValida = useMemo(() => {
    if (!espacioObj || !actividadId) return true;
    return espacioTieneActividad(espacioObj, actividadId);
  }, [espacioObj, actividadId]);

  const costo = useMemo(() => {
    if (relEA?.duracion_minutos && relEA.precio_base) {
      return {
        mode: "bloques" as const,
        ...calcularCostoPorBloques(inicioISO, finISO, relEA.duracion_minutos, relEA.precio_base),
        precioRef: relEA.precio_base,
        baseMin: relEA.duracion_minutos,
      };
    }
    return {
      mode: "hora" as const,
      ...calcularCostoPorHora(inicioISO, finISO, "0"),
      precioRef: "0",
    };
  }, [inicioISO, finISO, relEA]);

  const canSubmit =
    !!clienteId &&
    !!espacioId &&
    espacioEstadoReserva.disponible &&
    !!actividadId &&
    actividadValida &&
    new Date(finISO).getTime() > new Date(inicioISO).getTime();

  const submit = async () => {
    setUiError(null);

    if (!clienteId) {
      setUiError("Selecciona un cliente o crealo rapido.");
      return;
    }

    if (!espacioId) {
      setUiError("Selecciona un espacio.");
      return;
    }

    if (!espacioEstadoReserva.disponible) {
      setUiError(espacioEstadoReserva.message);
      return;
    }

    if (!actividadId) {
      setUiError("Selecciona una actividad.");
      return;
    }

    if (!actividadValida) {
      setUiError("Ese espacio no tiene asignada la actividad seleccionada.");
      return;
    }

    if (new Date(finISO).getTime() <= new Date(inicioISO).getTime()) {
      setUiError("La hora fin debe ser mayor a la hora inicio.");
      return;
    }

    const payload: ReservaWriteDTO = {
      cliente: clienteId,
      espacio: espacioId,
      actividad: actividadId,
      inicio: inicioISO,
      fin: finISO,
      notas: notas.trim() || undefined,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      const raw = extractErrorMessage(err);
      setUiError(humanizeReservaError(raw));
    }
  };

  const onQuickCreateCliente = async (payload: ClienteWriteDTO) => {
    const created = await clientes.create(payload);
    await clientes.list({ page: "1" });
    setClienteId(created.id);
    return created;
  };

  const onInicioChange = (v: HHMM) => {
    setInicioHHMM(v);

    const i = hhmmToMinutes(v);
    const f = hhmmToMinutes(finHHMM);

    if (f <= i) {
      const step = relEA?.duracion_minutos ?? 60;
      setFinHHMM(minutesToHHMM(i + step));
    }
  };

  const clientesList = clientes.data?.results ?? [];
  const totalLabel = `Bs ${formatNumber(costo.total)}`;
  const durationLabel = `${costo.minutos} min`;

  return (
    <div style={{ display: "grid", gap: 12, color: "#f8fafc" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 8,
          border: "1px solid #263244",
          borderRadius: 8,
          background: "#0b1220",
          padding: 10,
        }}
      >
        {[
          ["Fecha", day],
          ["Horario", `${inicioHHMM} - ${finHHMM}`],
          ["Duracion", durationLabel],
          ["Total", totalLabel],
        ].map(([label, value]) => (
          <div key={label} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 850 }}>{label}</div>
            <div style={{ color: label === "Total" ? "#ffd24a" : "#f8fafc", fontSize: 15, fontWeight: 950, marginTop: 2 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            alignItems: "start",
            border: "1px solid #263244",
            borderRadius: 8,
            background: "#0f1420",
            padding: 12,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <ClientePicker
              clientes={clientesList}
              selectedId={clienteId}
              onSelect={setClienteId}
              onOpenCreate={() => setCreateClienteOpen(true)}
              loading={loading || clientes.loading}
            />
          </div>

          <Select
            label="Espacio"
            options={espacioOptions}
            value={espacioId}
            onChange={(e) => {
              setEspacioId(e.target.value);
              setActividadId("");
            }}
          />

          <Select
            label="Actividad"
            options={actividadOptions}
            value={actividadId}
            onChange={(e) => setActividadId(e.target.value)}
            disabled={!espacioId || !espacioEstadoReserva.disponible}
          />

          {!espacioEstadoReserva.disponible && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ffd24a",
                color: "#fde68a",
                background: "#3a2f0a",
                fontWeight: 850,
                lineHeight: 1.35,
                gridColumn: "1 / -1",
              }}
            >
              {espacioEstadoReserva.message}
            </div>
          )}

          {!actividadValida && (
            <div style={{ padding: 10, borderRadius: 8, border: "1px solid #ff5252", color: "#fecaca", background: "#3f1111", fontWeight: 800, gridColumn: "1 / -1" }}>
              Ese espacio no tiene asignada la actividad seleccionada.
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            alignItems: "start",
            border: "1px solid #263244",
            borderRadius: 8,
            background: "#0f1420",
            padding: 12,
          }}
        >
          <TimeRangePicker
            inicioHHMM={inicioHHMM}
            onInicioChange={onInicioChange}
            finHHMM={finHHMM}
            onFinChange={setFinHHMM}
            minuteStep={5}
            disabled={!espacioId || !actividadId || !espacioEstadoReserva.disponible}
          />

          <div style={{ display: "grid", gap: 10 }}>
            <Input label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones" />

            <div
              style={{
                border: "1px solid rgba(255,210,74,0.28)",
                borderRadius: 8,
                padding: 10,
                background: "#0b1220",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850 }}>Total</span>
                <strong style={{ color: "#ffd24a", fontSize: 22, lineHeight: 1 }}>{totalLabel}</strong>
              </div>

              <div style={{ marginTop: 8, color: "#cbd5e1", fontSize: 12, lineHeight: 1.4 }}>
                {costo.mode === "bloques" ? `${formatNumber(costo.bloques)} bloques de ${costo.baseMin} min` : "Sin precio asignado"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {uiError && (
        <div style={{ color: "#fecaca", background: "#3f1111", border: "1px solid #ff5252", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 800, whiteSpace: "pre-line" }}>
          {uiError}
        </div>
      )}

      {(espacios.error || tipos.error || ea.error || clientes.error) && (
        <div style={{ color: "#fecaca", background: "#3f1111", border: "1px solid #ff5252", borderRadius: 8, padding: 10, fontSize: 13 }}>
          {espacios.error || tipos.error || ea.error || clientes.error}
        </div>
      )}

      <Button onClick={() => void submit()} disabled={loading || !canSubmit} fullWidth size="lg">
        {loading ? <Loader label="Guardando..." /> : `Confirmar reserva - ${totalLabel}`}
      </Button>

      <QuickCreateClienteModal
        open={createClienteOpen}
        onClose={() => setCreateClienteOpen(false)}
        loading={clientes.loading}
        onCreate={async (payload: ClienteWriteDTO) => {
          const created = await onQuickCreateCliente(payload);
          setCreateClienteOpen(false);
          return created;
        }}
      />
    </div>
  );
}
