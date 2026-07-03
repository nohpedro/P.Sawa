import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { useReservas } from "../../hooks/useReservas";
import { formatHHMM, toYYYYMMDD } from "../../utils/date";

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function money(value: string | number | undefined): number {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanCsvValue(value: unknown): string {
  return String(value ?? "")
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvCell(value: unknown): string {
  const clean = cleanCsvValue(value);
  return `"${clean.replace(/"/g, '""')}"`;
}

export default function ReservationHistoryPage() {
  const reservas = useReservas();
  const today = useMemo(() => new Date(), []);
  const [desde, setDesde] = useState(() => toYYYYMMDD(addDays(today, -30)));
  const [hasta, setHasta] = useState(() => toYYYYMMDD(today));
  const [query, setQuery] = useState("");

  const load = async () => {
    await reservas.list({ page: "1", desde, hasta });
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => reservas.data?.results ?? [], [reservas.data?.results]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((reserva) =>
      `${reserva.espacio_nombre} ${reserva.cliente_nombre} ${reserva.cliente_apellido} ${reserva.usuario_username} ${reserva.actividad_nombre} ${reserva.estado_reserva} ${reserva.notas}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, rows]);

  const totalMonto = useMemo(() => filtered.reduce((sum, reserva) => sum + money(reserva.monto_estimado), 0), [filtered]);
  const totalMinutos = useMemo(() => filtered.reduce((sum, reserva) => sum + (reserva.duracion_minutos ?? 0), 0), [filtered]);

  const downloadCsv = () => {
    const headers = ["Dia", "Cliente", "Espacio", "Actividad", "Inicio", "Fin", "Minutos", "Monto Bs", "Estado", "Notas"];
    const lines = [
      headers.map(csvCell).join(";"),
      ...filtered.map((reserva) => {
        const cliente = `${reserva.cliente_nombre ?? ""} ${reserva.cliente_apellido ?? ""}`.trim() || reserva.usuario_username || "";
        return [
          reserva.inicio.slice(0, 10),
          cliente,
          reserva.espacio_nombre ?? reserva.espacio,
          reserva.actividad_nombre ?? reserva.actividad,
          formatHHMM(reserva.inicio),
          formatHHMM(reserva.fin),
          reserva.duracion_minutos ?? "",
          Number(reserva.monto_estimado ?? 0).toFixed(2),
          reserva.estado_reserva,
          reserva.notas ?? "",
        ].map(csvCell).join(";");
      }),
    ];

    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial-reservas-${desde}-${hasta}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Historial de reservas"
        subtitle="Consulta clientes, dias, horarios, actividades, estados y montos estimados."
        rightSlot={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button variant="outline" onClick={downloadCsv} disabled={filtered.length === 0}>
              Descargar CSV
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={reservas.loading}>
              Buscar
            </Button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div style={panelStyle}>Reservas: <b>{filtered.length}</b></div>
          <div style={panelStyle}>Minutos: <b>{totalMinutos}</b></div>
          <div style={panelStyle}>Horas: <b>{(totalMinutos / 60).toFixed(2)}</b></div>
          <div style={panelStyle}>Monto: <b>Bs {totalMonto.toFixed(2)}</b></div>
        </div>
      </Card>

      <Card title="Filtros" subtitle="Ajusta el rango y filtra por cliente, cancha, actividad o estado.">
        <div style={{ display: "grid", gridTemplateColumns: "180px 180px minmax(220px, 1fr) auto", gap: 12, alignItems: "end" }}>
          <Input label="Desde" type="date" value={desde} onChange={(e: ChangeEvent<HTMLInputElement>) => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(e: ChangeEvent<HTMLInputElement>) => setHasta(e.target.value)} />
          <Input label="Buscar" placeholder="Cliente, espacio, actividad, estado..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button onClick={() => void load()} disabled={reservas.loading}>
            {reservas.loading ? <Loader label="Cargando..." /> : "Aplicar"}
          </Button>
        </div>
      </Card>

      <Card title="Detalle" subtitle="Listado historico del rango seleccionado.">
        {reservas.loading && <Loader label="Cargando historial..." />}
        {reservas.error && <div style={{ color: "#ff5252", fontSize: 13 }}>{reservas.error}</div>}

        <div className="fids-board fids-history" style={{ marginTop: 12 }}>
          <div className="fids-header">
            <div className="fids-cell">Dia</div>
            <div className="fids-cell">Cliente</div>
            <div className="fids-cell">Espacio</div>
            <div className="fids-cell">Actividad</div>
            <div className="fids-cell">Inicio</div>
            <div className="fids-cell">Fin</div>
            <div className="fids-cell">Min</div>
            <div className="fids-cell">Monto</div>
            <div className="fids-cell">Estado</div>
          </div>

          {filtered.map((reserva) => (
            <div key={reserva.id} className="fids-row">
              <div className="fids-cell">{reserva.inicio.slice(0, 10)}</div>
              <div className="fids-cell">
                {`${reserva.cliente_nombre ?? ""} ${reserva.cliente_apellido ?? ""}`.trim() || reserva.usuario_username || "-"}
              </div>
              <div className="fids-cell">{reserva.espacio_nombre ?? reserva.espacio}</div>
              <div className="fids-cell">{reserva.actividad_nombre ?? reserva.actividad}</div>
              <div className="fids-cell">{formatHHMM(reserva.inicio)}</div>
              <div className="fids-cell">{formatHHMM(reserva.fin)}</div>
              <div className="fids-cell">{reserva.duracion_minutos ?? "-"}</div>
              <div className="fids-cell">Bs {Number(reserva.monto_estimado ?? 0).toFixed(2)}</div>
              <div className="fids-cell">{reserva.estado_reserva}</div>
            </div>
          ))}

          {!reservas.loading && filtered.length === 0 && (
            <div style={{ padding: 16, color: "var(--color-text-muted)" }}>No hay reservas en este rango.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
