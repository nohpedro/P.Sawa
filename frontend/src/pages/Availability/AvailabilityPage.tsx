import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { useEspacios } from "../../hooks/useEspacios";
import type { Espacio } from "../../models/espacio";
import type { Reserva } from "../../models/reserva";
import reservasService from "../../services/reservas.service";
import { toYYYYMMDD } from "../../utils/date";
import { getErrorMessage } from "../../utils/error";

const REFRESH_MS = 15_000;
const SPORT_ANIMATION_MS = 18_000;
const SPORT_ANIMATION_DURATION_MS = 4_800;

const SPORT_MOMENTS = [
  { sport: "voley", title: "Saque listo", detail: "Disponibilidad en vivo" },
  { sport: "futbol", title: "Cambio de cancha", detail: "Estados actualizados" },
  { sport: "basquet", title: "Tiempo de juego", detail: "Espacios en movimiento" },
] as const;

function formatTime(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatHHMM(date: Date): string {
  return date.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" });
}

function statusInfo(value?: string) {
  const raw = (value ?? "").toLowerCase();
  if (raw.includes("libre")) return { className: "status-libre", label: "LIBRE" };
  if (raw.includes("ocupado")) return { className: "status-ocupado", label: "OCUPADO" };
  if (raw.includes("no")) return { className: "status-no-disponible", label: "NO DISPONIBLE" };
  return { className: "status-unavailable", label: value || "-" };
}

function isBlockingReservation(reserva: Reserva): boolean {
  return !["CANCELADA", "FINALIZADA"].includes(reserva.estado_reserva);
}

type AvailabilityDetail = {
  label: string;
  summaryLabel: string;
  className: string;
  sortValue: number;
};

type AvailabilityBoardMode = "free" | "busy";

function availabilityDetail(espacio: Espacio, reservations: Reserva[], now: Date): AvailabilityDetail {
  if (espacio.estado_operativo !== "DISPONIBLE" || espacio.estado_actual === "NO_DISPONIBLE") {
    return {
      label: "",
      summaryLabel: "No disponible",
      className: "fids-next-free--unavailable",
      sortValue: Number.POSITIVE_INFINITY,
    };
  }

  const nowMs = now.getTime();
  const intervals = reservations
    .filter((reserva) => reserva.espacio === espacio.id && isBlockingReservation(reserva))
    .map((reserva) => ({ start: new Date(reserva.inicio), end: new Date(reserva.fin) }))
    .filter((interval) => interval.end.getTime() > nowMs)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cursor = new Date(now);
  let moved = false;

  for (const interval of intervals) {
    if (interval.end.getTime() <= cursor.getTime()) continue;
    if (interval.start.getTime() > cursor.getTime()) break;
    cursor = new Date(Math.max(cursor.getTime(), interval.end.getTime()));
    moved = true;
  }

  if (!moved) {
    return {
      label: "",
      summaryLabel: "Disponible ahora",
      className: "fids-next-free--now",
      sortValue: 0,
    };
  }

  const releaseTime = formatHHMM(cursor);
  return {
    label: `Libre a las ${releaseTime}`,
    summaryLabel: releaseTime,
    className: "fids-next-free--later",
    sortValue: cursor.getHours() * 60 + cursor.getMinutes(),
  };
}

function isFreeSpace(espacio: Espacio): boolean {
  return statusInfo(espacio.estado_actual).label === "LIBRE";
}

function activitiesLabel(espacio: Espacio): string {
  return espacio.actividades?.length ? espacio.actividades.map((actividad) => actividad.nombre).join(", ") : "-";
}

function AvailabilityBoard({
  title,
  subtitle,
  rows,
  mode,
  availabilityDetails,
}: {
  title: string;
  subtitle: string;
  rows: Espacio[];
  mode: AvailabilityBoardMode;
  availabilityDetails: Map<string, AvailabilityDetail>;
}) {
  return (
    <section className={`fids-board fids-availability fids-availability--${mode}`}>
      <div className="fids-availability__title">
        <div>
          <span>{title}</span>
          <strong>{subtitle}</strong>
        </div>
        <em>{rows.length}</em>
      </div>

      <div className="fids-header">
        <div className="fids-cell">Espacio</div>
        <div className="fids-cell">Actividades</div>
        <div className="fids-cell">Ubicacion</div>
        {mode === "busy" && <div className="fids-cell">Se libera</div>}
        <div className="fids-cell">Estado</div>
      </div>

      {rows.map((espacio) => {
        const status = statusInfo(espacio.estado_actual);
        const detail = availabilityDetails.get(espacio.id);
        const releaseLabel = status.label === "OCUPADO" ? detail?.summaryLabel ?? "-" : "Sin servicio";
        return (
          <div key={espacio.id} className="fids-row">
            <div className="fids-cell fids-space-name">{espacio.nombre}</div>
            <div className="fids-cell">{activitiesLabel(espacio)}</div>
            <div className="fids-cell">{espacio.ubicacion || "-"}</div>
            {mode === "busy" && (
              <div className={`fids-cell fids-next-free ${detail?.className ?? ""}`}>
                {releaseLabel}
              </div>
            )}
            <div className={`fids-cell fids-status ${status.className}`}>
              {mode === "free" ? "DISPONIBLE" : status.label}
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="fids-empty">
          {mode === "free" ? "Sin espacios libres." : "Sin espacios ocupados."}
        </div>
      )}
    </section>
  );
}

export default function AvailabilityPage() {
  const { data, loading, error, list } = useEspacios();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sportMoment, setSportMoment] = useState(0);
  const [showSportAnimation, setShowSportAnimation] = useState(false);
  const [reservations, setReservations] = useState<Reserva[]>([]);
  const [reservationsError, setReservationsError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(async () => {
    const today = toYYYYMMDD(new Date());
    const [reservasRes] = await Promise.all([
      reservasService.list({ page: "1", page_size: "300", desde: today, hasta: today }).catch((err) => {
        setReservationsError(getErrorMessage(err, "No se pudieron cargar las reservas del dia."));
        return null;
      }),
      list({ page: "1", page_size: "100" }),
    ]);
    if (reservasRes) {
      setReservations(reservasRes.results ?? []);
      setReservationsError(null);
    }
    setNow(new Date());
    setLastUpdated(new Date());
  }, [list]);

  useEffect(() => {
    window.setTimeout(() => {
      load().catch(() => {});
    }, 0);
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      load().catch(() => {});
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === pageRef.current;
      setIsFullscreen(active);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!pageRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await pageRef.current.requestFullscreen();
  };

  const rows = useMemo(() => data?.results ?? [], [data?.results]);

  useEffect(() => {
    if (!isFullscreen) {
      setShowSportAnimation(false);
      return;
    }

    let hideTimer: number | undefined;
    const playMoment = () => {
      window.clearTimeout(hideTimer);
      setSportMoment((current) => current + 1);
      setShowSportAnimation(true);
      hideTimer = window.setTimeout(() => setShowSportAnimation(false), SPORT_ANIMATION_DURATION_MS);
    };

    const startTimer = window.setTimeout(playMoment, 900);
    const repeatTimer = window.setInterval(playMoment, SPORT_ANIMATION_MS);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(hideTimer);
      window.clearInterval(repeatTimer);
    };
  }, [isFullscreen]);

  const counters = useMemo(() => {
    return rows.reduce(
      (acc, espacio) => {
        const raw = (espacio.estado_actual ?? "").toLowerCase();
        if (raw.includes("libre")) acc.libres += 1;
        else if (raw.includes("ocupado")) acc.ocupados += 1;
        else acc.noDisponibles += 1;
        return acc;
      },
      { libres: 0, ocupados: 0, noDisponibles: 0 }
    );
  }, [rows]);
  const availabilityDetails = useMemo(() => {
    return new Map(rows.map((espacio) => [espacio.id, availabilityDetail(espacio, reservations, now)]));
  }, [now, reservations, rows]);
  const freeRows = useMemo(() => rows.filter(isFreeSpace), [rows]);
  const busyRows = useMemo(() => rows.filter((espacio) => !isFreeSpace(espacio)), [rows]);
  const nextFreeSummary = useMemo(() => {
    const candidates = rows
      .map((espacio) => ({ espacio, detail: availabilityDetails.get(espacio.id) }))
      .filter((item): item is { espacio: Espacio; detail: AvailabilityDetail } => !!item.detail && Number.isFinite(item.detail.sortValue));

    const immediate = candidates.find((item) => item.detail.sortValue === 0);
    if (immediate) return `${immediate.espacio.nombre} / Disponible ahora`;

    const next = [...candidates].sort((a, b) => a.detail.sortValue - b.detail.sortValue)[0];
    return next ? `${next.espacio.nombre} / ${next.detail.summaryLabel}` : "Sin horarios libres";
  }, [availabilityDetails, rows]);
  const currentMoment = SPORT_MOMENTS[sportMoment % SPORT_MOMENTS.length];

  return (
    <div
      ref={pageRef}
      style={{
        display: "grid",
        gap: isFullscreen ? 0 : 16,
        background: "var(--color-bg)",
        padding: isFullscreen ? 0 : 0,
        minHeight: isFullscreen ? "100vh" : undefined,
        overflow: isFullscreen ? "hidden" : undefined,
        position: "relative",
      }}
    >
      {!isFullscreen && (
        <Card
          title="Disponibilidad de espacios"
          subtitle="Pantalla viva para monitorear canchas y ambientes en tiempo real."
          rightSlot={
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Button variant="outline" onClick={() => void toggleFullscreen()}>
                Pantalla completa
              </Button>
              <Button variant="outline" onClick={() => setAutoRefresh((value) => !value)}>
                {autoRefresh ? "Pausar" : "Activar"}
              </Button>
              <Button onClick={() => void load()} disabled={loading}>
                {loading ? <Loader label="Actualizando..." /> : "Actualizar"}
              </Button>
            </div>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Ultima actualizacion</div>
              <div style={{ fontWeight: 950, marginTop: 4 }}>{formatTime(lastUpdated)}</div>
            </div>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, background: "rgba(46,204,113,0.08)" }}>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Libres</div>
              <div style={{ fontWeight: 950, marginTop: 4, color: "#8ee59f" }}>{counters.libres}</div>
            </div>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, background: "rgba(255,210,74,0.08)" }}>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Ocupados</div>
              <div style={{ fontWeight: 950, marginTop: 4, color: "#ffd24a" }}>{counters.ocupados}</div>
            </div>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, background: "rgba(255,82,82,0.08)" }}>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>No disponibles</div>
              <div style={{ fontWeight: 950, marginTop: 4, color: "#ffb4b4" }}>{counters.noDisponibles}</div>
            </div>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, background: "rgba(255,210,74,0.08)" }}>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Siguiente disponibilidad</div>
              <div style={{ fontWeight: 950, marginTop: 4, color: "#ffd24a" }}>{nextFreeSummary}</div>
            </div>
          </div>
        </Card>
      )}

      {loading && rows.length === 0 && (
        <div style={{ padding: 12 }}>
          <Loader label="Cargando espacios..." />
        </div>
      )}

      {error && (
        <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 10, background: "var(--color-surface)" }}>
          <div style={{ color: "#ff5252", fontWeight: 700 }}>Error</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{error}</div>
        </div>
      )}

      {reservationsError && !isFullscreen && (
        <div style={{ padding: 12, border: "1px solid rgba(255,210,74,0.35)", borderRadius: 10, background: "rgba(255,210,74,0.08)" }}>
          <div style={{ color: "#ffd24a", fontWeight: 800 }}>Reservas</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{reservationsError}</div>
        </div>
      )}

      <div className={`fids-availability-layout${isFullscreen ? " fids-availability-layout--fullscreen" : ""}`}>
        <AvailabilityBoard
          title="Libres"
          subtitle="Listas para reservar"
          rows={freeRows}
          mode="free"
          availabilityDetails={availabilityDetails}
        />

        <AvailabilityBoard
          title="Ocupadas"
          subtitle="En uso o sin servicio"
          rows={busyRows}
          mode="busy"
          availabilityDetails={availabilityDetails}
        />
      </div>

      {isFullscreen && showSportAnimation && (
        <div key={sportMoment} className={`fids-sport-moment fids-sport-moment--${currentMoment.sport}`} aria-hidden="true">
          <div className="fids-sport-moment__beam" />
          <div className="fids-sport-moment__ball" />
          <div className="fids-sport-moment__trail fids-sport-moment__trail--one" />
          <div className="fids-sport-moment__trail fids-sport-moment__trail--two" />
          <div className="fids-sport-moment__card">
            <span>{currentMoment.title}</span>
            <strong>{currentMoment.detail}</strong>
            <em>
              {counters.libres} libres / {counters.ocupados} ocupados
            </em>
          </div>
        </div>
      )}
    </div>
  );
}
