import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import { useEspacios } from "../../hooks/useEspacios";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import { useEspacioActividad } from "../../hooks/useEspacioActividad";

import type { Espacio } from "../../models/espacio";
import type { TipoActividad, EspacioActividad } from "../../models/actividad";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

const badgeStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
};

function moneyLike(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function estadoColor(value: string) {
  if (value === "LIBRE" || value === "Disponible") return "#8ee59f";
  if (value === "OCUPADO" || value === "Mantenimiento") return "#ffd24a";
  return "#ffb4b4";
}

export default function SpaceActivitiesPage() {
  const espacios = useEspacios();
  const tipos = useTiposActividad();
  const ea = useEspacioActividad();

  const [spaceQuery, setSpaceQuery] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [espacioSel, setEspacioSel] = useState<Espacio | null>(null);
  const [tipoSel, setTipoSel] = useState<TipoActividad | null>(null);
  const [duracion, setDuracion] = useState(60);
  const [precio, setPrecio] = useState("70.00");
  const [relaciones, setRelaciones] = useState<EspacioActividad[]>([]);
  const [editing, setEditing] = useState<EspacioActividad | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  useEffect(() => {
    espacios.list({ page: "1" }).catch(() => {});
    tipos.list({ page: "1" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!espacioSel?.id) {
      setRelaciones([]);
      setEditing(null);
      setTipoSel(null);
      return;
    }

    ea.list({ page: "1", espacio: espacioSel.id })
      .then((res) => setRelaciones(res.results ?? []))
      .catch(() => {});

    setEditing(null);
    setTipoSel(null);
    setActivityQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espacioSel?.id]);

  const espaciosList = useMemo(() => espacios.data?.results ?? [], [espacios.data?.results]);
  const actividadesList = useMemo(() => tipos.data?.results ?? [], [tipos.data?.results]);

  const espaciosFiltrados = useMemo(() => {
    const q = spaceQuery.trim().toLowerCase();
    if (!q) return espaciosList;
    return espaciosList.filter((space) =>
      `${space.nombre} ${space.ubicacion} ${space.tags} ${space.estado_operativo}`.toLowerCase().includes(q)
    );
  }, [espaciosList, spaceQuery]);

  const assignedTipoIds = useMemo(() => new Set(relaciones.map((rel) => rel.tipo)), [relaciones]);

  const actividadesDisponibles = useMemo(() => {
    return actividadesList.filter((activity) => activity.activo && !assignedTipoIds.has(activity.id));
  }, [actividadesList, assignedTipoIds]);

  const actividadesFiltradas = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    const base = actividadesDisponibles;
    if (!q) return base;
    return base.filter((activity) => `${activity.nombre} ${activity.descripcion ?? ""}`.toLowerCase().includes(q));
  }, [actividadesDisponibles, activityQuery]);

  const selectedSpaceTitle = espacioSel
    ? `${espacioSel.nombre} / ${espacioSel.ubicacion || "Sin ubicacion"}`
    : "Sin espacio seleccionado";

  const refreshRelaciones = async () => {
    if (!espacioSel?.id) return;
    const res = await ea.list({ page: "1", espacio: espacioSel.id });
    setRelaciones(res.results ?? []);
  };

  const onPickSpace = (space: Espacio) => {
    setEspacioSel(space);
  };

  const onPickActividad = (activity: TipoActividad) => {
    setTipoSel(activity);
    setActivityQuery(activity.nombre);
  };

  const onAsignar = async () => {
    if (!espacioSel?.id) {
      setToast({ open: true, message: "Primero selecciona un espacio.", type: "error" });
      return;
    }

    if (!tipoSel?.id) {
      setToast({ open: true, message: "Selecciona una actividad disponible.", type: "error" });
      return;
    }

    await ea.create({
      espacio: espacioSel.id,
      tipo: tipoSel.id,
      duracion_minutos: Math.max(1, Number(duracion) || 1),
      precio_base: precio || "0",
      activo: true,
    });

    setToast({ open: true, message: "Actividad asignada.", type: "success" });
    setTipoSel(null);
    setActivityQuery("");
    setDuracion(60);
    setPrecio("70.00");
    await refreshRelaciones();
  };

  const onGuardarEdicion = async () => {
    if (!editing) return;

    await ea.patch(editing.id, {
      duracion_minutos: Math.max(1, Number(editing.duracion_minutos) || 1),
      precio_base: editing.precio_base || "0",
      activo: editing.activo,
    });

    setToast({ open: true, message: "Asignacion actualizada.", type: "success" });
    setEditing(null);
    await refreshRelaciones();
  };

  const onEliminar = async (id: string) => {
    await ea.remove(id);
    if (editing?.id === id) setEditing(null);
    setToast({ open: true, message: "Asignacion eliminada.", type: "success" });
    await refreshRelaciones();
  };

  const anyError = espacios.error || tipos.error || ea.error;
  const isBusy = espacios.loading || tipos.loading || ea.loading;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Designacion de actividades"
        subtitle="Elige un espacio y define que actividades acepta, con duracion y precio base."
        rightSlot={
          <Button variant="outline" onClick={() => void refreshRelaciones()} disabled={!espacioSel?.id || isBusy}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={badgeStyle}>{selectedSpaceTitle}</span>
          <span style={badgeStyle}>Asignadas: {relaciones.length}</span>
          <span style={badgeStyle}>Disponibles: {actividadesDisponibles.length}</span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 390px) minmax(340px, 1fr) minmax(320px, 430px)", gap: 18, alignItems: "start" }}>
        <Card title="1. Espacio" subtitle="Busca y selecciona donde se podra reservar.">
          <div style={{ display: "grid", gap: 12 }}>
            <Input
              label="Buscar espacio"
              placeholder="Cancha, sede, etiqueta..."
              value={spaceQuery}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => setSpaceQuery(evt.target.value)}
            />

            {espacios.loading && <Loader label="Cargando espacios..." />}

            <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 620, overflow: "auto" }}>
              {espaciosFiltrados.map((space) => {
                const active = espacioSel?.id === space.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => onPickSpace(space)}
                    style={{
                      textAlign: "left",
                      border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      borderRadius: 8,
                      background: active ? "rgba(255,210,74,0.07)" : "#0f1420",
                      color: "var(--color-text)",
                      padding: 14,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <strong>{space.nombre}</strong>
                      <span style={{ color: estadoColor(space.estado_actual), fontSize: 12, fontWeight: 950 }}>
                        {space.estado_actual}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 13 }}>
                      {space.estado_operativo} / {space.ubicacion || "Sin ubicacion"} / Cap: {space.capacidad ?? "-"}
                    </div>
                  </button>
                );
              })}

              {!espacios.loading && espaciosFiltrados.length === 0 && (
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron espacios.</div>
              )}
            </div>
          </div>
        </Card>

        <Card title="2. Asignar actividad" subtitle="Solo aparecen actividades activas y no asignadas.">
          <div style={{ display: "grid", gap: 14 }}>
            {!espacioSel ? (
              <div style={{ ...panelStyle, color: "var(--color-text-muted)", fontSize: 13 }}>
                Selecciona un espacio para continuar.
              </div>
            ) : (
              <>
                <Input
                  label="Buscar actividad"
                  placeholder="Futbol, voley, entrenamiento..."
                  value={activityQuery}
                  onChange={(evt: ChangeEvent<HTMLInputElement>) => {
                    setActivityQuery(evt.target.value);
                    setTipoSel(null);
                  }}
                />

                {tipos.loading && <Loader label="Cargando actividades..." />}

                <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 260, overflow: "auto" }}>
                  {actividadesFiltradas.map((activity) => {
                    const active = tipoSel?.id === activity.id;
                    return (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() => onPickActividad(activity)}
                        style={{
                          textAlign: "left",
                          border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                          borderRadius: 8,
                          background: active ? "rgba(255,210,74,0.07)" : "#0f1420",
                          color: "var(--color-text)",
                          padding: 12,
                          cursor: "pointer",
                        }}
                      >
                        <strong>{activity.nombre}</strong>
                        <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                          {activity.descripcion || "Sin descripcion"}
                        </div>
                      </button>
                    );
                  })}

                  {!tipos.loading && actividadesFiltradas.length === 0 && (
                    <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                      {actividadesDisponibles.length === 0
                        ? "Este espacio ya tiene todas las actividades disponibles."
                        : "No hay coincidencias."}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Input
                    label="Duracion (min)"
                    type="number"
                    value={String(duracion)}
                    onChange={(evt: ChangeEvent<HTMLInputElement>) => setDuracion(Number(evt.target.value))}
                  />
                  <Input
                    label="Precio base (Bs)"
                    value={precio}
                    onChange={(evt: ChangeEvent<HTMLInputElement>) => setPrecio(moneyLike(evt.target.value))}
                  />
                </div>

                <Button onClick={() => void onAsignar()} fullWidth disabled={!tipoSel?.id || ea.loading}>
                  {ea.loading ? <Loader label="Asignando..." /> : "Asignar al espacio"}
                </Button>
              </>
            )}
          </div>
        </Card>

        <Card title="3. Actividades asignadas" subtitle="Edita duracion, precio o disponibilidad.">
          {!espacioSel ? (
            <div style={{ ...panelStyle, color: "var(--color-text-muted)", fontSize: 13 }}>
              Selecciona un espacio para ver sus actividades.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {ea.loading && <Loader label="Cargando asignaciones..." />}

              <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 350, overflow: "auto" }}>
                {relaciones.map((rel) => {
                  const active = editing?.id === rel.id;
                  return (
                    <div
                      key={rel.id}
                      style={{
                        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                        borderRadius: 8,
                        background: active ? "rgba(255,210,74,0.07)" : "#0f1420",
                        padding: 12,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setEditing({ ...rel })}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: 0,
                          background: "transparent",
                          color: "var(--color-text)",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <strong>{rel.tipo_nombre ?? rel.tipo}</strong>
                          <span style={{ color: rel.activo ? "#8ee59f" : "#ffb4b4", fontSize: 12, fontWeight: 950 }}>
                            {rel.activo ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                        <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 13 }}>
                          {rel.duracion_minutos} min / Bs {rel.precio_base}
                        </div>
                      </button>
                    </div>
                  );
                })}

                {!ea.loading && relaciones.length === 0 && (
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                    Este espacio aun no tiene actividades asignadas.
                  </div>
                )}
              </div>

              {editing && (
                <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Editando</div>
                    <div style={{ fontSize: 17, fontWeight: 950 }}>{editing.tipo_nombre ?? editing.tipo}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Input
                      label="Duracion (min)"
                      type="number"
                      value={String(editing.duracion_minutos)}
                      onChange={(evt: ChangeEvent<HTMLInputElement>) =>
                        setEditing((s) => (s ? { ...s, duracion_minutos: Number(evt.target.value) } : s))
                      }
                    />
                    <Input
                      label="Precio base (Bs)"
                      value={editing.precio_base}
                      onChange={(evt: ChangeEvent<HTMLInputElement>) =>
                        setEditing((s) => (s ? { ...s, precio_base: moneyLike(evt.target.value) } : s))
                      }
                    />
                  </div>

                  <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!editing.activo}
                      onChange={(evt) => setEditing((s) => (s ? { ...s, activo: evt.target.checked } : s))}
                    />
                    <span style={{ fontSize: 13, fontWeight: 800 }}>Disponible para reservar</span>
                  </label>

                  <div style={{ display: "flex", gap: 10 }}>
                    <Button onClick={() => void onGuardarEdicion()} disabled={ea.loading} fullWidth>
                      {ea.loading ? <Loader label="Guardando..." /> : "Guardar"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(null)} disabled={ea.loading}>
                      Cerrar
                    </Button>
                  </div>

                  <Button variant="danger" onClick={() => void onEliminar(editing.id)} disabled={ea.loading}>
                    Quitar del espacio
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {anyError && <div style={{ color: "#ff5252", fontSize: 13 }}>{anyError}</div>}

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
