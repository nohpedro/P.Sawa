import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Loader from "../ui/Loader";

import { useEspacios } from "../../hooks/useEspacios";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import { useEspacioActividad } from "../../hooks/useEspacioActividad";
import { useClientes } from "../../hooks/useClientes";

import type { Reserva, ReservaPromotionCredit, ReservaWriteDTO } from "../../models/reserva";
import type { Espacio } from "../../models/espacio";
import type { InventoryPromotion, InventoryPromotionPriority } from "../../models/inventory";
import { espacioTieneActividad, calcularCostoPorHora, calcularCostoPorBloques } from "../../utils/reservas";
import { combineDateAndTimeToISO, toYYYYMMDD } from "../../utils/date";
import inventoryService from "../../services/inventory.service";
import reservasService from "../../services/reservas.service";

import ClientePicker from "../clientes/ClientePicker";
import QuickCreateClienteModal from "../clientes/QuickCreateClienteModal";
import type { ClienteWriteDTO } from "../../models/cliente";

import { extractErrorMessage, humanizeReservaError } from "../../utils/apiError";

import TimeRangePicker from "./TimeRangePicker";
import type { HHMM } from "./ClockTimePicker";
import {
  addMinutes,
  dateToHHMM,
  hhmmToMinutes,
  minutesToHHMM,
  rangesOverlap,
  reservationEndMinutes,
  reservationStartMinutes,
} from "./reservationTime";

