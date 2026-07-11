import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";
import Loader from "../ui/Loader";
import type { Reserva, ReservaWriteDTO } from "../../models/reserva";
import { combineDateAndTimeToISO, formatHHMM, toYYYYMMDD } from "../../utils/date";
import ClockTimePicker, { type HHMM } from "./ClockTimePicker";
import FullScreenModal from "./FullScreenModal";
import {
  addMinutes,
  dateToHHMM,
  hhmmToMinutes,
  rangesOverlap,
  reservationDurationMinutes,
  reservationEndMinutes,
  reservationStartMinutes,
  roundHHMMToStep,
} from "./reservationTime";

type MoveReservationPayload = Pick<ReservaWriteDTO, "inicio" | "fin">;

function clienteLabel(reservation: Reserva): string {
  return `${reservation.cliente_nombre ?? ""} ${reservation.cliente_apellido ?? ""}`.trim() || reservation.usuario_username || "Cliente";
}

export default function MoveReservationModal({
  open,
  reservation,
  day,
  dayReservations,
  loading,
  onClose,
  onMove,
}: {
  open: boolean;
  reservation: Reserva | null;
  day: string;
  dayReservations: Reserva[];
  loading: boolean;
  onClose: () => void;
  onMove: (id: string, payload: MoveReservationPayload) => Promise<void>;
}) {
  const [inicioHHMM, setInicioHHMM] = useState<HHMM>("19:00");
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const duration = useMemo(() => (reservation ? reservationDurationMinutes(reservation) : 60), [reservation]);
  const finHHMM = useMemo(() => addMinutes(inicioHHMM, duration), [duration, inicioHHMM]);
  const durationLabel = useMemo(() => {
    if (duration >= 60 && duration % 60 === 0) return `${duration / 60} h`;
    return `${duration} min`;
  }, [duration]);
  const isToday = day === toYYYYMMDD(new Date());

  useEffect(() => {
    if (!reservation || !open) return;
    const start = formatHHMM(reservation.inicio) as HHMM;
    const now = new Date();
    const minimumStart = day === toYYYYMMDD(now) ? dateToHHMM(now) : null;
    const nextStart = minimumStart && hhmmToMinutes(start) < hhmmToMinutes(minimumStart) ? minimumStart : start;
    setInicioHHMM(nextStart);
    setError(null);
    setNowTick(Date.now());
  }, [day, open, reservation]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [open]);

  const selectedRange = useMemo(() => {
    return {
      start: hhmmToMinutes(inicioHHMM),
      end: hhmmToMinutes(finHHMM),
    };
  }, [finHHMM, inicioHHMM]);
  const selectedStartISO = useMemo(() => combineDateAndTimeToISO(day, inicioHHMM), [day, inicioHHMM]);
  const selectedStartsInPast = useMemo(() => new Date(selectedStartISO).getTime() < nowTick, [nowTick, selectedStartISO]);
  const minStartHHMM = useMemo(() => {
    const now = new Date(nowTick);
    return day === toYYYYMMDD(now) ? dateToHHMM(now) : undefined;
  }, [day, nowTick]);

  const blockingReservations = useMemo(() => {
    if (!reservation) return [];
    return dayReservations
      .filter((item) => item.id !== reservation.id)
      .filter((item) => item.espacio === reservation.espacio)
      .filter((item) => !["CANCELADA", "FINALIZADA"].includes(item.estado_reserva));
  }, [dayReservations, reservation]);

  const overlappingReservation = useMemo(() => {
    if (!reservation || selectedRange.end <= selectedRange.start) return null;
    return blockingReservations.find((item) =>
      rangesOverlap(selectedRange.start, selectedRange.end, reservationStartMinutes(item), reservationEndMinutes(item))
    ) ?? null;
  }, [blockingReservations, reservation, selectedRange]);

  const onInicioChange = (value: HHMM) => {
    setInicioHHMM(value);
    setError(null);
  };

  const useCurrentTime = () => {
    const roundedNow = roundHHMMToStep(dateToHHMM(new Date()), 5);
    setInicioHHMM(roundedNow);
    setError(null);
  };

  const submit = async () => {
    if (!reservation) return;
    setError(null);

    if (selectedRange.end <= selectedRange.start) {
      setError("La hora fin debe ser mayor a la hora inicio.");
      return;
    }

    if (selectedStartsInPast) {
      setError("No se puede mover la reserva a una fecha u hora anterior a la actual.");
      return;
    }

    if (overlappingReservation) {
      setError(
        `No se puede mover: se solapa con ${formatHHMM(overlappingReservation.inicio)} - ${formatHHMM(overlappingReservation.fin)}.`
      );
      return;
    }

    await onMove(reservation.id, {
      inicio: combineDateAndTimeToISO(day, inicioHHMM),
      fin: combineDateAndTimeToISO(day, finHHMM),
    });
  };

  return (
    <FullScreenModal
      open={open}
      title="Mover reserva"
      subtitle="Reubica el horario si el cliente llego tarde y el nuevo rango esta libre."
      onClose={onClose}
    >
      {!reservation ? null : (
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
              border: "1px solid #263244",
              borderRadius: 10,
              background: "#0b1220",
              padding: 12,
            }}
          >
            {[
              ["Cliente", clienteLabel(reservation)],
              ["Espacio", reservation.espacio_nombre ?? reservation.espacio],
              ["Actividad", reservation.actividad_nombre ?? reservation.actividad],
              ["Actual", `${formatHHMM(reservation.inicio)} - ${formatHHMM(reservation.fin)}`],
              ["Duracion fija", durationLabel],
            ].map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 850 }}>{label}</div>
                <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 900, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignItems: "start" }}>
            <div
              style={{
                display: "grid",
                gap: 12,
                border: "1px solid #263244",
                borderRadius: 10,
                background: "#0b1220",
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 950, color: "#f8fafc" }}>Nuevo horario</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                    Solo puedes mover la hora de inicio; la duracion original se mantiene.
                  </div>
                </div>
                <div
                  style={{
                    border: "1px solid #334155",
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "#111827",
                    color: "#ffd24a",
                    fontWeight: 950,
                    fontSize: 13,
                  }}
                >
                  {inicioHHMM} - {finHHMM}
                </div>
              </div>

              <ClockTimePicker
                label="Nueva hora inicio"
                value={inicioHHMM}
                onChange={onInicioChange}
                minuteStep={5}
                minValue={minStartHHMM}
              />

              <div
                style={{
                  border: "1px solid rgba(148,163,184,0.22)",
                  borderRadius: 8,
                  background: "#111827",
                  padding: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 850 }}>Hora fin calculada</div>
                  <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 2 }}>Mantiene exactamente {durationLabel}.</div>
                </div>
                <strong style={{ color: "#ffd24a", fontSize: 18 }}>{finHHMM}</strong>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  border: `1px solid ${overlappingReservation || selectedStartsInPast ? "#ff5252" : "rgba(142,229,159,0.32)"}`,
                  borderRadius: 10,
                  background: overlappingReservation || selectedStartsInPast ? "#3f1111" : "#0b1220",
                  padding: 12,
                  color: overlappingReservation || selectedStartsInPast ? "#fecaca" : "#cbd5e1",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                {selectedStartsInPast ? (
                  <>
                    <strong>Horario no permitido.</strong> El nuevo inicio no puede estar antes de la fecha y hora actual.
                  </>
                ) : overlappingReservation ? (
                  <>
                    <strong>Horario ocupado.</strong> Se cruza con {formatHHMM(overlappingReservation.inicio)} -{" "}
                    {formatHHMM(overlappingReservation.fin)}.
                  </>
                ) : (
                  <>
                    <strong style={{ color: "#8ee59f" }}>Nuevo horario libre.</strong> Se movera manteniendo la misma reserva.
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="outline" onClick={useCurrentTime} disabled={!isToday || loading}>
                  Usar hora actual
                </Button>
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
                <Button onClick={() => void submit()} disabled={loading || !!overlappingReservation || selectedStartsInPast || selectedRange.end <= selectedRange.start}>
                  {loading ? <Loader label="Moviendo..." /> : "Mover reserva"}
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ color: "#fecaca", background: "#3f1111", border: "1px solid #ff5252", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 800 }}>
              {error}
            </div>
          )}
        </div>
      )}
    </FullScreenModal>
  );
}
