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
    return [{ label: "Selecciona espacio...", value: "" }, ...res.map((e) => ({ label: e.nombre, value: e.id }))];
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
    !!actividadId &&
    actividadValida &&
    new Date(finISO).getTime() > new Date(inicioISO).getTime();

  const submit = async () => {
    setUiError(null);

    if (!clienteId) {
      setUiError("Selecciona un cliente o crealo rapido.");
      return;
    }

    if (!espacioId || !actividadId) {
      setUiError("Selecciona un espacio y una actividad.");
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

  return (
    <div style={{ display: "grid", gap: 16, color: "#f8fafc" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          border: "1px solid #263244",
          borderRadius: 10,
          background: "#0b1220",
          padding: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800 }}>Dia seleccionado</div>
          <div style={{ fontSize: 20, color: "#f8fafc", fontWeight: 950 }}>{day}</div>
        </div>
        <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 800 }}>
          Completa cliente, espacio, actividad y horario.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <ClientePicker
            clientes={clientesList}
            selectedId={clienteId}
            onSelect={setClienteId}
            onOpenCreate={() => setCreateClienteOpen(true)}
            loading={loading || clientes.loading}
          />

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
            disabled={!espacioId}
          />

          {!actividadValida && (
            <div style={{ padding: 10, borderRadius: 8, border: "1px solid #ff5252", color: "#fecaca", background: "#3f1111", fontWeight: 800 }}>
              Ese espacio no tiene asignada la actividad seleccionada.
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <TimeRangePicker
            inicioHHMM={inicioHHMM}
            onInicioChange={onInicioChange}
            finHHMM={finHHMM}
            onFinChange={setFinHHMM}
            minuteStep={5}
            disabled={!espacioId || !actividadId}
          />

          <Input label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />

          <div style={{ border: "1px solid #263244", borderRadius: 10, padding: 14, background: "#0b1220", color: "#f8fafc" }}>
            <div style={{ fontWeight: 950, marginBottom: 6, color: "#ffd24a" }}>Costo estimado</div>

            {costo.mode === "bloques" ? (
              <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.4 }}>
                <div>
                  Duracion: <b>{costo.minutos} min</b> / Base: <b>{costo.baseMin} min/bloque</b> / Bloques usados: <b>{formatNumber(costo.bloques)}</b>
                </div>
                <div>
                  Precio: <b>Bs {costo.precioRef}</b> por bloque / Total: <b>Bs {costo.total}</b>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.4 }}>
                <div>
                  Duracion: <b>{costo.minutos} min</b> / Horas: <b>{costo.horas.toFixed(2)}</b>
                </div>
                <div>
                  Precio: <b>Bs {costo.precioRef}</b> por hora / Total: <b>Bs {costo.total}</b>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                  Para costo por bloques debe existir relacion EspacioActividad con duracion y precio.
                </div>
              </div>
            )}
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

      <Button onClick={() => void submit()} disabled={loading || !canSubmit} fullWidth>
        {loading ? <Loader label="Guardando..." /> : "Crear reserva"}
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
