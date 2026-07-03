import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { useEspacios } from "../../hooks/useEspacios";

const REFRESH_MS = 15_000;
const FULLSCREEN_PAGE_SIZE = 5;
const FULLSCREEN_ROTATE_MS = 8_000;

function formatTime(date: Date | null): string {
  if (!date) return "-";
  return date.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function statusInfo(value?: string) {
  const raw = (value ?? "").toLowerCase();
  if (raw.includes("libre")) return { className: "status-libre", label: "LIBRE" };
  if (raw.includes("ocupado")) return { className: "status-ocupado", label: "OCUPADO" };
  if (raw.includes("no")) return { className: "status-no-disponible", label: "NO DISPONIBLE" };
  return { className: "status-unavailable", label: value || "-" };
}

export default function AvailabilityPage() {
  const { data, loading, error, list } = useEspacios();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenPage, setScreenPage] = useState(0);

  const load = useCallback(async () => {
    await list({ page: "1", page_size: "100" });
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
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === pageRef.current;
      setIsFullscreen(active);
      if (active) setScreenPage(0);
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
  const totalScreens = useMemo(
    () => Math.max(1, Math.ceil(rows.length / FULLSCREEN_PAGE_SIZE)),
    [rows.length]
  );
  const visibleRows = useMemo(() => {
    if (!isFullscreen) return rows;
    const start = screenPage * FULLSCREEN_PAGE_SIZE;
    return rows.slice(start, start + FULLSCREEN_PAGE_SIZE);
  }, [isFullscreen, rows, screenPage]);

  useEffect(() => {
    if (screenPage >= totalScreens) setScreenPage(0);
  }, [screenPage, totalScreens]);

  useEffect(() => {
    if (!isFullscreen || totalScreens <= 1) return;
    const timer = window.setInterval(() => {
      setScreenPage((current) => (current + 1) % totalScreens);
    }, FULLSCREEN_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isFullscreen, totalScreens]);

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

  return (
    <div
      ref={pageRef}
      style={{
        display: "grid",
        gap: isFullscreen ? 0 : 16,
        background: "var(--color-bg)",
        padding: isFullscreen ? 0 : 0,
        minHeight: isFullscreen ? "100vh" : undefined,
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

      <div
        className={`fids-board${isFullscreen ? " fids-fullscreen" : ""}`}
        style={{
          borderRadius: isFullscreen ? 0 : undefined,
        }}
      >
        <div className="fids-header">
          <div className="fids-cell">Espacio</div>
          <div className="fids-cell">Actividades</div>
          <div className="fids-cell">Capacidad</div>
          <div className="fids-cell">Ubicacion</div>
          <div className="fids-cell">Estado</div>
        </div>

        {visibleRows.map((espacio) => {
          const status = statusInfo(espacio.estado_actual);
          return (
            <div key={espacio.id} className="fids-row">
              <div className="fids-cell">{espacio.nombre}</div>
              <div className="fids-cell">
                {espacio.actividades?.length ? espacio.actividades.map((actividad) => actividad.nombre).join(", ") : "-"}
              </div>
              <div className="fids-cell">{espacio.capacidad ?? "-"}</div>
              <div className="fids-cell">{espacio.ubicacion || "-"}</div>

              <div className={`fids-cell fids-status ${status.className}`}>{status.label}</div>
            </div>
          );
        })}

        {!loading && rows.length === 0 && (
          <div style={{ padding: 16, opacity: 0.8 }}>No hay espacios para mostrar.</div>
        )}
      </div>
    </div>
  );
}
