import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import { useReservas } from "../../hooks/useReservas";
import { useEspacios } from "../../hooks/useEspacios";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import { useClientes } from "../../hooks/useClientes";
import { formatHHMM, toYYYYMMDD } from "../../utils/date";
import type { Reserva } from "../../models/reserva";

type Option = { label: string; value: string };
type MetricRow = { label: string; value: number; detail?: string };
type HistoryFilters = {
  desde: string;
  hasta: string;
  espacio: string;
  actividad: string;
  cliente: string;
  estado: string;
};

const PAGE_SIZE = 25;

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

function clienteName(reserva: Reserva): string {
  return `${reserva.cliente_nombre ?? ""} ${reserva.cliente_apellido ?? ""}`.trim() || reserva.usuario_username || "-";
}

function reservaDate(reserva: Reserva): string {
  return reserva.inicio.slice(0, 10);
}

function optionKey(label: string, fallback: string): string {
  return label.trim() || fallback;
}

function uniqueOptions(rows: Reserva[], getValue: (row: Reserva) => string, getLabel: (row: Reserva) => string): Option[] {
  const seen = new Map<string, string>();
  rows.forEach((row) => {
    const value = getValue(row);
    if (!value || seen.has(value)) return;
    seen.set(value, getLabel(row));
  });

  return Array.from(seen.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function groupCount(rows: Reserva[], getLabel: (row: Reserva) => string): MetricRow[] {
  const count = new Map<string, number>();
  rows.forEach((row) => {
    const label = getLabel(row);
    count.set(label, (count.get(label) ?? 0) + 1);
  });

  return Array.from(count.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function groupMoneyByDay(rows: Reserva[]): MetricRow[] {
  const count = new Map<string, number>();
  rows.forEach((row) => {
    const day = reservaDate(row);
    count.set(day, (count.get(day) ?? 0) + money(row.monto_estimado));
  });

  return Array.from(count.entries())
    .map(([label, value]) => ({ label, value, detail: `Bs ${value.toFixed(2)}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function ActivityBarChart({ rows }: { rows: MetricRow[] }) {
  const visible = rows.slice(0, 10);
  const total = visible.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(1, ...visible.map((row) => row.value));

  return (
    <section style={{ ...panelStyle, display: "grid", gap: 14, background: "#0f1420" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Reservas por actividad</h3>
        <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
          Cantidad de reservas agrupadas por actividad.
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {visible.map((row) => {
          const width = Math.max(6, (row.value / max) * 100);
          const percent = total ? Math.round((row.value / total) * 100) : 0;
          return (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 210px) 1fr auto", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.label}
              </div>
              <div style={{ height: 30, borderRadius: 8, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${width}%`,
                    height: "100%",
                    borderRadius: 8,
                    background: "linear-gradient(90deg, #ffd24a, #8ee59f)",
                    boxShadow: "0 8px 20px rgba(255,210,74,0.14)",
                  }}
                />
              </div>
              <div style={{ color: "#ffd24a", fontSize: 13, fontWeight: 950, whiteSpace: "nowrap" }}>
                {row.value} ({percent}%)
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay actividades para graficar.</div>
        )}
      </div>
    </section>
  );
}

function MoneyByDayChart({ rows }: { rows: MetricRow[] }) {
  const visible = rows.slice(-14);
  const max = Math.max(1, ...visible.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <section style={{ ...panelStyle, display: "grid", gap: 14, background: "#0f1420" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Monto por dia</h3>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
            Ingresos estimados por fecha segun las reservas filtradas.
          </div>
        </div>
        <div style={{ color: "#ffd24a", fontSize: 22, fontWeight: 950 }}>Bs {total.toFixed(2)}</div>
      </div>

      <div
        style={{
          minHeight: 260,
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, visible.length)}, minmax(34px, 1fr))`,
          gap: 10,
          alignItems: "end",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: "18px 14px 12px",
          background:
            "linear-gradient(0deg, rgba(255,255,255,0.04) 1px, transparent 1px), rgba(255,255,255,0.015)",
          backgroundSize: "100% 52px",
        }}
      >
        {visible.map((row) => {
          const height = Math.max(8, (row.value / max) * 210);
          return (
            <div key={row.label} style={{ display: "grid", gap: 8, alignItems: "end", justifyItems: "center" }}>
              <div style={{ color: "#ffd24a", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }}>
                Bs {row.value.toFixed(0)}
              </div>
              <div
                title={`${row.label}: Bs ${row.value.toFixed(2)}`}
                style={{
                  width: "100%",
                  maxWidth: 42,
                  height,
                  borderRadius: "9px 9px 4px 4px",
                  background: "linear-gradient(180deg, #ffd24a, #8ee59f)",
                  boxShadow: "0 12px 28px rgba(142,229,159,0.14)",
                }}
              />
              <div style={{ color: "var(--color-text-muted)", fontSize: 11, fontWeight: 800, writingMode: visible.length > 8 ? "vertical-rl" : "horizontal-tb" }}>
                {row.label.slice(5)}
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay montos para graficar.</div>
        )}
      </div>
    </section>
  );
}

function CompactHorizontalChart({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: MetricRow[];
}) {
  const visible = rows.slice(0, 8);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(1, ...visible.map((row) => row.value));

  return (
    <section style={{ ...panelStyle, display: "grid", gap: 12, background: "#0f1420" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>{title}</h3>
        <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>{subtitle}</div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {visible.map((row) => {
          const percent = total ? Math.round((row.value / total) * 100) : 0;
          return (
            <div key={row.label} style={{ display: "grid", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, fontWeight: 850 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                <span style={{ color: "#ffd24a", whiteSpace: "nowrap" }}>{row.value} ({percent}%)</span>
              </div>
              <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.max(5, (row.value / max) * 100)}%`,
                    height: "100%",
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #ffd24a, #8ee59f)",
                  }}
                />
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay datos para este grafico.</div>
        )}
      </div>
    </section>
  );
}

