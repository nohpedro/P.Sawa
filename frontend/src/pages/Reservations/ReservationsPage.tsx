import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import MonthCalendar from "../../components/reservas/MonthCalendar";
import FullScreenModal from "../../components/reservas/FullScreenModal";
import ReservaForm from "../../components/reservas/ReservaForm";
import ReservationConfirmation from "../../components/reservas/ReservationConfirmation";
import MoveReservationModal from "../../components/reservas/MoveReservationModal";
import ExtendReservationModal from "../../components/reservas/ExtendReservationModal";

import { useReservas } from "../../hooks/useReservas";
import { formatHHMM, toYYYYMMDD } from "../../utils/date";
import type { Reserva, ReservaWriteDTO } from "../../models/reserva";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

function promotionSummary(reservation: Reserva): string {
  const applied = reservation.promociones_aplicadas ?? [];
  if (!applied.length) return "-";
  return applied.map((promotion) => {
    const deliverable = promotion.entregable ?? promotion.tipo === "item_regalo";
    return `${promotion.beneficio || promotion.nombre}${deliverable ? (promotion.entregada ? " (entregada)" : " (pendiente de entrega)") : ""}`;
  }).join(", ");
}

export default function ReservationsPage() {
  const reservas = useReservas();

  const today = useMemo(() => toYYYYMMDD(new Date()), []);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(today);

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [movingReservation, setMovingReservation] = useState<Reserva | null>(null);
  const [extendingReservation, setExtendingReservation] = useState<Reserva | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayReservationsOpen, setDayReservationsOpen] = useState(true);
  const [hourQuery, setHourQuery] = useState("");
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const loadDay = async (day: string) => {
    await reservas.list({ page: "1", desde: day, hasta: day });
  };

  useEffect(() => {
    loadDay(selectedDay).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const rows = reservas.data?.results ?? [];
  const filteredRows = useMemo(() => {
    const query = hourQuery.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((reservation) => {
      const inicio = formatHHMM(reservation.inicio);
      const fin = formatHHMM(reservation.fin);
      const haystack = [
        inicio,
        fin,
        `${inicio} - ${fin}`,
        reservation.espacio_nombre ?? reservation.espacio,
        reservation.actividad_nombre ?? reservation.actividad,
        promotionSummary(reservation),
        `${reservation.cliente_nombre ?? ""} ${reservation.cliente_apellido ?? ""}`,
        reservation.usuario_username ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [hourQuery, rows]);

  const monthLabel = useMemo(() => {
    const m = month.toLocaleString("es-BO", { month: "long" });
    return `${m.charAt(0).toUpperCase() + m.slice(1)} ${month.getFullYear()}`;
  }, [month]);
  const currentMonthName = useMemo(() => {
    const now = new Date();
    const m = now.toLocaleString("es-BO", { month: "long" });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, []);
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear();
  }, [month]);
  const selectedDayInPast = selectedDay < today;

  const onDoubleClickDay = (day: string) => {
    if (day < today) {
      setToast({ open: true, message: "No se pueden crear reservas en fechas anteriores a hoy.", type: "info" });
      return;
    }
    setSelectedDay(day);
    setModalOpen(true);
  };

  const openCreateReservation = () => {
    if (selectedDayInPast) {
      setToast({ open: true, message: "Selecciona una fecha actual o futura para crear la reserva.", type: "info" });
      return;
    }
    setModalOpen(true);
  };

  const onSubmit = async (payload: ReservaWriteDTO) => {
    await reservas.create(payload);
    setModalOpen(false);
    setConfirmationOpen(true);
    await loadDay(selectedDay);
  };

  const onMoveReservation = async (id: string, payload: Pick<ReservaWriteDTO, "inicio" | "fin">) => {
    await reservas.patch(id, payload);
    setMovingReservation(null);
    setToast({ open: true, message: "Reserva movida correctamente.", type: "success" });
    await loadDay(selectedDay);
  };

  const onExtendReservation = async (id: string, payload: Pick<ReservaWriteDTO, "fin">) => {
    await reservas.patch(id, payload);
    setExtendingReservation(null);
    setToast({ open: true, message: "Reserva extendida correctamente. Se actualizo la hora fin y el monto.", type: "success" });
    await loadDay(selectedDay);
  };

  const onDeliverPromotion = async (reservation: Reserva, promocionId: string) => {
    try {
      await reservas.deliverPromotion(reservation.id, promocionId);
      setToast({ open: true, message: "Promocion marcada como entregada.", type: "success" });
      await loadDay(selectedDay);
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : "No se pudo marcar la promocion.", type: "error" });
    }
  };

  const bothPanelsOpen = calendarOpen && dayReservationsOpen;
  const panelsTemplate = bothPanelsOpen ? "520px minmax(0, 1fr)" : "minmax(0, 1fr)";

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="Reservas" subtitle="Selecciona un día y crea reservas rapidamente.">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Día seleccionado: <b>{selectedDay}</b> · Reservas: <b>{rows.length}</b>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!calendarOpen && (
              <Button variant="outline" onClick={() => setCalendarOpen(true)}>
                Mostrar calendario
              </Button>
            )}

            {!dayReservationsOpen && (
              <Button variant="outline" onClick={() => setDayReservationsOpen(true)}>
                Mostrar agenda
              </Button>
            )}

            <Button onClick={openCreateReservation} disabled={selectedDayInPast}>+ Nueva reserva</Button>

            <Button
              variant="outline"
              onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            >
              ←
            </Button>

            <div
              style={{
                fontWeight: 950,
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
              }}
            >
              {monthLabel}
            </div>

            <Button
              variant="outline"
              onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            >
              →
            </Button>

            <Button variant="outline" onClick={() => void loadDay(selectedDay)} disabled={reservas.loading}>
              Refrescar
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: panelsTemplate, alignItems: "start" }}>
        {calendarOpen && (
        <Card
          title={isCurrentMonth ? `Calendario (${currentMonthName})` : "Calendario"}
          subtitle="Un click selecciona el día. Usa Nueva reserva para agendar."
          rightSlot={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {dayReservationsOpen && (
                <Button variant="outline" size="sm" onClick={() => setDayReservationsOpen(false)}>
                  Expandir
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setCalendarOpen(false)} disabled={!dayReservationsOpen}>
                Minimizar
              </Button>
            </div>
          }
        >
          <MonthCalendar
            month={month}
            selectedDay={selectedDay}
            disablePastDays
            onSelectDay={setSelectedDay}
            onDoubleClickDay={onDoubleClickDay}
          />
        </Card>
        )}

        {dayReservationsOpen && (
        <Card
          title="Reservas del día"
          subtitle="Agenda visible del día seleccionado."
          rightSlot={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {calendarOpen && (
                <Button variant="outline" size="sm" onClick={() => setCalendarOpen(false)}>
                  Expandir
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setDayReservationsOpen(false)} disabled={!calendarOpen}>
                Minimizar
              </Button>
            </div>
          }
        >
          {reservas.loading && <Loader label="Cargando reservas..." />}
          {reservas.error && <div style={{ color: "#ff5252", fontSize: 13 }}>{reservas.error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto", gap: 10, alignItems: "end" }}>
            <Input
              label="Buscar hora"
              placeholder="Ej: 19, 19:00, 19:00 - 20:00"
              value={hourQuery}
              onChange={(event) => setHourQuery(event.target.value)}
            />
            <Button variant="outline" onClick={() => setHourQuery("")} disabled={!hourQuery.trim()}>
              Limpiar
            </Button>
          </div>

          <div className="fids-board fids-reservas" style={{ marginTop: 12 }}>
            <div className="fids-header">
              <div className="fids-cell">Espacio</div>
              <div className="fids-cell">Cliente</div>
              <div className="fids-cell">Actividad</div>
              <div className="fids-cell">Inicio</div>
              <div className="fids-cell">Fin</div>
              <div className="fids-cell">Promos</div>
              <div className="fids-cell">Estado</div>
              <div className="fids-cell">Accion</div>
            </div>

            {filteredRows.map((r) => (
              <div key={r.id} className="fids-row">
                <div className="fids-cell">{r.espacio_nombre ?? r.espacio}</div>
                <div className="fids-cell">
                  {`${r.cliente_nombre ?? ""} ${r.cliente_apellido ?? ""}`.trim() || r.usuario_username || "—"}
                </div>
                <div className="fids-cell">{r.actividad_nombre ?? r.actividad}</div>
                <div className="fids-cell">{formatHHMM(r.inicio)}</div>
                <div className="fids-cell">{formatHHMM(r.fin)}</div>
                <div className="fids-cell">{promotionSummary(r)}</div>
                <div className="fids-cell">{r.estado_reserva}</div>
                <div className="fids-cell">
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Button variant="outline" size="sm" onClick={() => setMovingReservation(r)} disabled={["CANCELADA", "FINALIZADA"].includes(r.estado_reserva)}>Mover</Button>
                    <Button variant="outline" size="sm" onClick={() => setExtendingReservation(r)} disabled={["CANCELADA", "FINALIZADA"].includes(r.estado_reserva)}>Extender</Button>
                    {(r.promociones_aplicadas ?? []).filter((promotion) => (promotion.entregable ?? promotion.tipo === "item_regalo") && !promotion.entregada && promotion.promocion_id).map((promotion) => (
                      <Button key={promotion.promocion_id} size="sm" onClick={() => void onDeliverPromotion(r, promotion.promocion_id!)} disabled={reservas.loading}>
                        Entregar promo
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {!reservas.loading && rows.length === 0 && (
              <div style={{ padding: 16, opacity: 0.8 }}>No hay reservas este día.</div>
            )}
            {!reservas.loading && rows.length > 0 && filteredRows.length === 0 && (
              <div style={{ padding: 16, opacity: 0.8 }}>No hay reservas que coincidan con esa busqueda.</div>
            )}
          </div>

        </Card>
        )}
      </div>

      <FullScreenModal
        open={modalOpen}
        title="Crear reserva"
        subtitle="Selecciona cliente, espacio, actividad y horario."
        onClose={() => setModalOpen(false)}
      >
        <ReservaForm day={selectedDay} reservations={rows} loading={reservas.loading} onSubmit={onSubmit} />
      </FullScreenModal>

      <MoveReservationModal
        open={!!movingReservation}
        reservation={movingReservation}
        day={selectedDay}
        dayReservations={rows}
        loading={reservas.loading}
        onClose={() => setMovingReservation(null)}
        onMove={onMoveReservation}
      />

      <ExtendReservationModal
        open={!!extendingReservation}
        reservation={extendingReservation}
        day={selectedDay}
        dayReservations={rows}
        loading={reservas.loading}
        onClose={() => setExtendingReservation(null)}
        onExtend={onExtendReservation}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      <ReservationConfirmation open={confirmationOpen} onClose={() => setConfirmationOpen(false)} />
    </div>
  );
}
