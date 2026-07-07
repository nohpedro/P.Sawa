import { useEffect, useMemo, useState } from "react";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Loader from "../ui/Loader";

import { useEspacios } from "../../hooks/useEspacios";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import { useEspacioActividad } from "../../hooks/useEspacioActividad";
import { useClientes } from "../../hooks/useClientes";

import type { ReservaPromotionCredit, ReservaWriteDTO } from "../../models/reserva";
import type { Espacio } from "../../models/espacio";
import type { InventoryPromotion, InventoryPromotionPriority } from "../../models/inventory";
import { espacioTieneActividad, calcularCostoPorHora, calcularCostoPorBloques } from "../../utils/reservas";
import { combineDateAndTimeToISO } from "../../utils/date";
import inventoryService from "../../services/inventory.service";
import reservasService from "../../services/reservas.service";

import ClientePicker from "../clientes/ClientePicker";
import QuickCreateClienteModal from "../clientes/QuickCreateClienteModal";
import type { ClienteWriteDTO } from "../../models/cliente";

import { extractErrorMessage, humanizeReservaError } from "../../utils/apiError";

import TimeRangePicker from "./TimeRangePicker";
import type { HHMM } from "./ClockTimePicker";

const panelStyle = {
  border: "1px solid #263244",
  borderRadius: 8,
  background: "#0b1220",
  padding: 10,
};

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

const JS_WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const PRIORITY_RANK: Record<InventoryPromotionPriority, number> = { alta: 3, media: 2, baja: 1 };

function decimalHoursToMinutes(value: string | number | null | undefined): number {
  return Math.round(Number(value ?? 0) * 60);
}

function promotionPriorityRank(value: InventoryPromotionPriority | undefined): number {
  return PRIORITY_RANK[value ?? "media"] ?? 2;
}

