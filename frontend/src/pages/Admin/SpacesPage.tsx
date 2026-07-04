import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import { useEspacios } from "../../hooks/useEspacios";
import type { Espacio, EspacioEstadoOperativo, EspacioWriteDTO } from "../../models/espacio";
import { getErrorMessage } from "../../utils/error";

const estadoOptions = [
  { label: "Disponible", value: "DISPONIBLE" },
  { label: "Mantenimiento", value: "MANTENIMIENTO" },
  { label: "Fuera de servicio", value: "FUERA_DE_SERVICIO" },
];

const emptyForm: EspacioWriteDTO = {
  nombre: "",
  descripcion: "",
  capacidad: 0,
  estado_operativo: "DISPONIBLE",
  ubicacion: "",
  tags: "",
};

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

function statusMeta(value: string): { label: string; color: string; background: string } {
  if (value === "DISPONIBLE" || value === "Disponible") {
    return { label: "Libre", color: "#8ee59f", background: "rgba(142,229,159,0.10)" };
  }

  if (value === "MANTENIMIENTO" || value === "Mantenimiento") {
    return { label: "Mantenimiento", color: "#ffd24a", background: "rgba(255,210,74,0.12)" };
  }

  return { label: "Fuera de servicio", color: "#cbd5e1", background: "rgba(203,213,225,0.10)" };
}

function getSpaceDeleteErrorMessage(error: unknown): string {
  const message = getErrorMessage(error, "No se pudo eliminar el espacio.");
  if (message.toLowerCase().includes("registro esta en uso")) {
    return "No se puede eliminar este espacio porque tiene actividades o reservas asociadas.";
  }
  return message;
}

