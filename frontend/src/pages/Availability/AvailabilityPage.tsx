import { useEffect } from "react";


import Loader from "../../components/ui/Loader";


import { useEspacios } from "../../hooks/useEspacios";


export default function AvailabilityPage() {

  const { data, loading, error, list } = useEspacios();

  useEffect(() => {
    // Carga inicial de espacios (DRF paginado)
    list({ page: "1" }).catch(() => {});
  }, [list]);


  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>
            DISPONIBILIDAD DE ESPACIOS
          </div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Sawa
          </div>
        </div>
      </div>

      {loading && (
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

      <div className="fids-board">
        <div className="fids-header">
          <div className="fids-cell">Espacio</div>
          <div className="fids-cell">Actividades</div>
          <div className="fids-cell">Capacidad</div>
          <div className="fids-cell">Ubicación</div>
          <div className="fids-cell">Estado</div>
        </div>

        {(data?.results ?? []).map((esp) => {
          const estado = (esp.estado ?? "").toLowerCase();

          // mapeo simple a clases (puedes afinar luego)
          const statusClass =
            estado.includes("dispon") ? "available" :
            estado.includes("ocup") ? "occupied" :
            estado.includes("prox") ? "upcoming" :
            "unavailable";

          return (
            <div key={esp.id} className="fids-row">
              <div className="fids-cell">{esp.nombre}</div>
              <div className="fids-cell">
                {esp.actividades?.length
                  ? esp.actividades.map((a) => a.nombre).join(", ")
                  : "—"}
              </div>
              <div className="fids-cell">{esp.capacidad ?? "—"}</div>
              <div className="fids-cell">{esp.ubicacion ?? "—"}</div>
              <div className={`fids-cell fids-status ${statusClass}`}>
                {esp.estado ?? "—"}
              </div>
            </div>
          );
        })}

        {!loading && (data?.results?.length ?? 0) === 0 && (
          <div style={{ padding: 16, opacity: 0.8 }}>
            No hay espacios para mostrar.
          </div>
        )}
      </div>
    </div>
  );
}
