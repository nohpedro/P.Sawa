import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import MonthCalendar from "../../components/reservas/MonthCalendar";
import FullScreenModal from "../../components/reservas/FullScreenModal";
import ReservaForm from "../../components/reservas/ReservaForm";

import { useReservas } from "../../hooks/useReservas";
import { formatHHMM, toYYYYMMDD } from "../../utils/date";
import type { ReservaWriteDTO } from "../../models/reserva";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

export default function ReservationsPage() {
  const reservas = useReservas();

  const today = useMemo(() => toYYYYMMDD(new Date()), []);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(today);

  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const loadDay = async (day: string) => {
    await reservas.list({ page: "1", desde: day, hasta: day });
  };

  useEffect(() => {
    loadDay(selectedDay).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  const rows = reservas.data?.results ?? [];

  const monthLabel = useMemo(() => {
    const m = month.toLocaleString("es-BO", { month: "long" });
    return `${m.charAt(0).toUpperCase() + m.slice(1)} ${month.getFullYear()}`;
  }, [month]);

  const onDoubleClickDay = (day: string) => {
    setSelectedDay(day);
    setModalOpen(true);
  };

  const onSubmit = async (payload: ReservaWriteDTO) => {
    await reservas.create(payload);
    setToast({ open: true, message: "Reserva creada.", type: "success" });
    setModalOpen(false);
    await loadDay(selectedDay);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="Reservas" subtitle="Doble click en un día para crear una reserva.">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Día seleccionado: <b>{selectedDay}</b> · Reservas: <b>{rows.length}</b>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
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

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "520px 1fr", alignItems: "start" }}>
        <Card title="Calendario" subtitle="Doble click para reservar.">
          <MonthCalendar
            month={month}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            onDoubleClickDay={onDoubleClickDay}
          />
        </Card>

        <Card title="Reservas del día" subtitle="Lista lista para muchos datos (scroll).">
          {reservas.loading && <Loader label="Cargando reservas..." />}
          {reservas.error && <div style={{ color: "#ff5252", fontSize: 13 }}>{reservas.error}</div>}

          <div className="fids-board fids-reservas" style={{ marginTop: 12 }}>
            <div className="fids-header">
              <div className="fids-cell">Espacio</div>
              <div className="fids-cell">Cliente</div>
              <div className="fids-cell">Actividad</div>
              <div className="fids-cell">Inicio</div>
              <div className="fids-cell">Fin</div>
              <div className="fids-cell">Estado</div>
            </div>

            {rows.map((r) => (
              <div key={r.id} className="fids-row">
                <div className="fids-cell">{r.espacio_nombre ?? r.espacio}</div>
                <div className="fids-cell">
                  {`${r.cliente_nombre ?? ""} ${r.cliente_apellido ?? ""}`.trim() || r.usuario_username || "—"}
                </div>
                <div className="fids-cell">{r.actividad}</div>
                <div className="fids-cell">{formatHHMM(r.inicio)}</div>
                <div className="fids-cell">{formatHHMM(r.fin)}</div>
                <div className="fids-cell">{r.estado_reserva}</div>
              </div>
            ))}

            {!reservas.loading && rows.length === 0 && (
              <div style={{ padding: 16, opacity: 0.8 }}>No hay reservas este día.</div>
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setModalOpen(true)}>+ Nueva reserva</Button>
          </div>
        </Card>
      </div>

      <FullScreenModal
        open={modalOpen}
        title="Crear reserva"
        subtitle="Selecciona espacio, actividad y rango horario. Se valida actividad y se calcula costo en vivo."
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
    </div>
  );
}
