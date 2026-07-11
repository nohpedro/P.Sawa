import { useEffect, useState } from "react";
import Button from "../../../../components/ui/Button";
import Loader from "../../../../components/ui/Loader";
import type { Espacio } from "../../../../models/espacio";
import type { EspacioActividad } from "../../../../models/actividad";
import type { Reserva } from "../../../../models/reserva";

function reservationClient(reservation: Reserva): string {
  return `${reservation.cliente_nombre ?? ""} ${reservation.cliente_apellido ?? ""}`.trim() || reservation.usuario_username || "Cliente";
}

function reservationDateTime(reservation: Reserva): string {
  const inicio = new Date(reservation.inicio);
  const fin = new Date(reservation.fin);
  return `${inicio.toLocaleDateString("es-BO")} ${inicio.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })} - ${fin.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function RemoveActivityAssignmentModal({
  space,
  relation,
  affectedReservations = [],
  checkingReservations = false,
  loading,
  onClose,
  onConfirm,
}: {
  space: Espacio | null;
  relation: EspacioActividad | null;
  affectedReservations?: Reserva[];
  checkingReservations?: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    setAcknowledged(false);
  }, [relation?.id]);

  if (!relation) return null;

  const hasAffectedReservations = affectedReservations.length > 0;
  const confirmDisabled = loading || checkingReservations || (hasAffectedReservations && !acknowledged);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(5, 8, 15, 0.58)",
        backdropFilter: "blur(2px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-assignment-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          border: "1px solid rgba(255,82,82,0.38)",
          borderRadius: 10,
          background: "var(--color-surface)",
          color: "var(--color-text)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          padding: 18,
        }}
      >
        <h2 id="remove-assignment-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
          Quitar asignacion
        </h2>
        <div style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
          Se eliminara la relacion entre {space?.nombre ?? "este espacio"} y {relation.tipo_nombre ?? "esta actividad"}.
        </div>

        {checkingReservations && (
          <div style={{ marginTop: 14 }}>
            <Loader label="Revisando reservas afectadas..." />
          </div>
        )}

        {!checkingReservations && hasAffectedReservations && (
          <div
            style={{
              marginTop: 14,
              border: "1px solid rgba(255,210,74,0.38)",
              borderRadius: 10,
              background: "rgba(255,210,74,0.07)",
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ color: "#ffd24a", fontWeight: 950 }}>Reservas futuras afectadas</div>
            <div style={{ color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
              Existen reservas en este espacio con esta actividad. Si eliminas la relacion, estas reservas seran canceladas y sus notas de venta dejaran de ser validas.
            </div>

            <div style={{ display: "grid", gap: 8, maxHeight: 220, overflow: "auto" }}>
              {affectedReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    background: "#0f1420",
                    padding: 10,
                    display: "grid",
                    gridTemplateColumns: "minmax(170px, 1fr) minmax(140px, 0.8fr) auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{reservationDateTime(reservation)}</strong>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                      {reservation.espacio_nombre ?? reservation.espacio} - {reservation.actividad_nombre ?? reservation.actividad}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Cliente</div>
                    <strong>{reservationClient(reservation)}</strong>
                  </div>
                  <span style={{ color: "#ffd24a", fontSize: 12, fontWeight: 950 }}>{reservation.estado_reserva}</span>
                </div>
              ))}
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 900 }}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                disabled={loading}
              />
              Entiendo que estas reservas seran canceladas al quitar la actividad.
            </label>
          </div>
        )}

        {!checkingReservations && !hasAffectedReservations && (
          <div style={{ marginTop: 14, color: "var(--color-text-muted)", fontSize: 13 }}>
            No se encontraron reservas futuras activas para esta relacion.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Button variant="danger" onClick={onConfirm} disabled={confirmDisabled} fullWidth>
            {loading ? <Loader label="Quitando..." /> : hasAffectedReservations ? "Cancelar reservas y quitar actividad" : "Quitar actividad"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </section>
    </div>
  );
}
