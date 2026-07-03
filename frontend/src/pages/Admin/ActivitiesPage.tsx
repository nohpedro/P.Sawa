import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import type { TipoActividad } from "../../models/actividad";

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

    await create({ ...form, nombre, descripcion: form.descripcion.trim() });
    setForm({ nombre: "", descripcion: "", activo: true });
    setToast({ open: true, message: "Actividad creada.", type: "success" });
    await refresh();
  };

  const onPick = (activity: TipoActividad) => {
    setSelected(activity);
    setEditDraft({ ...activity });
  };

  const onSave = async () => {
    if (!editDraft?.nombre.trim()) return;

    await patch(editDraft.id, {
      nombre: editDraft.nombre.trim(),
      descripcion: editDraft.descripcion?.trim() ?? "",
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
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Actividades"
        subtitle="Administra los deportes o servicios que luego se asignan a cada espacio."
        rightSlot={
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={badgeStyle}>Total: {all.length}</span>
          <span style={badgeStyle}>Activas: {activeCount}</span>
          <span style={badgeStyle}>Mostrando: {filtered.length}</span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <Card title="Nueva actividad" subtitle="Crea una actividad con nombre claro y descripcion corta.">
          <div style={{ display: "grid", gap: 14 }}>
            <Input
              label="Nombre"
              placeholder="Ej: Futbol, Voley, Basquet"
              value={form.nombre}
              onChange={(evt) => setForm((s) => ({ ...s, nombre: evt.target.value }))}
            />

            <Input
              label="Descripcion"
              placeholder="Opcional"
              value={form.descripcion}
              onChange={(evt) => setForm((s) => ({ ...s, descripcion: evt.target.value }))}
            />

            <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(evt) => setForm((s) => ({ ...s, activo: evt.target.checked }))}
              />
              <span style={{ fontSize: 13, fontWeight: 800 }}>Disponible para asignar a espacios</span>
            </label>

            <Button onClick={() => void onCreate()} disabled={loading || !form.nombre.trim()} fullWidth>
              {loading ? <Loader label="Guardando..." /> : "Crear actividad"}
            </Button>
          </div>
        </Card>

        <Card title="Listado" subtitle="Busca, selecciona y edita una actividad sin cambiar de pantalla.">
          <div style={{ display: "grid", gap: 14 }}>
            <Input label="Buscar" placeholder="Nombre o descripcion..." value={query} onChange={onQueryChange} />

            {loading && <Loader label="Cargando actividades..." />}

            <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 420px)", gap: 14, alignItems: "start" }}>
              <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 610, overflow: "auto" }}>
                {filtered.map((activity) => {
                  const active = selected?.id === activity.id;
                  return (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() => onPick(activity)}
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
                    </button>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron actividades.</div>
                )}
              </div>

              <div style={panelStyle}>
                {!editDraft ? (
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                    Selecciona una actividad para editarla.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Editando</div>
                      <div style={{ fontSize: 18, fontWeight: 950 }}>{editDraft.nombre}</div>
                    </div>

                    <Input
                      label="Nombre"
                      value={editDraft.nombre}
                      onChange={(evt) => setEditDraft((s) => (s ? { ...s, nombre: evt.target.value } : s))}
                    />

                    <Input
                      label="Descripcion"
                      value={editDraft.descripcion ?? ""}
                      onChange={(evt) => setEditDraft((s) => (s ? { ...s, descripcion: evt.target.value } : s))}
                    />

                    <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!editDraft.activo}
                        onChange={(evt) => setEditDraft((s) => (s ? { ...s, activo: evt.target.checked } : s))}
                      />
                      <span style={{ fontSize: 13, fontWeight: 800 }}>Actividad activa</span>
                    </label>

                    <div style={{ display: "flex", gap: 10 }}>
                      <Button onClick={() => void onSave()} disabled={loading || !editDraft.nombre.trim()} fullWidth>
                        {loading ? <Loader label="Guardando..." /> : "Guardar"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditDraft(selected ? { ...selected } : null)} disabled={loading}>
                        Deshacer
                      </Button>
                    </div>

                    <Button variant="danger" onClick={() => void onDelete(editDraft.id)} disabled={loading}>
                      Eliminar actividad
                    </Button>
                  </div>
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
