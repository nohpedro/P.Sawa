import { useEffect, useMemo, useRef, useState, type ChangeEvent, type UIEvent } from "react";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import { useEspacios } from "../../hooks/useEspacios";
import type { Espacio, EspacioWriteDTO } from "../../models/espacio";

const ESTADOS = ["Disponible", "Mantenimiento", "Fuera de servicio"] as const;
type EspacioEstado = (typeof ESTADOS)[number];

const estadoOptions = [
  { label: "Disponible", value: "Disponible" },
  { label: "Mantenimiento", value: "Mantenimiento" },
  { label: "Fuera de servicio", value: "Fuera de servicio" },
];

const LS_KEYS = {
  selectedId: "pv_admin_spaces_selected_id",
  scrollTop: "pv_admin_spaces_scroll_top",
  searchQuery: "pv_admin_spaces_search_query",
} as const;

// Virtualization tuning
const ITEM_HEIGHT = 92; // px (alto aproximado de una fila)
const OVERSCAN = 6;     // filas extra arriba/abajo
const LIST_HEIGHT = 420; // px (alto del contenedor scroll)

function safeParseNumber(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function SpacesPage() {
  const { data, loading, error, list, create, patch, remove } = useEspacios();

  const [form, setForm] = useState<EspacioWriteDTO>({
    nombre: "",
    descripcion: "",
    capacidad: 0,
    estado: "Disponible",
    ubicacion: "",
    tags: "",
  });

  const [selected, setSelected] = useState<Espacio | null>(null);

  const [query, setQuery] = useState<string>(() => localStorage.getItem(LS_KEYS.searchQuery) ?? "");
  const [items, setItems] = useState<Espacio[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  // Scroll persistence + virtualization window
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollPersistTimerRef = useRef<number | null>(null);
  const rafScrollRef = useRef<number | null>(null);

  const [scrollTop, setScrollTop] = useState<number>(() =>
    safeParseNumber(localStorage.getItem(LS_KEYS.scrollTop), 0)
  );

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: "info" | "success" | "error";
  }>({ open: false, message: "", type: "info" });

  // Load initial page
  useEffect(() => {
    list({ page: "1" })
      .then((res) => setItems(res.results ?? []))
      .catch(() => {});
  }, [list]);

  // Sync items when hook data changes (page 1 refresh)
  useEffect(() => {
    if (data?.results) setItems(data.results);
  }, [data?.results]);

  // Restore selection after items load
  useEffect(() => {
    const savedId = localStorage.getItem(LS_KEYS.selectedId);
    if (!savedId) return;
    const found = items.find((x) => x.id === savedId);
    if (found) setSelected(found);
  }, [items]);

  // Persist selection
  useEffect(() => {
    if (selected?.id) localStorage.setItem(LS_KEYS.selectedId, selected.id);
    else localStorage.removeItem(LS_KEYS.selectedId);
  }, [selected?.id]);

  // Persist search query
  useEffect(() => {
    localStorage.setItem(LS_KEYS.searchQuery, query);
  }, [query]);

  // Restore scrollTop on mount
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = scrollTop;
  }, []); // only once

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (scrollPersistTimerRef.current) window.clearTimeout(scrollPersistTimerRef.current);
      if (rafScrollRef.current) window.cancelAnimationFrame(rafScrollRef.current);
    };
  }, []);

  const refresh = async () => {
    const res = await list({ page: "1" });
    setItems(res.results ?? []);
  };

  const onCreate = async () => {
    const estado = (form.estado ?? "Disponible") as EspacioEstado;
    if (!ESTADOS.includes(estado)) {
      setToast({ open: true, message: "Estado inválido.", type: "error" });
      return;
    }

    await create({ ...form, estado });
    setForm({
      nombre: "",
      descripcion: "",
      capacidad: 0,
      estado: "Disponible",
      ubicacion: "",
      tags: "",
    });

    setToast({ open: true, message: "Espacio creado.", type: "success" });
    await refresh();
  };

  const onSave = async () => {
    if (!selected) return;

    const estado = (selected.estado ?? "Disponible") as EspacioEstado;
    if (!ESTADOS.includes(estado)) {
      setToast({ open: true, message: "Estado inválido.", type: "error" });
      return;
    }

    await patch(selected.id, {
      nombre: selected.nombre,
      descripcion: selected.descripcion,
      capacidad: selected.capacidad,
      estado,
      ubicacion: selected.ubicacion,
      tags: selected.tags,
    });

    setToast({ open: true, message: "Espacio actualizado.", type: "success" });
    await refresh();
  };

  const onDelete = async (id: string) => {
    await remove(id);
    setToast({ open: true, message: "Espacio eliminado.", type: "success" });
    if (selected?.id === id) setSelected(null);
    await refresh();
  };

  // DRF next page (accumulate items)
  const loadMore = async () => {
    if (!data?.next || loadingMore) return;
    try {
      setLoadingMore(true);

      const url = new URL(data.next);
      const nextPage = url.searchParams.get("page") ?? "";
      const res = await list(nextPage ? { page: nextPage } : undefined);

      setItems((prev) => [...prev, ...(res.results ?? [])]);
    } catch {
      setToast({ open: true, message: "No se pudo cargar más.", type: "error" });
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((s) => {
      const haystack = `${s.nombre} ${s.ubicacion} ${s.estado} ${s.tags}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  // Virtualization calculations
  const totalHeight = filtered.length * ITEM_HEIGHT;

  const startIndex = useMemo(() => {
    const raw = Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN;
    return clamp(raw, 0, Math.max(0, filtered.length - 1));
  }, [scrollTop, filtered.length]);

  const endIndex = useMemo(() => {
    const visibleCount = Math.ceil(LIST_HEIGHT / ITEM_HEIGHT) + OVERSCAN * 2;
    return clamp(startIndex + visibleCount, 0, filtered.length);
  }, [startIndex, filtered.length]);

  const visibleItems = useMemo(() => filtered.slice(startIndex, endIndex), [filtered, startIndex, endIndex]);
  const offsetTop = startIndex * ITEM_HEIGHT;

  // Scroll handler: throttle with rAF + persist (debounced)
  const onScroll = (evt: UIEvent<HTMLDivElement>) => {
    const el = evt.currentTarget;
    const nextTop = el.scrollTop;

    if (rafScrollRef.current) window.cancelAnimationFrame(rafScrollRef.current);
    rafScrollRef.current = window.requestAnimationFrame(() => {
      setScrollTop(nextTop);
    });

    if (scrollPersistTimerRef.current) window.clearTimeout(scrollPersistTimerRef.current);
    scrollPersistTimerRef.current = window.setTimeout(() => {
      localStorage.setItem(LS_KEYS.scrollTop, String(nextTop));
    }, 150);
  };

  const onQueryChange = (evt: ChangeEvent<HTMLInputElement>) => setQuery(evt.target.value);

  const Row = (s: Espacio) => {
    const isSelected = selected?.id === s.id;

    return (
      <div key={s.id} style={{ height: ITEM_HEIGHT, padding: "6px 0" }}>
        <div
          onClick={() => setSelected(s)}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 8,
            alignItems: "center",
            border: `1px solid ${isSelected ? "var(--color-accent)" : "var(--color-border)"}`,
            borderRadius: 10,
            padding: 12,
            background: isSelected ? "rgba(255,210,74,0.06)" : "transparent",
            cursor: "pointer",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>{s.nombre}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {s.estado} · {s.ubicacion || "—"} · cap: {s.capacidad ?? "—"}
            </div>
            {s.tags && (
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                {s.tags}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={(evt) => {
              evt.stopPropagation();
              setSelected(s);
            }}
          >
            Editar
          </Button>

          <Button
            variant="danger"
            onClick={(evt) => {
              evt.stopPropagation();
              void onDelete(s.id);
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "420px 1fr" }}>
      {/* LEFT: Create */}
      <Card title="Crear Espacio" subtitle="Registro de nuevo espacio deportivo">
        <div style={{ display: "grid", gap: 12 }}>
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={(evt) => setForm((s) => ({ ...s, nombre: evt.target.value }))}
          />

          <Input
            label="Descripción"
            value={form.descripcion ?? ""}
            onChange={(evt) => setForm((s) => ({ ...s, descripcion: evt.target.value }))}
          />

          <Input
            label="Capacidad"
            type="number"
            value={String(form.capacidad ?? 0)}
            onChange={(evt) => setForm((s) => ({ ...s, capacidad: Number(evt.target.value) }))}
          />

          {/* ✅ Estado como combo */}
          <Select
            label="Estado"
            options={estadoOptions}
            value={(form.estado ?? "Disponible") as string}
            onChange={(evt) => setForm((s) => ({ ...s, estado: evt.target.value }))}
          />

          <Input
            label="Ubicación"
            value={form.ubicacion ?? ""}
            onChange={(evt) => setForm((s) => ({ ...s, ubicacion: evt.target.value }))}
          />

          <Input
            label="Tags"
            value={form.tags ?? ""}
            onChange={(evt) => setForm((s) => ({ ...s, tags: evt.target.value }))}
            hint="Ej: techada,iluminada,parqueo"
          />

          <Button onClick={() => void onCreate()} disabled={loading || !form.nombre.trim()} fullWidth>
            {loading ? <Loader label="Guardando..." /> : "Crear"}
          </Button>

          {error && <div style={{ color: "#ff5252", fontSize: 12 }}>{error}</div>}
        </div>
      </Card>

      {/* RIGHT: List + Edit */}
      <Card
        title="Espacios"
        subtitle="Búsqueda + virtualización + selección persistente."
        rightSlot={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        }
        style={{ maxWidth: "none" }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <Input
            label="Buscar"
            placeholder="Nombre, ubicación, estado, tags..."
            value={query}
            onChange={onQueryChange}
          />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8 }}>
            <span>Total cargados: {items.length} · Mostrando: {filtered.length}</span>
            <span>DRF count: {data?.count ?? "—"}</span>
          </div>

          {loading && <Loader label="Cargando..." />}
        </div>

        {/* Virtualized list without dependencies */}
        <div
          ref={listRef}
          onScroll={onScroll}
          style={{
            marginTop: 12,
            height: LIST_HEIGHT,
            overflow: "auto",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "0 12px",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetTop}px)` }}>
              {visibleItems.map(Row)}
            </div>
          </div>
        </div>

        {/* Bottom: load more + edit panel */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <Button
            variant="outline"
            onClick={() => void loadMore()}
            disabled={!data?.next || loadingMore || loading}
          >
            {loadingMore ? "Cargando..." : data?.next ? "Cargar más" : "No hay más"}
          </Button>

          <div style={{ flex: 1 }}>
            {selected ? (
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Editar: {selected.nombre}</div>

                <div style={{ display: "grid", gap: 12 }}>
                  <Input
                    label="Nombre"
                    value={selected.nombre}
                    onChange={(evt) => setSelected((s) => (s ? { ...s, nombre: evt.target.value } : s))}
                  />

                  <Input
                    label="Descripción"
                    value={selected.descripcion}
                    onChange={(evt) => setSelected((s) => (s ? { ...s, descripcion: evt.target.value } : s))}
                  />

                  <Input
                    label="Capacidad"
                    type="number"
                    value={String(selected.capacidad ?? 0)}
                    onChange={(evt) =>
                      setSelected((s) => (s ? { ...s, capacidad: Number(evt.target.value) } : s))
                    }
                  />

                  {/* ✅ Estado como combo en edición */}
                  <Select
                    label="Estado"
                    options={estadoOptions}
                    value={selected.estado ?? "Disponible"}
                    onChange={(evt) => setSelected((s) => (s ? { ...s, estado: evt.target.value } : s))}
                  />

                  <Input
                    label="Ubicación"
                    value={selected.ubicacion}
                    onChange={(evt) => setSelected((s) => (s ? { ...s, ubicacion: evt.target.value } : s))}
                  />

                  <Input
                    label="Etiquetas (CSV)"
                    value={selected.tags}
                    onChange={(evt) => setSelected((s) => (s ? { ...s, tags: evt.target.value } : s))}
                  />

                  <div style={{ display: "flex", gap: 10 }}>
                    <Button onClick={() => void onSave()} disabled={loading} fullWidth>
                      {loading ? <Loader label="Guardando..." /> : "Guardar cambios"}
                    </Button>
                    <Button variant="outline" onClick={() => setSelected(null)} disabled={loading}>
                      Cerrar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ opacity: 0.8, fontSize: 13, padding: "8px 0" }}>
                Selecciona un espacio para editar.
              </div>
            )}
          </div>
        </div>

        {error && <div style={{ color: "#ff5252", fontSize: 12, marginTop: 10 }}>{error}</div>}
      </Card>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