function StatusSummaryChart({ rows }: { rows: MetricRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const colors = ["#8ee59f", "#ffd24a", "#93c5fd", "#ff8a8a", "#c4b5fd"];

  return (
    <section style={{ ...panelStyle, display: "grid", gap: 12, background: "#0f1420" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>Estado de reservas</h3>
        <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
          Distribucion del estado dentro del resultado filtrado.
        </div>
      </div>

      <div style={{ display: "flex", height: 32, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
        {rows.map((row, index) => (
          <div
            key={row.label}
            title={`${row.label}: ${row.value}`}
            style={{
              width: `${total ? (row.value / total) * 100 : 0}%`,
              background: colors[index % colors.length],
              minWidth: row.value > 0 ? 8 : 0,
            }}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        {rows.map((row, index) => {
          const percent = total ? Math.round((row.value / total) * 100) : 0;
          return (
            <div key={row.label} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 850 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: colors[index % colors.length] }} />
              <span style={{ color: "var(--color-text-muted)" }}>{row.label}</span>
              <span style={{ marginLeft: "auto", color: "#ffd24a" }}>{row.value} ({percent}%)</span>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay estados para graficar.</div>
        )}
      </div>
    </section>
  );
}

function FilterChips({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value}`}
          style={{
            border: "1px solid rgba(255,210,74,0.24)",
            borderRadius: 999,
            background: "rgba(255,210,74,0.08)",
            color: "var(--color-text)",
            padding: "7px 10px",
            fontSize: 12,
            fontWeight: 850,
          }}
        >
          <span style={{ color: "#ffd24a" }}>{item.label}:</span> {item.value}
        </span>
      ))}
    </div>
  );
}

export default function ReservationHistoryPage() {
  const reservas = useReservas();
  const espacios = useEspacios();
  const tipos = useTiposActividad();
  const clientes = useClientes();
  const today = useMemo(() => new Date(), []);
  const [desde, setDesde] = useState(() => toYYYYMMDD(addDays(today, -30)));
  const [hasta, setHasta] = useState(() => toYYYYMMDD(today));
  const [espacio, setEspacio] = useState("");
  const [actividad, setActividad] = useState("");
  const [cliente, setCliente] = useState("");
  const [estado, setEstado] = useState("");
  const [chartsOpen, setChartsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalReservas, setTotalReservas] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const load = async (targetPage = page, overrides?: Partial<HistoryFilters>) => {
    const filters = { desde, hasta, espacio, actividad, cliente, estado, ...overrides };
    const res = await reservas.list({
      page: String(targetPage),
      page_size: String(PAGE_SIZE),
      desde: filters.desde,
      hasta: filters.hasta,
      espacio: filters.espacio || undefined,
      actividad: filters.actividad || undefined,
      cliente: filters.cliente || undefined,
      estado_reserva: filters.estado || undefined,
    });
    setTotalReservas(res.count ?? 0);
    setHasNextPage(Boolean(res.next));
    setHasPreviousPage(Boolean(res.previous));
    setChartsOpen(false);
  };

  useEffect(() => {
    espacios.list({ page: "1", page_size: "200" }).catch(() => {});
    tipos.list({ page: "1", page_size: "200" }).catch(() => {});
    clientes.list({ page: "1", page_size: "200" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load(page).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const rows = useMemo(() => reservas.data?.results ?? [], [reservas.data?.results]);
  const espaciosList = useMemo(() => espacios.data?.results ?? [], [espacios.data?.results]);
  const actividadesList = useMemo(() => (tipos.data?.results ?? []).filter((activity) => activity.activo), [tipos.data?.results]);
  const clientesList = useMemo(() => clientes.data?.results ?? [], [clientes.data?.results]);

  const espacioOptions = useMemo(
    () => [
      { label: "Todos los espacios", value: "" },
      ...(espaciosList.length
        ? espaciosList.map((space) => ({ label: space.nombre, value: space.id }))
        : uniqueOptions(rows, (row) => row.espacio, (row) => row.espacio_nombre ?? row.espacio)),
    ],
    [espaciosList, rows]
  );

  const actividadOptions = useMemo(
    () => [
      { label: "Todas las actividades", value: "" },
      ...(actividadesList.length
        ? actividadesList.map((activity) => ({ label: activity.nombre, value: activity.id }))
        : uniqueOptions(rows, (row) => row.actividad, (row) => row.actividad_nombre ?? row.actividad)),
    ],
    [actividadesList, rows]
  );

  const clienteOptions = useMemo(
    () => [
      { label: "Todos los clientes", value: "" },
      ...(clientesList.length
        ? clientesList.map((client) => ({
            label: `${client.nombre} ${client.apellido}`.trim() || client.username,
            value: client.id,
          }))
        : uniqueOptions(rows, (row) => row.cliente ?? optionKey(clienteName(row), String(row.usuario)), clienteName)),
    ],
    [clientesList, rows]
  );

  const estadoOptions = [
    { label: "Todos los estados", value: "" },
    { label: "Pendiente", value: "PENDIENTE" },
    { label: "Confirmada", value: "CONFIRMADA" },
    { label: "Cancelada", value: "CANCELADA" },
    { label: "Finalizada", value: "FINALIZADA" },
  ];

  const filtered = rows;

  const totalMonto = useMemo(() => filtered.reduce((sum, reserva) => sum + money(reserva.monto_estimado), 0), [filtered]);
  const totalMinutos = useMemo(() => filtered.reduce((sum, reserva) => sum + (reserva.duracion_minutos ?? 0), 0), [filtered]);

  const chartData = useMemo(
    () => ({
      byActivity: groupCount(filtered, (row) => row.actividad_nombre ?? row.actividad),
      bySpace: groupCount(filtered, (row) => row.espacio_nombre ?? row.espacio),
      byClient: groupCount(filtered, clienteName),
      byStatus: groupCount(filtered, (row) => row.estado_reserva),
      moneyByDay: groupMoneyByDay(filtered),
    }),
    [filtered]
  );

  const selectedFilterItems = useMemo(() => {
    const findLabel = (options: Option[], value: string) => options.find((option) => option.value === value)?.label ?? "Todos";
    return [
      { label: "Desde", value: desde || "-" },
      { label: "Hasta", value: hasta || "-" },
      { label: "Espacio", value: findLabel(espacioOptions, espacio) },
      { label: "Actividad", value: findLabel(actividadOptions, actividad) },
      { label: "Cliente", value: findLabel(clienteOptions, cliente) },
      { label: "Estado", value: findLabel(estadoOptions, estado) },
    ];
  }, [actividad, actividadOptions, cliente, clienteOptions, desde, espacio, espacioOptions, estado, estadoOptions, hasta]);

  const resetFilters = () => {
    const nextFilters = {
      desde: toYYYYMMDD(addDays(today, -30)),
      hasta: toYYYYMMDD(today),
      espacio: "",
      actividad: "",
      cliente: "",
      estado: "",
    };
    setDesde(nextFilters.desde);
    setHasta(nextFilters.hasta);
    setEspacio("");
    setActividad("");
    setCliente("");
    setEstado("");
    setChartsOpen(false);
    if (page === 1) {
      load(1, nextFilters).catch(() => {});
      return;
    }
    setPage(1);
  };

  const applyFilters = () => {
    if (page === 1) {
      load(1).catch(() => {});
      return;
    }
    setPage(1);
  };

  const pageStart = totalReservas === 0 || filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = totalReservas === 0 || filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + filtered.length, totalReservas);

  const downloadCsv = () => {
    const headers = ["Dia", "Cliente", "Espacio", "Actividad", "Inicio", "Fin", "Minutos", "Monto Bs", "Estado", "Notas"];
    const lines = [
      headers.map(csvCell).join(";"),
      ...filtered.map((reserva) =>
        [
          reservaDate(reserva),
          clienteName(reserva),
          reserva.espacio_nombre ?? reserva.espacio,
          reserva.actividad_nombre ?? reserva.actividad,
          formatHHMM(reserva.inicio),
          formatHHMM(reserva.fin),
          reserva.duracion_minutos ?? "",
          Number(reserva.monto_estimado ?? 0).toFixed(2),
          reserva.estado_reserva,
          reserva.notas ?? "",
        ].map(csvCell).join(";")
      ),
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
              CSV pagina
            </Button>
            <Button onClick={() => setChartsOpen(true)} disabled={filtered.length === 0}>
              Graficos pagina
            </Button>
            <Button variant="outline" onClick={applyFilters} disabled={reservas.loading}>
              Aplicar filtros
            </Button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div style={panelStyle}>Reservas: <b>{totalReservas}</b></div>
          <div style={panelStyle}>Pagina: <b>{page}</b></div>
          <div style={panelStyle}>Minutos pagina: <b>{totalMinutos}</b></div>
          <div style={panelStyle}>Monto pagina: <b>Bs {totalMonto.toFixed(2)}</b></div>
        </div>
      </Card>

      <Card title="Filtros" subtitle="Filtra por rango, espacio, actividad, cliente o estado.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "end" }}>
          <Input label="Desde" type="date" value={desde} onChange={(e: ChangeEvent<HTMLInputElement>) => setDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(e: ChangeEvent<HTMLInputElement>) => setHasta(e.target.value)} />
          <Select label="Espacio" options={espacioOptions} value={espacio} onChange={(e) => setEspacio(e.target.value)} />
          <Select label="Actividad" options={actividadOptions} value={actividad} onChange={(e) => setActividad(e.target.value)} />
          <Select label="Cliente" options={clienteOptions} value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <Select label="Estado" options={estadoOptions} value={estado} onChange={(e) => setEstado(e.target.value)} />
          <Button onClick={applyFilters} disabled={reservas.loading}>
            {reservas.loading ? <Loader label="Cargando..." /> : "Aplicar"}
          </Button>
          <Button variant="outline" onClick={resetFilters} disabled={reservas.loading}>
            Limpiar
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
              <div className="fids-cell">{reservaDate(reserva)}</div>
              <div className="fids-cell">{clienteName(reserva)}</div>
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
            <div style={{ padding: 16, color: "var(--color-text-muted)" }}>No hay reservas con esos filtros.</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <span style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
            {totalReservas === 0 ? "Sin reservas" : `Reservas ${pageStart}-${pageEnd} de ${totalReservas}`}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={!hasPreviousPage || reservas.loading}>
              Anterior
            </Button>
            <Button variant="outline" onClick={() => setPage((value) => value + 1)} disabled={!hasNextPage || reservas.loading}>
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      {chartsOpen &&
        createPortal(
          <div
            role="presentation"
            onClick={() => setChartsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1300,
              display: "grid",
              placeItems: "center",
              padding: 24,
              background: "rgba(5, 8, 15, 0.78)",
              backdropFilter: "blur(3px)",
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="history-charts-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(1120px, 100%)",
                maxHeight: "90vh",
                overflow: "auto",
                border: "1px solid rgba(255,210,74,0.28)",
                borderRadius: 10,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                padding: 18,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", marginBottom: 16 }}>
                <div>
                  <h2 id="history-charts-title" style={{ margin: 0, fontSize: 22, fontWeight: 950 }}>
                    Graficos de la pagina
                  </h2>
                  <FilterChips items={selectedFilterItems} />
                </div>
                <Button variant="ghost" onClick={() => setChartsOpen(false)}>
                  Cerrar
                </Button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, alignItems: "stretch" }}>
                <MoneyByDayChart rows={chartData.moneyByDay} />
                <ActivityBarChart rows={chartData.byActivity} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 16 }}>
                <CompactHorizontalChart
                  title="Reservas por espacio"
                  subtitle="Compara que espacios concentran mas reservas."
                  rows={chartData.bySpace}
                />
                <CompactHorizontalChart
                  title="Clientes con mas reservas"
                  subtitle="Clientes con mayor actividad en el rango filtrado."
                  rows={chartData.byClient}
                />
                <StatusSummaryChart rows={chartData.byStatus} />
              </div>
            </section>
          </div>,
          document.body
        )}
    </div>
  );
}
