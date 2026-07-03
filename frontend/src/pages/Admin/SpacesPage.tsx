import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import { useEspacios } from "../../hooks/useEspacios";
import type { Espacio, EspacioEstadoOperativo, EspacioWriteDTO } from "../../models/espacio";

const estadoOptions = [
  { label: "Disponible", value: "Disponible" },
  { label: "Mantenimiento", value: "Mantenimiento" },
  { label: "Fuera de servicio", value: "Fuera de servicio" },
];

const emptyForm: EspacioWriteDTO = {
  nombre: "",
  descripcion: "",
  capacidad: 0,
  estado_operativo: "Disponible",
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

function statusColor(value: string) {
  if (value === "LIBRE" || value === "Disponible") return "#8ee59f";
  if (value === "OCUPADO" || value === "Mantenimiento") return "#ffd24a";
  return "#ffb4b4";
}

export default function SpacesPage() {
  const { data, loading, error, list, create, patch, remove } = useEspacios();

  const [form, setForm] = useState<EspacioWriteDTO>(emptyForm);
  const [items, setItems] = useState<Espacio[]>([]);
  const [selected, setSelected] = useState<Espacio | null>(null);
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
    return items.filter((space) => space.estado_operativo !== "Disponible").length;
  }, [items]);

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
    await refresh();
  };

  const onDelete = async (id: string) => {
    await remove(id);
    if (selected?.id === id) setSelected(null);
    setToast({ open: true, message: "Espacio eliminado.", type: "success" });
    await refresh();
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
        subtitle="Crea, busca y actualiza canchas o ambientes disponibles para reservas."
        rightSlot={
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={badgeStyle}>Cargados: {items.length}</span>
          <span style={badgeStyle}>Mostrando: {filtered.length}</span>
          <span style={badgeStyle}>No disponibles: {unavailableCount}</span>
          <span style={badgeStyle}>Total API: {data?.count ?? "-"}</span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) minmax(360px, 1fr) minmax(300px, 420px)", gap: 18, alignItems: "start" }}>
        <Card title="Nuevo espacio" subtitle="Registra el espacio con datos basicos.">
          <div style={{ display: "grid", gap: 12 }}>
            <Input
              label="Nombre"
              placeholder="Ej: Cancha 1"
              value={form.nombre}
              onChange={(evt) => setForm((s) => ({ ...s, nombre: evt.target.value }))}
            />

            <Input
              label="Descripcion"
              placeholder="Opcional"
              value={form.descripcion ?? ""}
              onChange={(evt) => setForm((s) => ({ ...s, descripcion: evt.target.value }))}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input
                label="Capacidad"
                type="number"
                value={String(form.capacidad ?? 0)}
                onChange={(evt) => setForm((s) => ({ ...s, capacidad: Number(evt.target.value) }))}
              />

              <Select
                label="Estado"
                options={estadoOptions}
                value={form.estado_operativo}
                onChange={(evt) =>
                  setForm((s) => ({ ...s, estado_operativo: evt.target.value as EspacioEstadoOperativo }))
                }
              />
            </div>

            <Input
              label="Ubicacion"
              placeholder="Ej: Sede central"
              value={form.ubicacion ?? ""}
              onChange={(evt) => setForm((s) => ({ ...s, ubicacion: evt.target.value }))}
            />

            <Input
              label="Etiquetas"
              placeholder="techada, iluminada, parqueo"
              value={form.tags ?? ""}
              onChange={(evt) => setForm((s) => ({ ...s, tags: evt.target.value }))}
            />

            <Button onClick={() => void onCreate()} disabled={loading || !form.nombre.trim()} fullWidth>
              {loading ? <Loader label="Guardando..." /> : "Crear espacio"}
            </Button>
          </div>
        </Card>

        <Card title="Listado" subtitle="Selecciona un espacio para editarlo.">
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
                const active = selected?.id === space.id;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => setSelected({ ...space })}
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
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <strong>{space.nombre}</strong>
                      <span style={{ color: statusColor(space.estado_actual), fontSize: 12, fontWeight: 950 }}>
                        {space.estado_actual}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 13 }}>
                      {space.estado_operativo} / {space.ubicacion || "Sin ubicacion"} / Cap: {space.capacidad ?? "-"}
                    </div>
                    {space.tags && <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 12 }}>{space.tags}</div>}
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

        <Card title="Editar espacio" subtitle={selected ? "Ajusta datos y guarda cambios." : "Selecciona un espacio del listado."}>
          {!selected ? (
            <div style={{ ...panelStyle, color: "var(--color-text-muted)", fontSize: 13 }}>
              No hay espacio seleccionado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={panelStyle}>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Editando</div>
                <div style={{ fontSize: 18, fontWeight: 950 }}>{selected.nombre}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: statusColor(selected.estado_actual), fontWeight: 900 }}>
                  Estado actual: {selected.estado_actual}
                </div>
              </div>

              <Input
                label="Nombre"
                value={selected.nombre}
                onChange={(evt) => setSelected((s) => (s ? { ...s, nombre: evt.target.value } : s))}
              />

              <Input
                label="Descripcion"
                value={selected.descripcion ?? ""}
                onChange={(evt) => setSelected((s) => (s ? { ...s, descripcion: evt.target.value } : s))}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input
                  label="Capacidad"
                  type="number"
                  value={String(selected.capacidad ?? 0)}
                  onChange={(evt) => setSelected((s) => (s ? { ...s, capacidad: Number(evt.target.value) } : s))}
                />

                <Select
                  label="Estado"
                  options={estadoOptions}
                  value={selected.estado_operativo}
                  onChange={(evt) =>
                    setSelected((s) => (s ? { ...s, estado_operativo: evt.target.value as EspacioEstadoOperativo } : s))
                  }
                />
              </div>

              <Input
                label="Ubicacion"
                value={selected.ubicacion ?? ""}
                onChange={(evt) => setSelected((s) => (s ? { ...s, ubicacion: evt.target.value } : s))}
              />

              <Input
                label="Etiquetas"
                value={selected.tags ?? ""}
                onChange={(evt) => setSelected((s) => (s ? { ...s, tags: evt.target.value } : s))}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <Button onClick={() => void onSave()} disabled={loading || !selected.nombre.trim()} fullWidth>
                  {loading ? <Loader label="Guardando..." /> : "Guardar"}
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)} disabled={loading}>
                  Cerrar
                </Button>
              </div>

              <Button variant="danger" onClick={() => void onDelete(selected.id)} disabled={loading}>
                Eliminar espacio
              </Button>
            </div>
          )}
        </Card>
      </div>

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
