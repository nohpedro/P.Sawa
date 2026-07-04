import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import type { TipoActividad } from "../../models/actividad";
import { getErrorMessage } from "../../utils/error";

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

function getActivityDeleteErrorMessage(error: unknown): string {
  const message = getErrorMessage(error, "No se pudo eliminar la actividad.");
  if (message.toLowerCase().includes("registro esta en uso")) {
    return "No se puede eliminar esta actividad porque esta asignada a un espacio.";
  }
  return message;
}

export default function ActivitiesPage() {
  const { data, loading, error, list, create, patch, remove } = useTiposActividad();

  const [form, setForm] = useState({ nombre: "", descripcion: "", activo: true });
  const [selected, setSelected] = useState<TipoActividad | null>(null);
  const [editDraft, setEditDraft] = useState<TipoActividad | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  useEffect(() => {
    list({ page: "1" }).catch(() => {});
  }, [list]);

  const all = useMemo(() => data?.results ?? [], [data?.results]);
  const activeCount = useMemo(() => all.filter((a) => a.activo).length, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) => `${a.nombre} ${a.descripcion ?? ""}`.toLowerCase().includes(q));
  }, [all, query]);

  const refresh = async () => {
    const res = await list({ page: "1" });
    const currentId = editDraft?.id ?? selected?.id;
    if (!currentId) return;

    const found = res.results?.find((x: TipoActividad) => x.id === currentId) ?? null;
    setSelected(found);
    setEditDraft(found);
  };

  const onCreate = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) return;

    try {
      await create({ ...form, nombre, descripcion: form.descripcion.trim() });
      setForm({ nombre: "", descripcion: "", activo: true });
      setModalMode(null);
      setToast({ open: true, message: "Actividad creada.", type: "success" });
      await refresh();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo crear la actividad."), type: "error" });
    }
  };

  const onPick = (activity: TipoActividad) => {
    setSelected(activity);
    setEditDraft({ ...activity });
    setModalMode("edit");
  };

  const onSave = async () => {
    if (!editDraft?.nombre.trim()) return;

    try {
      await patch(editDraft.id, {
        nombre: editDraft.nombre.trim(),
        descripcion: editDraft.descripcion?.trim() ?? "",
        activo: editDraft.activo,
      });

      setToast({ open: true, message: "Actividad actualizada.", type: "success" });
      setModalMode(null);
      await refresh();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo actualizar la actividad."), type: "error" });
    }
  };

  const onDelete = async (id: string) => {
    setModalMode(null);
    setSelected(null);
    setEditDraft(null);

    try {
      await remove(id);
      setToast({ open: true, message: "Actividad eliminada.", type: "success" });
      await refresh();
    } catch (err) {
      setToast({ open: true, message: getActivityDeleteErrorMessage(err), type: "error" });
    }
  };

  const onQueryChange = (evt: ChangeEvent<HTMLInputElement>) => setQuery(evt.target.value);

  const openCreate = () => {
    setForm({ nombre: "", descripcion: "", activo: true });
    setSelected(null);
    setEditDraft(null);
    setModalMode("create");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditDraft(null);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Actividades"
        subtitle="Administra los deportes o servicios que luego se asignan a cada espacio."
        rightSlot={
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={openCreate}>+ Nueva actividad</Button>
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={badgeStyle}>Total: {all.length}</span>
          <span style={badgeStyle}>Activas: {activeCount}</span>
          <span style={badgeStyle}>Mostrando: {filtered.length}</span>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 18 }}>
        <Card title="Listado" subtitle="Click o doble click sobre una actividad para editarla.">
          <div style={{ display: "grid", gap: 14 }}>
            <Input label="Buscar" placeholder="Nombre o descripcion..." value={query} onChange={onQueryChange} />

            {loading && <Loader label="Cargando actividades..." />}

            <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 610, overflow: "auto" }}>
                {filtered.map((activity) => {
                  const active = selected?.id === activity.id;
                  return (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() => onPick(activity)}
                      onDoubleClick={() => onPick(activity)}
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
                        <strong>{activity.nombre}</strong>
                        <span style={{ color: activity.activo ? "#8ee59f" : "#ffb4b4", fontSize: 12, fontWeight: 900 }}>
                          {activity.activo ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.35 }}>
                        {activity.descripcion || "Sin descripcion"}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onPick(activity);
                          }}
                        >
                          Editar
                        </Button>
                      </div>
                    </button>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron actividades.</div>
                )}
            </div>

            {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}
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
            aria-labelledby="activity-edit-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(640px, 100%)",
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
                <h2 id="activity-edit-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                  {modalMode === "create" ? "Nueva actividad" : "Editar actividad"}
                </h2>
                <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
                  {modalMode === "create"
                    ? "Crea una actividad con nombre claro y descripcion corta."
                    : `Actualiza ${editDraft?.nombre ?? "la actividad seleccionada"}.`}
                </div>
              </div>
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cerrar
              </Button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {modalMode === "edit" && editDraft ? (
                <div style={panelStyle}>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Editando</div>
                  <div style={{ fontSize: 18, fontWeight: 950 }}>{editDraft.nombre}</div>
                </div>
              ) : null}

              <Input
                label="Nombre"
                placeholder="Ej: Futbol, Voley, Basquet"
                value={modalMode === "create" ? form.nombre : editDraft?.nombre ?? ""}
                onChange={(evt) =>
                  modalMode === "create"
                    ? setForm((s) => ({ ...s, nombre: evt.target.value }))
                    : setEditDraft((s) => (s ? { ...s, nombre: evt.target.value } : s))
                }
              />

              <Input
                label="Descripcion"
                placeholder="Opcional"
                value={modalMode === "create" ? form.descripcion : editDraft?.descripcion ?? ""}
                onChange={(evt) =>
                  modalMode === "create"
                    ? setForm((s) => ({ ...s, descripcion: evt.target.value }))
                    : setEditDraft((s) => (s ? { ...s, descripcion: evt.target.value } : s))
                }
              />

              <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={modalMode === "create" ? form.activo : !!editDraft?.activo}
                  onChange={(evt) =>
                    modalMode === "create"
                      ? setForm((s) => ({ ...s, activo: evt.target.checked }))
                      : setEditDraft((s) => (s ? { ...s, activo: evt.target.checked } : s))
                  }
                />
                <span style={{ fontSize: 13, fontWeight: 800 }}>Disponible para asignar a espacios</span>
              </label>

              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  onClick={() => void (modalMode === "create" ? onCreate() : onSave())}
                  disabled={loading || (modalMode === "create" ? !form.nombre.trim() : !editDraft?.nombre.trim())}
                  fullWidth
                >
                  {loading ? <Loader label="Guardando..." /> : modalMode === "create" ? "Crear actividad" : "Guardar"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (modalMode === "edit" ? setEditDraft(selected ? { ...selected } : null) : closeModal())}
                  disabled={loading}
                >
                  {modalMode === "edit" ? "Deshacer" : "Cerrar"}
                </Button>
              </div>

              {modalMode === "edit" && editDraft ? (
                <Button variant="danger" onClick={() => void onDelete(editDraft.id)} disabled={loading}>
                  Eliminar actividad
                </Button>
              ) : null}
            </div>
          </section>
        </div>,
        document.body
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
