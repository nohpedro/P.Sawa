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

import { useReservas } from "../../hooks/useReservas";
import { formatHHMM, toYYYYMMDD } from "../../utils/date";
import type { Reserva, ReservaWriteDTO } from "../../models/reserva";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

function promotionSummary(reservation: Reserva): string {
  const applied = reservation.promociones_aplicadas ?? [];
  if (!applied.length) return "-";
  return applied.map((promotion) => promotion.beneficio || promotion.nombre).join(", ");
}

export default function ReservationsPage() {
  const reservas = useReservas();

  const today = useMemo(() => toYYYYMMDD(new Date()), []);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(today);

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);
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

  const onDoubleClickDay = (day: string) => {
    setSelectedDay(day);
    setModalOpen(true);
  };

  const onSubmit = async (payload: ReservaWriteDTO) => {
    await reservas.create(payload);
    setModalOpen(false);
    setConfirmationOpen(true);
    await loadDay(selectedDay);
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

            <Button onClick={() => setModalOpen(true)}>+ Nueva reserva</Button>

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
        <ReservaForm day={selectedDay} loading={reservas.loading} onSubmit={onSubmit} />
      </FullScreenModal>

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
