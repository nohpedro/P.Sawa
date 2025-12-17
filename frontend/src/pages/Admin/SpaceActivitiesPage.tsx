import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

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

function moneyLike(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export default function SpaceActivitiesPage() {
  const espacios = useEspacios();
  const tipos = useTiposActividad();
  const ea = useEspacioActividad();

  // Paso 1: seleccionar espacio
  const [spaceQuery, setSpaceQuery] = useState("");
  const [espacioSel, setEspacioSel] = useState<Espacio | null>(null);

  // Paso 2: asignar actividad (autocomplete)
  const [actQuery, setActQuery] = useState("");
  const [tipoSel, setTipoSel] = useState<TipoActividad | null>(null);
  const [showActDropdown, setShowActDropdown] = useState(false);
  const actDropdownRef = useRef<HTMLDivElement | null>(null);

  const [duracion, setDuracion] = useState<number>(60);
  const [precio, setPrecio] = useState<string>("70.00");

  // Relaciones del espacio
  const [relaciones, setRelaciones] = useState<EspacioActividad[]>([]);

  // Editor rápido
  const [editing, setEditing] = useState<EspacioActividad | null>(null);

  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  // Load catálogos
  useEffect(() => {
    espacios.list({ page: "1" }).catch(() => {});
    tipos.list({ page: "1" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar relaciones cuando cambia el espacio
  useEffect(() => {
    if (!espacioSel?.id) {
      setRelaciones([]);
      setEditing(null);
      setTipoSel(null);
      setActQuery("");
      return;
    }

    ea.list({ page: "1", espacio: espacioSel.id })
      .then((res) => setRelaciones(res.results ?? []))
      .catch(() => {});

    setEditing(null);
    setTipoSel(null);
    setActQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [espacioSel?.id]);

  // Click fuera: cierra dropdown
  useEffect(() => {
    const onDocClick = (evt: MouseEvent) => {
      const target = evt.target as Node | null;
      if (!target) return;
      if (!actDropdownRef.current) return;
      if (!actDropdownRef.current.contains(target)) setShowActDropdown(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const espaciosFiltrados = useMemo(() => {
    const list = espacios.data?.results ?? [];
    const q = spaceQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => `${s.nombre} ${s.ubicacion} ${s.tags}`.toLowerCase().includes(q));
  }, [espacios.data, spaceQuery]);

  // 🔑 Set de actividades ya asignadas al espacio
  const assignedTipoIds = useMemo(() => {
    return new Set(relaciones.map((r) => r.tipo));
  }, [relaciones]);

  // ✅ Solo actividades NO asignadas al espacio
  const actividadesDisponibles = useMemo(() => {
    const list = tipos.data?.results ?? [];
    return list.filter((t) => !assignedTipoIds.has(t.id));
  }, [tipos.data, assignedTipoIds]);

  // Dropdown filtrado por texto (sobre las disponibles)
  const actividadesFiltradas = useMemo(() => {
    const q = actQuery.trim().toLowerCase();
    const base = actividadesDisponibles;

    if (!q) return base.slice(0, 14);

    return base
      .filter((t) => `${t.nombre} ${t.descripcion}`.toLowerCase().includes(q))
      .slice(0, 18);
  }, [actividadesDisponibles, actQuery]);

  // Aviso si el usuario escribe algo que ya está asignado
  const activityAlreadyAssigned = useMemo(() => {
    const q = actQuery.trim().toLowerCase();
    if (!q) return false;
    return relaciones.some((r) => (r.tipo_nombre ?? "").toLowerCase() === q);
  }, [actQuery, relaciones]);

  const selectedSpaceTitle = espacioSel
    ? `${espacioSel.nombre} · ${espacioSel.ubicacion || "—"}`
    : "Ninguno";

  const refreshRelaciones = async () => {
    if (!espacioSel?.id) return;
    const res = await ea.list({ page: "1", espacio: espacioSel.id });
    setRelaciones(res.results ?? []);
  };

  const onPickActividad = (t: TipoActividad) => {
    setTipoSel(t);
    setActQuery(t.nombre);
    setShowActDropdown(false);
  };

  const onAsignar = async () => {
    if (!espacioSel?.id) {
      setToast({ open: true, message: "Primero selecciona un espacio.", type: "error" });
      return;
    }
    if (!tipoSel?.id) {
      setToast({ open: true, message: "Selecciona una actividad (no asignada).", type: "error" });
      return;
    }
    if (assignedTipoIds.has(tipoSel.id)) {
      setToast({ open: true, message: "Esa actividad ya está asignada a este espacio.", type: "error" });
      return;
    }

    await ea.create({
      espacio: espacioSel.id,
      tipo: tipoSel.id,
      duracion_minutos: Math.max(1, duracion),
      precio_base: precio,
      activo: true,
    });

    setToast({ open: true, message: "Actividad asignada al espacio.", type: "success" });

    setTipoSel(null);
    setActQuery("");
    setDuracion(60);
    setPrecio("70.00");

    await refreshRelaciones();
  };

  const onGuardarEdicion = async () => {
    if (!editing) return;

    await ea.patch(editing.id, {
      duracion_minutos: editing.duracion_minutos,
      precio_base: editing.precio_base,
      activo: editing.activo,
    });

    setToast({ open: true, message: "Relación actualizada.", type: "success" });
    setEditing(null);
    await refreshRelaciones();
  };

  const onEliminar = async (id: string) => {
    await ea.remove(id);
    if (editing?.id === id) setEditing(null);
    setToast({ open: true, message: "Relación eliminada.", type: "success" });
    await refreshRelaciones();
  };

  const anyError = espacios.error || tipos.error || ea.error;
  const isBusy = espacios.loading || tipos.loading || ea.loading;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* CABECERA MÁS GRANDE */}
      <Card
        title="Asignación de Actividades por Espacio"
        subtitle="Elige un espacio → luego asigna solo actividades que aún no tiene."
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Espacio:</div>
          <div
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 999,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.04)",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: 0.2,
            }}
          >
            {selectedSpaceTitle}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Button variant="outline" onClick={() => void refreshRelaciones()} disabled={!espacioSel?.id || isBusy}>
              Refrescar
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "520px 1fr" }}>
        {/* PASO 1: Elegir espacio (más alto/espaciado) */}
        <Card title="1) Selecciona un espacio" subtitle="Busca y haz click.">
          <div style={{ display: "grid", gap: 14 }}>
            <Input
              label="Buscar espacio"
              placeholder="Ej: Cancha 1, Sede Central, techada..."
              value={spaceQuery}
              onChange={(evt: ChangeEvent<HTMLInputElement>) => setSpaceQuery(evt.target.value)}
            />

            {espacios.loading && <Loader label="Cargando espacios..." />}
            {espacios.error && <div style={{ color: "#ff5252", fontSize: 13 }}>{espacios.error}</div>}

            <div style={{ display: "grid", gap: 10, maxHeight: 520, overflow: "auto" }}>
              {espaciosFiltrados.map((s) => {
                const active = espacioSel?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setEspacioSel(s)}
                    style={{
                      border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      borderRadius: 12,
                      padding: 14,
                      cursor: "pointer",
                      background: active ? "rgba(255,210,74,0.07)" : "transparent",
                    }}
                  >
                    <div style={{ fontWeight: 950, fontSize: 14 }}>{s.nombre}</div>
                    <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                      {s.estado} · {s.ubicacion || "—"} · cap: {s.capacidad ?? "—"}
                    </div>
                    {s.tags && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{s.tags}</div>}
                  </div>
                );
              })}
              {!espacios.loading && espaciosFiltrados.length === 0 && (
                <div style={{ opacity: 0.85, fontSize: 13 }}>No se encontraron espacios.</div>
              )}
            </div>
          </div>
        </Card>

        {/* PASO 2/3 + LISTADO */}
        <div style={{ display: "grid", gap: 18 }}>
          {/* ASIGNACIÓN más grande */}
          <Card
            title="2) Asignar actividad"
            subtitle="Aquí solo verás actividades que todavía NO están asignadas al espacio."
          >
            <div style={{ display: "grid", gap: 14 }}>
              {/* Autocomplete */}
              <div ref={actDropdownRef} style={{ position: "relative" }}>
                <Input
                  label="Actividad"
                  placeholder={espacioSel ? "Escribe para buscar..." : "Primero selecciona un espacio"}
                  value={actQuery}
                  onChange={(evt: ChangeEvent<HTMLInputElement>) => {
                    setActQuery(evt.target.value);
                    setShowActDropdown(true);
                    setTipoSel(null);
                  }}
                  onFocus={() => setShowActDropdown(true)}
                  disabled={!espacioSel?.id}
                />

                {activityAlreadyAssigned && (
                  <div style={{ fontSize: 12, color: "#ffcc66", marginTop: 6 }}>
                    Esa actividad ya está asignada. Prueba otra.
                  </div>
                )}

                {showActDropdown && espacioSel?.id && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 20,
                      top: 78,
                      left: 0,
                      right: 0,
                      border: "1px solid var(--color-border)",
                      borderRadius: 14,
                      background: "var(--color-surface)",
                      maxHeight: 320,
                      overflow: "auto",
                      boxShadow: "0 12px 38px rgba(0,0,0,0.28)",
                    }}
                  >
                    {tipos.loading && <div style={{ padding: 14 }}><Loader label="Cargando..." /></div>}

                    {!tipos.loading && actividadesFiltradas.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => onPickActividad(t)}
                        style={{
                          padding: 14,
                          cursor: "pointer",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ fontWeight: 950, fontSize: 14 }}>{t.nombre}</div>
                        <div style={{ fontSize: 12, opacity: 0.78 }}>{t.descripcion || "—"}</div>
                      </div>
                    ))}

                    {!tipos.loading && actividadesFiltradas.length === 0 && (
                      <div style={{ padding: 14, opacity: 0.85, fontSize: 13 }}>
                        {actividadesDisponibles.length === 0
                          ? "Este espacio ya tiene todas las actividades disponibles asignadas."
                          : "No hay coincidencias con tu búsqueda."}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Input
                  label="Duración (min)"
                  type="number"
                  value={String(duracion)}
                  onChange={(evt: ChangeEvent<HTMLInputElement>) => setDuracion(Number(evt.target.value))}
                  disabled={!espacioSel?.id}
                />
                <Input
                  label="Precio base (Bs)"
                  value={precio}
                  onChange={(evt: ChangeEvent<HTMLInputElement>) => setPrecio(moneyLike(evt.target.value))}
                  disabled={!espacioSel?.id}
                />
              </div>

              <Button
                onClick={() => void onAsignar()}
                fullWidth
                disabled={!espacioSel?.id || !tipoSel?.id || ea.loading}
              >
                {ea.loading ? <Loader label="Asignando..." /> : "Asignar actividad"}
              </Button>

              {anyError && <div style={{ color: "#ff5252", fontSize: 13 }}>{anyError}</div>}
            </div>
          </Card>

          {/* LISTADO asignadas */}
          <Card title="Actividades asignadas" subtitle="Gestiona lo que ya está configurado en este espacio.">
            {!espacioSel?.id ? (
              <div style={{ opacity: 0.85, fontSize: 13 }}>
                Selecciona un espacio para ver sus actividades asignadas.
              </div>
            ) : (
              <>
                {ea.loading && <Loader label="Cargando..." />}

                <div style={{ display: "grid", gap: 10, marginTop: 10, maxHeight: 420, overflow: "auto" }}>
                  {relaciones.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        gap: 10,
                        alignItems: "center",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        padding: 14,
                        background: editing?.id === r.id ? "rgba(255,210,74,0.07)" : "transparent",
                      }}
                    >
                      <div onClick={() => setEditing(r)} style={{ cursor: "pointer" }}>
                        <div style={{ fontWeight: 950, fontSize: 14 }}>{r.tipo_nombre ?? r.tipo}</div>
                        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                          {r.duracion_minutos} min · Bs {r.precio_base}
                        </div>
                      </div>

                      <Button variant="outline" onClick={() => setEditing(r)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => void onEliminar(r.id)}>
                        Eliminar
                      </Button>
                    </div>
                  ))}

                  {!ea.loading && relaciones.length === 0 && (
                    <div style={{ opacity: 0.85, fontSize: 13 }}>
                      Este espacio aún no tiene actividades asignadas.
                    </div>
                  )}
                </div>

                {/* Editor */}
                {editing && (
                  <div style={{ marginTop: 16, borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
                    <div style={{ fontWeight: 950, marginBottom: 12 }}>
                      Editar: {editing.tipo_nombre ?? editing.tipo}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <Input
                        label="Duración (min)"
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

                    <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
                      <Button onClick={() => void onGuardarEdicion()} fullWidth disabled={ea.loading}>
                        {ea.loading ? <Loader label="Guardando..." /> : "Guardar cambios"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(null)} disabled={ea.loading}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
