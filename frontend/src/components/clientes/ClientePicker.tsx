import { useMemo, useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { Cliente } from "../../models/cliente";

export default function ClientePicker({
  clientes,
  selectedId,
  onSelect,
  onOpenCreate,
  loading,
}: {
  clientes: Cliente[];
  selectedId: string;
  onSelect: (id: string) => void;
  onOpenCreate: () => void;
  loading: boolean;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return clientes.slice(0, 40);

    const res = clientes.filter((c) => {
      const hay = `${c.nombre} ${c.apellido} ${c.username} ${c.email} ${c.telefono} ${c.documento}`.toLowerCase();
      return hay.includes(query);
    });

    return res.slice(0, 60);
  }, [clientes, q]);

  const selected = useMemo(
    () => clientes.find((c) => c.id === selectedId) ?? null,
    [clientes, selectedId]
  );

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
        <div style={{ flex: 1 }}>
          <Input
            label="Cliente (buscar)"
            placeholder="Nombre, apellido, teléfono, documento..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Button variant="outline" onClick={onOpenCreate} disabled={loading}>
          + Crear
        </Button>
      </div>

      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          padding: 12,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Seleccionado</div>
        <div style={{ fontWeight: 950 }}>
          {selected ? `${selected.nombre} ${selected.apellido}`.trim() || selected.username : "—"}
        </div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {selected ? `${selected.telefono || "—"} · ${selected.documento || "—"}` : "Busca y selecciona un cliente"}
        </div>
      </div>

      <div
        style={{
          maxHeight: 220,
          overflow: "auto",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          padding: 10,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        {filtered.map((c) => {
          const active = c.id === selectedId;
          const label = `${c.nombre} ${c.apellido}`.trim() || c.username;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              style={{
                width: "100%",
                textAlign: "left",
                border: `1px solid ${active ? "var(--color-accent)" : "transparent"}`,
                background: active ? "rgba(255,210,74,0.10)" : "transparent",
                color: "var(--color-text)",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: "pointer",
                marginBottom: 6,
              }}
              title={c.email}
            >
              <div style={{ fontWeight: 900 }}>{label}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {c.telefono || "—"} · {c.documento || "—"}
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && <div style={{ opacity: 0.8, padding: 10 }}>No hay coincidencias.</div>}
      </div>
    </div>
  );
}