function localDateFromISO(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function promotionApplies(promotion: InventoryPromotion, espacioId: string, inicioISO: string, minutes: number): boolean {
  if (!promotion.activo || !inicioISO || minutes <= 0) return false;
  const date = new Date(inicioISO);
  const day = localDateFromISO(inicioISO);
  if (promotion.fecha_inicio && day < promotion.fecha_inicio) return false;
  if (promotion.fecha_fin && day > promotion.fecha_fin) return false;

  const weekday = JS_WEEKDAY_CODES[date.getDay()];
  const days = promotion.dias_semana ? promotion.dias_semana.split(",").filter(Boolean) : [];
  if (days.length && !days.includes(weekday)) return false;

  if (!promotion.aplica_todos_los_espacios && !promotion.espacios.includes(espacioId)) return false;

  if (promotion.tipo === "horas_gratis") {
    return minutes >= decimalHoursToMinutes(promotion.horas_pagadas);
  }

  return !promotion.min_reserva_minutos || minutes >= promotion.min_reserva_minutos;
}

function sortPromotions(a: InventoryPromotion, b: InventoryPromotion): number {
  return promotionPriorityRank(b.prioridad) - promotionPriorityRank(a.prioridad) || a.nombre.localeCompare(b.nombre);
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
  const [promotions, setPromotions] = useState<InventoryPromotion[]>([]);
  const [promotionCredits, setPromotionCredits] = useState<ReservaPromotionCredit[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState("");
  const [selectedCreditId, setSelectedCreditId] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [uiError, setUiError] = useState<string | null>(null);
  const [createClienteOpen, setCreateClienteOpen] = useState(false);

  useEffect(() => {
    espacios.list({ page: "1" }).catch(() => {});
    tipos.list({ page: "1" }).catch(() => {});
    clientes.list({ page: "1" }).catch(() => {});
    inventoryService.listPromotions({ page: "1", page_size: "100", activo: "true" }).then((res) => setPromotions(res.results ?? [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelectedCreditId("");
    if (!clienteId) {
      setPromotionCredits([]);
      return;
    }
    reservasService.listPromotionCredits({ cliente: clienteId }).then(setPromotionCredits).catch(() => setPromotionCredits([]));
  }, [clienteId]);

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

  const applicablePromotions = useMemo(() => {
    return promotions
      .filter((promotion) => promotionApplies(promotion, espacioId, inicioISO, costo.minutos))
      .sort(sortPromotions);
  }, [costo.minutos, espacioId, inicioISO, promotions]);

  const automaticHourPromotion = applicablePromotions.find((promotion) => promotion.tipo === "horas_gratis") ?? null;
  const automaticGiftPromotion = applicablePromotions.find((promotion) => promotion.tipo === "item_regalo") ?? null;
  const discountPromotions = useMemo(() => applicablePromotions.filter((promotion) => promotion.tipo === "descuento"), [applicablePromotions]);
  const selectedDiscount = discountPromotions.find((promotion) => promotion.id === selectedDiscountId) ?? null;
  const selectedCredit = promotionCredits.find((credit) => credit.id === selectedCreditId) ?? null;
  const creditMinutes = selectedCredit ? Math.min(selectedCredit.minutos_disponibles, costo.minutos) : 0;
  const discountPercent = selectedDiscount ? Number(selectedDiscount.descuento_porcentaje) : 0;
  const promoTotal = useMemo(() => {
    if (!costo.minutos) return costo.total;
    const afterCredit = costo.total * Math.max(0, costo.minutos - creditMinutes) / costo.minutos;
    return afterCredit * (1 - discountPercent / 100);
  }, [costo.minutos, costo.total, creditMinutes, discountPercent]);
  const automaticFreeMinutes = automaticHourPromotion ? decimalHoursToMinutes(automaticHourPromotion.horas_gratis) : 0;
  const automaticFreeEnd = automaticFreeMinutes ? addMinutes(finHHMM, automaticFreeMinutes) : null;

  useEffect(() => {
    if (selectedDiscountId && !discountPromotions.some((promotion) => promotion.id === selectedDiscountId)) {
      setSelectedDiscountId("");
    }
  }, [discountPromotions, selectedDiscountId]);

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
      descuento_promocion: selectedDiscountId || null,
      credito_promocion_canjeado: selectedCreditId || null,
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
  const totalLabel = `Bs ${formatNumber(promoTotal)}`;
  const originalTotalLabel = `Bs ${formatNumber(costo.total)}`;
  const receivedValue = Number(receivedAmount || 0);
  const changeValue = Math.max(0, receivedValue - promoTotal);
  const missingValue = Math.max(0, promoTotal - receivedValue);
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
            <Input label="Monto recibido" type="number" min="0" step="0.01" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} placeholder="Ej: 100" />

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
                {(selectedDiscount || selectedCredit) && (
                  <div style={{ marginTop: 4, color: "#94a3b8" }}>Antes de promociones: {originalTotalLabel}</div>
                )}
              </div>
            </div>

            <div style={{ ...panelStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850 }}>Recibido</div>
                <strong style={{ color: "#f8fafc" }}>Bs {formatNumber(receivedValue)}</strong>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850 }}>{missingValue ? "Falta cobrar" : "Cambio"}</div>
                <strong style={{ color: missingValue ? "#ffb4b4" : "#8ee59f" }}>
                  Bs {formatNumber(missingValue || changeValue)}
                </strong>
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(255,210,74,0.22)",
                borderRadius: 8,
                padding: 10,
                background: "#0b1220",
                display: "grid",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 850 }}>Promociones automaticas</div>
                <div style={{ marginTop: 4, color: "#cbd5e1", fontSize: 12, lineHeight: 1.45 }}>
                  Horas gratis e items de regalo se aplican solos si cumplen fecha, dia, espacio y prioridad. Solo el descuento se selecciona manualmente.
                </div>
              </div>

              {automaticHourPromotion && (
                <div style={{ border: "1px solid #2a3243", borderRadius: 8, padding: 10 }}>
                  <strong>{automaticHourPromotion.nombre}</strong>
                  <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 4 }}>
                    Paga {automaticHourPromotion.horas_pagadas}h y recibe {automaticHourPromotion.horas_gratis}h gratis.
                    {automaticFreeEnd ? ` Si esta libre, la reserva se extendera hasta ${automaticFreeEnd}. Si no, quedara saldo pendiente.` : ""}
                  </div>
                </div>
              )}

              {automaticGiftPromotion && (
                <div style={{ border: "1px solid #2a3243", borderRadius: 8, padding: 10 }}>
                  <strong>{automaticGiftPromotion.nombre}</strong>
                  <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 4 }}>
                    Regalo: {automaticGiftPromotion.cantidad_item_regalo} x {automaticGiftPromotion.item_regalo_nombre ?? "item"}.
                  </div>
                </div>
              )}

              {!automaticHourPromotion && !automaticGiftPromotion && (
                <div style={{ color: "#94a3b8", fontSize: 12 }}>No hay promociones automaticas para este horario.</div>
              )}

              <Select
                label="Descuento (opcional)"
                options={[
                  { label: "Sin descuento", value: "" },
                  ...discountPromotions.map((promotion) => ({
                    label: `${promotion.nombre} - ${promotion.descuento_porcentaje}%`,
                    value: promotion.id,
                  })),
                ]}
                value={selectedDiscountId}
                onChange={(event) => setSelectedDiscountId(event.target.value)}
                disabled={!discountPromotions.length}
              />

              <Select
                label="Canjear saldo pendiente"
                options={[
                  { label: "No canjear saldo", value: "" },
                  ...promotionCredits.map((credit) => ({
                    label: `${credit.promocion_nombre ?? "Saldo"} - ${credit.minutos_disponibles} min disponibles`,
                    value: credit.id,
                  })),
                ]}
                value={selectedCreditId}
                onChange={(event) => setSelectedCreditId(event.target.value)}
                disabled={!promotionCredits.length}
              />
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