const panelStyle = {
  border: "1px solid #263244",
  borderRadius: 8,
  background: "#0b1220",
  padding: 10,
};

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
  reservations = [],
  onSubmit,
  loading,
}: {
  day: string;
  reservations?: Reserva[];
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
  const [recommendedOpen, setRecommendedOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    espacios.list({ page: "1" }).catch(() => {});
    tipos.list({ page: "1" }).catch(() => {});
    clientes.list({ page: "1" }).catch(() => {});
    inventoryService.listPromotions({ page: "1", page_size: "100", activo: "true" }).then((res) => setPromotions(res.results ?? [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
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
  const startsInPast = useMemo(() => new Date(inicioISO).getTime() < nowTick, [inicioISO, nowTick]);
  const minStartHHMM = useMemo(() => {
    const now = new Date(nowTick);
    return day === toYYYYMMDD(now) ? dateToHHMM(now) : undefined;
  }, [day, nowTick]);
  const selectedRangeMinutes = useMemo(() => {
    return {
      start: hhmmToMinutes(inicioHHMM),
      end: hhmmToMinutes(finHHMM),
    };
  }, [finHHMM, inicioHHMM]);
  const recommendedDuration = useMemo(() => {
    const selectedDuration = selectedRangeMinutes.end - selectedRangeMinutes.start;
    return Math.max(15, selectedDuration > 0 ? selectedDuration : relEA?.duracion_minutos || 60);
  }, [relEA?.duracion_minutos, selectedRangeMinutes.end, selectedRangeMinutes.start]);

  useEffect(() => {
    if (!minStartHHMM || hhmmToMinutes(inicioHHMM) >= hhmmToMinutes(minStartHHMM)) return;
    setInicioHHMM(minStartHHMM);
    if (hhmmToMinutes(finHHMM) <= hhmmToMinutes(minStartHHMM)) {
      setFinHHMM(addMinutes(minStartHHMM, relEA?.duracion_minutos ?? 60));
    }
  }, [finHHMM, inicioHHMM, minStartHHMM, relEA?.duracion_minutos]);

  const activeReservationsForSpace = useMemo(() => {
    if (!espacioId) return [];
    return reservations
      .filter((reservation) => reservation.espacio === espacioId && !["CANCELADA", "FINALIZADA"].includes(reservation.estado_reserva))
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }, [espacioId, reservations]);

  const overlappingReservation = useMemo(() => {
    if (!espacioId || selectedRangeMinutes.end <= selectedRangeMinutes.start) return null;
    return activeReservationsForSpace.find((reservation) =>
      rangesOverlap(selectedRangeMinutes.start, selectedRangeMinutes.end, reservationStartMinutes(reservation), reservationEndMinutes(reservation))
    ) ?? null;
  }, [activeReservationsForSpace, espacioId, selectedRangeMinutes]);

  useEffect(() => {
    if (uiError?.startsWith("Horario reservado") && !overlappingReservation) {
      setUiError(null);
    }
  }, [overlappingReservation, uiError]);

  const recommendedSlots = useMemo(() => {
    if (!espacioId) return [];
    const dayStart = 7 * 60;
    const dayEnd = 23 * 60;
    const latestStart = Math.max(dayStart, dayEnd - recommendedDuration);
    const preferredStart = Math.min(Math.max(selectedRangeMinutes.start, dayStart), latestStart);
    const availableStarts: number[] = [];

    for (let start = dayStart; start + recommendedDuration <= dayEnd; start += 30) {
      const end = start + recommendedDuration;
      const busy = activeReservationsForSpace.some((reservation) =>
        rangesOverlap(start, end, reservationStartMinutes(reservation), reservationEndMinutes(reservation))
      );
      if (busy) continue;
      availableStarts.push(start);
    }

    return availableStarts
      .sort((a, b) => Math.abs(a - preferredStart) - Math.abs(b - preferredStart) || a - b)
      .slice(0, 8)
      .map((start) => {
        const end = start + recommendedDuration;
        const inicio = minutesToHHMM(start);
        const fin = minutesToHHMM(end);
        return {
          inicio,
          fin,
          label: `${inicio} - ${fin}`,
          recommended: Math.abs(start - preferredStart) <= 60,
        };
      });
  }, [activeReservationsForSpace, espacioId, recommendedDuration, selectedRangeMinutes.start]);

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
  const receivedText = receivedAmount.trim();
  const parsedReceivedValue = Number(receivedText);
  const hasValidReceivedAmount = receivedText !== "" && Number.isFinite(parsedReceivedValue) && parsedReceivedValue >= 0;
  const receivedValue = hasValidReceivedAmount ? parsedReceivedValue : 0;
  const changeValue = Math.max(0, receivedValue - promoTotal);
  const missingValue = Math.max(0, promoTotal - receivedValue);
  const automaticFreeMinutes = automaticHourPromotion ? decimalHoursToMinutes(automaticHourPromotion.horas_gratis) : 0;
  const automaticFreeEnd = automaticFreeMinutes ? addMinutes(finHHMM, automaticFreeMinutes) : null;

  useEffect(() => {
    if (selectedDiscountId && !discountPromotions.some((promotion) => promotion.id === selectedDiscountId)) {
      setSelectedDiscountId("");
    }
  }, [discountPromotions, selectedDiscountId]);

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];
    if (!day) missing.push("Fecha");
    if (!clienteId) missing.push("Cliente");
    if (!espacioId) missing.push("Espacio");
    if (!actividadId) missing.push("Actividad");
    if (!inicioHHMM) missing.push("Hora de inicio");
    if (!finHHMM) missing.push("Hora de finalizacion");
    if (inicioHHMM && finHHMM && new Date(finISO).getTime() <= new Date(inicioISO).getTime()) missing.push("Hora de finalizacion posterior a la hora de inicio");
    if (!hasValidReceivedAmount) missing.push("Monto recibido");
    return missing;
  }, [actividadId, clienteId, day, finHHMM, finISO, hasValidReceivedAmount, inicioHHMM, inicioISO, espacioId]);

  const canSubmit =
    missingRequiredFields.length === 0 &&
    espacioEstadoReserva.disponible &&
    actividadValida &&
    !overlappingReservation &&
    !startsInPast &&
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

    if (startsInPast) {
      setUiError("La reserva no puede iniciar en una fecha u hora anterior a la actual.");
      return;
    }

    if (!hasValidReceivedAmount) {
      setUiError("Ingresa el monto recibido para confirmar la reserva.");
      return;
    }

    if (overlappingReservation) {
      const busyRange = `${minutesToHHMM(reservationStartMinutes(overlappingReservation))} - ${minutesToHHMM(reservationEndMinutes(overlappingReservation))}`;
      setUiError(`Horario reservado: ${inicioHHMM} - ${finHHMM} se solapa con ${busyRange}.`);
      setRecommendedOpen(true);
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

  const applyRecommendedSlot = (inicio: HHMM, fin: HHMM) => {
    setInicioHHMM(inicio);
    setFinHHMM(fin);
    setUiError(null);
    setRecommendedOpen(false);
  };

  const clientesList = clientes.data?.results ?? [];
  const totalLabel = `Bs ${formatNumber(promoTotal)}`;
  const originalTotalLabel = `Bs ${formatNumber(costo.total)}`;
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
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            alignItems: "start",
            border: "1px solid #263244",
            borderRadius: 10,
            background: "#0f1420",
            padding: 12,
          }}
        >
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
            <TimeRangePicker
              inicioHHMM={inicioHHMM}
              onInicioChange={onInicioChange}
              finHHMM={finHHMM}
              onFinChange={setFinHHMM}
              minuteStep={5}
              disabled={!espacioId || !actividadId || !espacioEstadoReserva.disponible}
              minInicioHHMM={minStartHHMM}
            />

            <div
              style={{
                ...panelStyle,
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                borderColor: overlappingReservation ? "#ff5252" : "#263244",
                background: overlappingReservation ? "#3f1111" : "#0b1220",
              }}
            >
              {overlappingReservation ? (
                <div style={{ color: "#fecaca", fontSize: 12, fontWeight: 850, lineHeight: 1.4 }}>
                  Horario reservado: {inicioHHMM} - {finHHMM} se solapa con{" "}
                  {minutesToHHMM(reservationStartMinutes(overlappingReservation))} - {minutesToHHMM(reservationEndMinutes(overlappingReservation))}.
                </div>
              ) : espacioId && actividadId && espacioEstadoReserva.disponible ? (
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#f8fafc", fontSize: 13, fontWeight: 900 }}>Rango elegido</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                    Busca alternativas cercanas a {inicioHHMM} - {finHHMM}.
                  </div>
                </div>
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 12 }}>
                  Selecciona espacio y actividad para consultar horarios.
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecommendedOpen(true)}
                disabled={!espacioId || !actividadId || !espacioEstadoReserva.disponible}
                style={{ whiteSpace: "nowrap" }}
              >
                Mostrar horarios
              </Button>
            </div>

            <details
              style={{
                ...panelStyle,
                borderColor: "rgba(255,210,74,0.22)",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 950, color: "#f8fafc" }}>
                Promociones y saldo
                <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800, marginLeft: 8 }}>
                  {discountPromotions.length + promotionCredits.length || "sin opciones"}
                </span>
              </summary>

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.45 }}>
                  Horas gratis e items de regalo se aplican solos si cumplen fecha, dia, espacio y prioridad.
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
            </details>
          </div>

          <aside style={{ display: "grid", gap: 10, minWidth: 0 }}>
            <Input label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones" />
            <Input
              label="Monto recibido"
              type="number"
              min="0"
              step="0.01"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              placeholder="Ej: 100"
            />

            <div
              style={{
                border: "1px solid rgba(255,210,74,0.28)",
                borderRadius: 10,
                padding: 12,
                background: "#0b1220",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850 }}>Total</span>
                <strong style={{ color: "#ffd24a", fontSize: 24, lineHeight: 1 }}>{totalLabel}</strong>
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
          </aside>
        </div>
      </div>

      {uiError && (
        <div style={{ color: "#fecaca", background: "#3f1111", border: "1px solid #ff5252", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 800, whiteSpace: "pre-line" }}>
          {uiError}
        </div>
      )}

      {missingRequiredFields.length > 0 && (
        <div style={{ color: "#fde68a", background: "#3a2f0a", border: "1px solid #ffd24a", borderRadius: 8, padding: 10, fontSize: 13, lineHeight: 1.45 }}>
          <strong>Datos obligatorios pendientes:</strong>
          <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
            {missingRequiredFields.map((field) => <li key={field}>{field}</li>)}
          </ul>
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

      {recommendedOpen && createPortal(
        <div
          role="presentation"
          onClick={() => setRecommendedOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            display: "grid",
            placeItems: "center",
            padding: 14,
            background: "rgba(5, 8, 15, 0.72)",
            backdropFilter: "blur(3px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="recommended-slots-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              maxHeight: "80vh",
              overflow: "auto",
              border: "1px solid rgba(255,210,74,0.28)",
              borderRadius: 10,
              background: "#0f172a",
              color: "#f8fafc",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 12 }}>
              <div>
                <h2 id="recommended-slots-title" style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>
                  Horarios disponibles
                </h2>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                  {espacioObj?.nombre ?? "Espacio"} / {day} / duracion {recommendedDuration} min
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRecommendedOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {activeReservationsForSpace.length > 0 && (
                <div style={{ ...panelStyle, display: "grid", gap: 7, padding: 8 }}>
                  <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850 }}>Ocupados</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 62, overflow: "auto" }}>
                    {activeReservationsForSpace.map((reservation) => (
                      <span
                        key={reservation.id}
                        style={{
                          border: "1px solid rgba(255,82,82,0.38)",
                          borderRadius: 999,
                          color: "#fecaca",
                          padding: "5px 8px",
                          fontSize: 11,
                          fontWeight: 850,
                        }}
                      >
                        {minutesToHHMM(reservationStartMinutes(reservation))} - {minutesToHHMM(reservationEndMinutes(reservation))}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ ...panelStyle, display: "grid", gap: 9, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 950 }}>Disponibles</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>
                      Cerca de {inicioHHMM} - {finHHMM}.
                    </div>
                  </div>
                  <strong style={{ color: "#ffd24a" }}>{recommendedSlots.length}</strong>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(124px, 1fr))", gap: 7 }}>
                  {recommendedSlots.map((slot) => (
                    <button
                      key={slot.label}
                      type="button"
                      onClick={() => applyRecommendedSlot(slot.inicio, slot.fin)}
                      style={{
                        border: `1px solid ${slot.recommended ? "rgba(255,210,74,0.48)" : "var(--color-border)"}`,
                        borderRadius: 8,
                        background: slot.recommended ? "rgba(255,210,74,0.08)" : "#0b1220",
                        color: "#f8fafc",
                        padding: 9,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <strong>{slot.label}</strong>
                      <div style={{ color: slot.recommended ? "#ffd24a" : "#94a3b8", fontSize: 11, marginTop: 4, fontWeight: 850 }}>
                        {slot.recommended ? "Recomendado" : "Disponible"}
                      </div>
                    </button>
                  ))}
                  {recommendedSlots.length === 0 && (
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>
                      No se encontraron horarios libres para esa duracion en este dia.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}
    </div>
  );
}