export default function SpacesPage() {
  const { data, loading, error, list, create, patch, remove } = useEspacios();

  const [form, setForm] = useState<EspacioWriteDTO>(emptyForm);
  const [items, setItems] = useState<Espacio[]>([]);
  const [selected, setSelected] = useState<Espacio | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [query, setQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: "info" | "success" | "error" }>({
    open: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    list({ page: "1" })
      .then((res) => setItems(res.results ?? []))
      .catch(() => {});
  }, [list]);

  useEffect(() => {
    if (data?.results) setItems(data.results);
  }, [data?.results]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((space) => {
      const haystack = `${space.nombre} ${space.ubicacion} ${space.estado_operativo} ${space.estado_actual} ${space.tags}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const unavailableCount = useMemo(() => {
    return items.filter((space) => space.estado_operativo !== "DISPONIBLE").length;
  }, [items]);

  const openCreate = () => {
    setForm(emptyForm);
    setSelected(null);
    setModalMode("create");
  };

  const openEdit = (space: Espacio) => {
    setSelected({ ...space });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const refresh = async () => {
    const res = await list({ page: "1" });
    setItems(res.results ?? []);

    if (selected?.id) {
      const fresh = res.results?.find((space: Espacio) => space.id === selected.id) ?? null;
      setSelected(fresh);
    }
  };

  const onCreate = async () => {
    if (!form.nombre.trim()) return;

    await create({
      ...form,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion?.trim(),
      ubicacion: form.ubicacion?.trim(),
      tags: form.tags?.trim(),
      capacidad: Math.max(0, Number(form.capacidad) || 0),
    });

    setForm(emptyForm);
    setModalMode(null);
    setToast({ open: true, message: "Espacio creado.", type: "success" });
    await refresh();
  };

  const onSave = async () => {
    if (!selected?.nombre.trim()) return;

    await patch(selected.id, {
      nombre: selected.nombre.trim(),
      descripcion: selected.descripcion?.trim(),
      capacidad: Math.max(0, Number(selected.capacidad) || 0),
      estado_operativo: selected.estado_operativo,
      ubicacion: selected.ubicacion?.trim(),
      tags: selected.tags?.trim(),
    });

    setToast({ open: true, message: "Espacio actualizado.", type: "success" });
    setModalMode(null);
    setSelected(null);
    await refresh();
  };

  const onDelete = async (id: string) => {
    setSelected(null);
    setModalMode(null);

    try {
      await remove(id);
      setToast({ open: true, message: "Espacio eliminado.", type: "success" });
      await refresh();
    } catch (err) {
      setToast({ open: true, message: getSpaceDeleteErrorMessage(err), type: "error" });
    }
  };

  const loadMore = async () => {
    if (!data?.next || loadingMore) return;

    try {
      setLoadingMore(true);
      const url = new URL(data.next);
      const nextPage = url.searchParams.get("page") ?? "";
      const res = await list(nextPage ? { page: nextPage } : undefined);
      setItems((prev) => [...prev, ...(res.results ?? [])]);
    } catch {
      setToast({ open: true, message: "No se pudo cargar mas.", type: "error" });
    } finally {
      setLoadingMore(false);
    }
  };

  const onQueryChange = (evt: ChangeEvent<HTMLInputElement>) => setQuery(evt.target.value);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Espacios"
        subtitle="Listado simple de canchas y ambientes disponibles para reservas."
        rightSlot={
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={openCreate}>+ Nuevo espacio</Button>
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={badgeStyle}>Cargados: {items.length}</span>
          <span style={badgeStyle}>Mostrando: {filtered.length}</span>
          <span style={badgeStyle}>No disponibles: {unavailableCount}</span>
          <span style={badgeStyle}>Total API: {data?.count ?? "-"}</span>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 18 }}>
        <Card title="Listado" subtitle="Doble click sobre un espacio para editarlo.">
          <div style={{ display: "grid", gap: 12 }}>
            <Input
              label="Buscar"
              placeholder="Nombre, ubicacion, estado o etiqueta..."
              value={query}
              onChange={onQueryChange}
            />

            {loading && <Loader label="Cargando espacios..." />}

            <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 640, overflow: "auto" }}>
              {filtered.map((space) => {
                const meta = statusMeta(space.estado_operativo);

                return (
                  <button
                    key={space.id}
                    type="button"
                    onDoubleClick={() => openEdit(space)}
                    style={{
                      textAlign: "left",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      background: "#0f1420",
                      color: "var(--color-text)",
                      padding: 14,
                      cursor: "default",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <strong>{space.nombre}</strong>
                      <span
                        style={{
                          border: `1px solid ${meta.color}`,
                          borderRadius: 999,
                          background: meta.background,
                          color: meta.color,
                          fontSize: 12,
                          fontWeight: 950,
                          padding: "5px 9px",
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 13 }}>
                      {space.ubicacion || "Sin ubicacion"} / Cap: {space.capacidad ?? "-"}
                    </div>
                    {space.tags && <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 12 }}>{space.tags}</div>}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(space);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  </button>
                );
              })}

              {!loading && filtered.length === 0 && (
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron espacios.</div>
              )}
            </div>

            <Button variant="outline" onClick={() => void loadMore()} disabled={!data?.next || loadingMore || loading} fullWidth>
              {loadingMore ? "Cargando..." : data?.next ? "Cargar mas espacios" : "No hay mas espacios"}
            </Button>
          </div>
        </Card>

      </div>

      {modalMode && createPortal(
        <div
          role="presentation"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(5, 8, 15, 0.72)",
            backdropFilter: "blur(3px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="space-edit-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(720px, 100%)",
              maxHeight: "88vh",
              overflow: "auto",
              border: "1px solid rgba(255,210,74,0.28)",
              borderRadius: 10,
              background: "var(--color-surface)",
              color: "var(--color-text)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 16 }}>
              <div>
                <h2 id="space-edit-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                  {modalMode === "create" ? "Nuevo espacio" : "Editar espacio"}
                </h2>
                <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
                  {modalMode === "create"
                    ? "Registra un espacio con los valores permitidos por el sistema."
                    : `Ajusta datos y disponibilidad de ${selected?.nombre}.`}
                </div>
              </div>
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cerrar
              </Button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {modalMode === "edit" && selected ? (
                <div style={panelStyle}>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Editando</div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>{selected.nombre}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: statusMeta(selected.estado_operativo).color, fontWeight: 900 }}>
                    Estado: {statusMeta(selected.estado_operativo).label}
                  </div>
                </div>
              ) : null}

              <Input
                label="Nombre"
                placeholder="Ej: Cancha 1"
                value={modalMode === "create" ? form.nombre : selected?.nombre ?? ""}
                onChange={(evt) =>
                  modalMode === "create"
                    ? setForm((s) => ({ ...s, nombre: evt.target.value }))
                    : setSelected((s) => (s ? { ...s, nombre: evt.target.value } : s))
                }
              />

              <Input
                label="Descripcion"
                placeholder="Opcional"
                value={modalMode === "create" ? form.descripcion ?? "" : selected?.descripcion ?? ""}
                onChange={(evt) =>
                  modalMode === "create"
                    ? setForm((s) => ({ ...s, descripcion: evt.target.value }))
                    : setSelected((s) => (s ? { ...s, descripcion: evt.target.value } : s))
                }
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input
                  label="Capacidad"
                  type="number"
                  value={String(modalMode === "create" ? form.capacidad ?? 0 : selected?.capacidad ?? 0)}
                  onChange={(evt) =>
                    modalMode === "create"
                      ? setForm((s) => ({ ...s, capacidad: Number(evt.target.value) }))
                      : setSelected((s) => (s ? { ...s, capacidad: Number(evt.target.value) } : s))
                  }
                />

                <Select
                  label="Estado"
                  options={estadoOptions}
                  value={modalMode === "create" ? form.estado_operativo : selected?.estado_operativo ?? "DISPONIBLE"}
                  onChange={(evt) =>
                    modalMode === "create"
                      ? setForm((s) => ({ ...s, estado_operativo: evt.target.value as EspacioEstadoOperativo }))
                      : setSelected((s) => (s ? { ...s, estado_operativo: evt.target.value as EspacioEstadoOperativo } : s))
                  }
                />
              </div>

              <Input
                label="Ubicacion"
                placeholder="Ej: Sede central"
                value={modalMode === "create" ? form.ubicacion ?? "" : selected?.ubicacion ?? ""}
                onChange={(evt) =>
                  modalMode === "create"
                    ? setForm((s) => ({ ...s, ubicacion: evt.target.value }))
                    : setSelected((s) => (s ? { ...s, ubicacion: evt.target.value } : s))
                }
              />

              <Input
                label="Etiquetas"
                placeholder="techada, iluminada, parqueo"
                value={modalMode === "create" ? form.tags ?? "" : selected?.tags ?? ""}
                onChange={(evt) =>
                  modalMode === "create"
                    ? setForm((s) => ({ ...s, tags: evt.target.value }))
                    : setSelected((s) => (s ? { ...s, tags: evt.target.value } : s))
                }
              />

              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  onClick={() => void (modalMode === "create" ? onCreate() : onSave())}
                  disabled={loading || (modalMode === "create" ? !form.nombre.trim() : !selected?.nombre.trim())}
                  fullWidth
                >
                  {loading ? <Loader label="Guardando..." /> : modalMode === "create" ? "Crear espacio" : "Guardar"}
                </Button>
                <Button variant="outline" onClick={closeModal} disabled={loading}>
                  Cerrar
                </Button>
              </div>

              {modalMode === "edit" && selected ? (
                <Button variant="danger" onClick={() => void onDelete(selected.id)} disabled={loading}>
                  Eliminar espacio
                </Button>
              ) : null}
            </div>
          </section>
        </div>,
        document.body
      )}

      {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
