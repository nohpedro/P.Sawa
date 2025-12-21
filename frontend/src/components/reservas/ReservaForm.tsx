// src/components/reservas/ReservaForm.tsx
import { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
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
export default function ReservaForm({
  day,
  onSubmit,
  loading,
}: {
  day: string; // YYYY-MM-DD
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
  const [inicioHHMM, setInicioHHMM] = useState("19:00");
  const [finHHMM, setFinHHMM] = useState("20:00");
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
    const res = actividadesDisponiblesParaEspacio;
    return [
      { label: espacioId ? "Selecciona actividad..." : "Selecciona un espacio primero...", value: "" },
      ...res.map((t) => ({ label: t.nombre, value: t.id })),
    ];
  }, [actividadesDisponiblesParaEspacio, espacioId]);

  const relEA = useMemo(() => {
    const rels = ea.data?.results ?? [];
    return rels.find((r) => r.tipo === actividadId) ?? null;
  }, [ea.data, actividadId]);

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
      setUiError("Selecciona un cliente (o créalo rápido).");
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

  const clientesList = clientes.data?.results ?? [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Nueva reserva" subtitle={`Día seleccionado: ${day}`}>
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
              const v = e.target.value;
              setEspacioId(v);
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
            <div style={{ padding: 10, borderRadius: 12, border: "1px solid #ff3b3b", color: "#ff3b3b", fontWeight: 800 }}>
              Ese espacio no tiene asignada la actividad seleccionada.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Hora inicio" type="time" value={inicioHHMM} onChange={(e) => setInicioHHMM(e.target.value)} />
            <Input label="Hora fin" type="time" value={finHHMM} onChange={(e) => setFinHHMM(e.target.value)} />
          </div>

          <Input label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />

          <div style={{ border: "1px solid var(--color-border)", borderRadius: 14, padding: 14, background: "rgba(255,255,255,0.02)" }}>
            <div style={{ fontWeight: 950, marginBottom: 6 }}>Costo estimado</div>

            {costo.mode === "bloques" ? (
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
                <div>
                  Duración: <b>{costo.minutos} min</b> · Base: <b>{costo.baseMin} min/bloque</b> · Bloques: <b>{costo.bloques}</b>
                </div>
                <div>
                  Precio: <b>Bs {costo.precioRef}</b> por bloque · Total: <b>Bs {costo.total}</b>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
                <div>
                  Duración: <b>{costo.minutos} min</b> · Horas: <b>{costo.horas.toFixed(2)}</b>
                </div>
                <div>
                  Precio: <b>Bs {costo.precioRef}</b> por hora · Total: <b>Bs {costo.total}</b>
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                  * Para costo por bloques, asegúrate que exista relación EspacioActividad (duración/precio) para esa actividad.
                </div>
              </div>
            )}
          </div>

          {uiError && <div style={{ color: "#ff5252", fontSize: 13, fontWeight: 800, whiteSpace: "pre-line" }}>{uiError}</div>}

          <Button onClick={() => void submit()} disabled={loading || !canSubmit} fullWidth>
            {loading ? <Loader label="Guardando..." /> : "Crear reserva"}
          </Button>
        </div>
      </Card>

      {(espacios.error || tipos.error || ea.error || clientes.error) && (
        <div style={{ color: "#ff5252", fontSize: 13 }}>
          {espacios.error || tipos.error || ea.error || clientes.error}
        </div>
      )}

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
