import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";
import Loader from "../ui/Loader";
import type { Reserva, ReservaWriteDTO } from "../../models/reserva";
import { combineDateAndTimeToISO, formatHHMM } from "../../utils/date";
import ClockTimePicker, { type HHMM } from "./ClockTimePicker";
import FullScreenModal from "./FullScreenModal";
import { addMinutes, hhmmToMinutes, rangesOverlap, reservationEndMinutes, reservationStartMinutes } from "./reservationTime";

type ExtendReservationPayload = Pick<ReservaWriteDTO, "fin">;

function clienteLabel(reservation: Reserva): string {
  return `${reservation.cliente_nombre ?? ""} ${reservation.cliente_apellido ?? ""}`.trim() || reservation.usuario_username || "Cliente";
}

export default function ExtendReservationModal({
  open,
  reservation,
  day,
  dayReservations,
  loading,
  onClose,
  onExtend,
}: {
  open: boolean;
  reservation: Reserva | null;
  day: string;
  dayReservations: Reserva[];
  loading: boolean;
  onClose: () => void;
  onExtend: (id: string, payload: ExtendReservationPayload) => Promise<void>;
}) {
  const [newEndHHMM, setNewEndHHMM] = useState<HHMM>("20:30");
  const [error, setError] = useState<string | null>(null);

  const currentEndHHMM = reservation ? (formatHHMM(reservation.fin) as HHMM) : "20:00";
  const currentStartMinutes = reservation ? reservationStartMinutes(reservation) : 0;
  const currentEndMinutes = reservation ? reservationEndMinutes(reservation) : 0;
  const newEndMinutes = hhmmToMinutes(newEndHHMM);
  const minimumEndHHMM = addMinutes(currentEndHHMM, 5);

  useEffect(() => {
    if (!reservation || !open) return;
    setNewEndHHMM(addMinutes(formatHHMM(reservation.fin) as HHMM, 30));
    setError(null);
  }, [open, reservation]);

  const overlappingReservation = useMemo(() => {
    if (!reservation || newEndMinutes <= currentStartMinutes) return null;
    return dayReservations
      .filter((item) => item.id !== reservation.id)
      .filter((item) => item.espacio === reservation.espacio)
      .filter((item) => !["CANCELADA", "FINALIZADA"].includes(item.estado_reserva))
      .find((item) => rangesOverlap(currentStartMinutes, newEndMinutes, reservationStartMinutes(item), reservationEndMinutes(item))) ?? null;
  }, [currentStartMinutes, dayReservations, newEndMinutes, reservation]);

  const submit = async () => {
    if (!reservation) return;
    setError(null);
    if (newEndMinutes <= currentEndMinutes) {
      setError(`La nueva hora fin debe ser posterior a ${currentEndHHMM}.`);
      return;
    }
    if (overlappingReservation) {
      setError(`La ampliacion se solapa con ${formatHHMM(overlappingReservation.inicio)} - ${formatHHMM(overlappingReservation.fin)}.`);
      return;
    }
    await onExtend(reservation.id, { fin: combineDateAndTimeToISO(day, newEndHHMM) });
  };

  return (
    <FullScreenModal
      open={open}
      title="Ampliar reserva"
      subtitle="Extiende la hora de finalizacion y actualiza el monto de la reserva."
      onClose={onClose}
    >
      {!reservation ? null : (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, border: "1px solid #263244", borderRadius: 10, background: "#0b1220", padding: 12 }}>
            {[
              ["Cliente", clienteLabel(reservation)],
              ["Espacio", reservation.espacio_nombre ?? reservation.espacio],
              ["Horario actual", `${formatHHMM(reservation.inicio)} - ${currentEndHHMM}`],
              ["Nueva hora fin", newEndHHMM],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 850 }}>{label}</div>
                <div style={{ color: label === "Nueva hora fin" ? "#ffd24a" : "#f8fafc", fontSize: 14, fontWeight: 900, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          <ClockTimePicker
            label="Nueva hora de finalizacion"
            value={newEndHHMM}
            onChange={(value) => { setNewEndHHMM(value); setError(null); }}
            minuteStep={5}
            minValue={minimumEndHHMM}
            disabled={loading}
          />

          <div style={{ border: `1px solid ${overlappingReservation ? "#ff5252" : "rgba(142,229,159,0.32)"}`, borderRadius: 10, background: overlappingReservation ? "#3f1111" : "#0b1220", padding: 12, color: overlappingReservation ? "#fecaca" : "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
            {overlappingReservation ? `Horario ocupado: se cruza con ${formatHHMM(overlappingReservation.inicio)} - ${formatHHMM(overlappingReservation.fin)}.` : "El nuevo horario esta disponible. El sistema recalculara la duracion y el monto."}
          </div>

          {error && <div style={{ color: "#fecaca", background: "#3f1111", border: "1px solid #ff5252", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 800 }}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={() => void submit()} disabled={loading || !!overlappingReservation || newEndMinutes <= currentEndMinutes}>
              {loading ? <Loader label="Actualizando..." /> : "Guardar extension"}
            </Button>
          </div>
        </div>
      )}
    </FullScreenModal>
  );
}
