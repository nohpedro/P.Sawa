import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import type { TipoActividad } from "../../models/actividad";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

export default function ActivitiesPage() {
  const { data, loading, error, list, create, patch, remove } = useTiposActividad();

  const [form, setForm] = useState({ nombre: "", descripcion: "", activo: true });

  const [selected, setSelected] = useState<TipoActividad | null>(null);
  const [editDraft, setEditDraft] = useState<TipoActividad | null>(null);

  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  useEffect(() => {
    list({ page: "1" }).catch(() => {});
  }, [list]);

  const refresh = async () => {
    const res = await list({ page: "1" });
    const id = editDraft?.id ?? selected?.id;
    if (id) {
      const found = res.results?.find((x: TipoActividad) => x.id === id);
      if (found) {
        setSelected(found);
        setEditDraft(found);
      }
    }
  };

  const all = data?.results ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) => `${a.nombre} ${a.descripcion ?? ""}`.toLowerCase().includes(q));
  }, [all, query]);

  const onCreate = async () => {
    if (!form.nombre.trim()) return;

    await create(form);
    setForm({ nombre: "", descripcion: "", activo: true });

    setToast({ open: true, message: "Actividad creada.", type: "success" });
    await refresh();
  };

  const onPick = (a: TipoActividad) => {
    setSelected(a);
    setEditDraft(a);
  };

  const onCancelEdit = () => {
    setEditDraft(selected);
  };

  const onSave = async () => {
    if (!editDraft) return;

    await patch(editDraft.id, {
      nombre: editDraft.nombre,
      descripcion: editDraft.descripcion,
      activo: editDraft.activo,
    });

    setToast({ open: true, message: "Actividad actualizada.", type: "success" });
    await refresh();
  };

  const onDelete = async (id: string) => {
    await remove(id);

    if (selected?.id === id) {
      setSelected(null);
      setEditDraft(null);
    }

    setToast({ open: true, message: "Actividad eliminada.", type: "success" });
    await refresh();
  };

  const onQueryChange = (evt: ChangeEvent<HTMLInputElement>) => setQuery(evt.target.value);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Cabecera */}
      <Card
        title="Tipos de Actividad"
        subtitle="Crea y administra actividades como Fútbol, Vóley, Básquet, etc."
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Total: <b>{all.length}</b> · Mostrando: <b>{filtered.length}</b>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        </div>
      </Card>

      {/* Layout más grande */}
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "560px 1fr" }}>
        {/* Crear */}
        <Card title="Crear nueva actividad" subtitle="Nombre, descripción y estado (activo/inactivo).">
          <div style={{ display: "grid", gap: 16 }}>
            <Input
              label="Nombre"
              placeholder="Ej: Fútbol"
              value={form.nombre}
              onChange={(evt) => setForm((s) => ({ ...s, nombre: evt.target.value }))}
            />

            <Input
              label="Descripción"
              placeholder="Opcional (ej: reglas, modalidad...)"
              value={form.descripcion}
              onChange={(evt) => setForm((s) => ({ ...s, descripcion: evt.target.value }))}
            />

            <label
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                fontSize: 13,
                opacity: 0.92,
                userSelect: "none",
                padding: "10px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(evt) => setForm((s) => ({ ...s, activo: evt.target.checked }))}
              />
              Activo (visible para asignar a espacios)
            </label>

            <Button onClick={() => void onCreate()} disabled={loading || !form.nombre.trim()} fullWidth>
              {loading ? <Loader label="Guardando..." /> : "Crear actividad"}
            </Button>

            {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}
          </div>
        </Card>

        {/* Listado + edición */}
        <Card title="Listado y edición" subtitle="Selecciona una actividad para editarla en el panel derecho.">
          <div style={{ display: "grid", gap: 14 }}>
            <Input
              label="Buscar"
              placeholder="Ej: vóley, basket, entrenamiento..."
              value={query}
              onChange={onQueryChange}
            />

            {loading && <Loader label="Cargando..." />}

            {/* Más ancho + más alto */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 520px", gap: 18 }}>
              {/* Lista */}
              <div
                style={{
                  maxHeight: 680,
                  overflow: "auto",
                  border: "1px solid var(--color-border)",
                  borderRadius: 14,
                  padding: 14,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ display: "grid", gap: 12 }}>
                  {filtered.map((a) => {
                    const active = selected?.id === a.id;

                    return (
                      <div
                        key={a.id}
                        onClick={() => onPick(a)}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto auto",
                          gap: 12,
                          alignItems: "center",
                          border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                          borderRadius: 14,
                          padding: 16,
                          minHeight: 92, // ✅ recuadros más largos
                          background: active ? "rgba(255,210,74,0.08)" : "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 950, fontSize: 15 }}>
                            {a.nombre}{" "}
                            {!a.activo && (
                              <span style={{ fontSize: 12, opacity: 0.75 }}>· (Inactivo)</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, opacity: 0.86, marginTop: 6, lineHeight: 1.35 }}>
                            {a.descripcion || "—"}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            onPick(a);
                          }}
                        >
                          Editar
                        </Button>

                        <Button
                          variant="danger"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            void onDelete(a.id);
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    );
                  })}

                  {!loading && filtered.length === 0 && (
                    <div style={{ opacity: 0.85, fontSize: 13 }}>No se encontraron actividades.</div>
                  )}
                </div>
              </div>

              {/* Panel de edición */}
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 14,
                  padding: 16,
                  background: "rgba(255,255,255,0.02)",
                  height: "fit-content",
                }}
              >
                {!editDraft ? (
                  <div style={{ opacity: 0.85, fontSize: 13 }}>
                    Selecciona una actividad para editar.
                  </div>
                ) : (
                  <>
                    <div style={{ fontWeight: 950, fontSize: 15, marginBottom: 12 }}>
                      Editar: {editDraft.nombre}
                    </div>

                    <div style={{ display: "grid", gap: 16 }}>
                      <Input
                        label="Nombre"
                        value={editDraft.nombre}
                        onChange={(evt) =>
                          setEditDraft((s) => (s ? { ...s, nombre: evt.target.value } : s))
                        }
                      />

                      <Input
                        label="Descripción"
                        value={editDraft.descripcion}
                        onChange={(evt) =>
                          setEditDraft((s) => (s ? { ...s, descripcion: evt.target.value } : s))
                        }
                      />

                      <label
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          fontSize: 13,
                          opacity: 0.92,
                          userSelect: "none",
                          padding: "10px 12px",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!editDraft.activo}
                          onChange={(evt) =>
                            setEditDraft((s) => (s ? { ...s, activo: evt.target.checked } : s))
                          }
                        />
                        Activo
                      </label>

                      <div style={{ display: "flex", gap: 12 }}>
                        <Button onClick={() => void onSave()} disabled={loading} fullWidth>
                          {loading ? <Loader label="Actualizando..." /> : "Guardar"}
                        </Button>
                        <Button variant="outline" onClick={onCancelEdit} disabled={loading}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}
          </div>
        </Card>
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
