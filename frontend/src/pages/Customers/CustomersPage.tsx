import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

import CustomersCreatePanel from "./CustomersCreatePanel";
import { useClientes } from "../../hooks/useClientes";
import { PATHS } from "../../router/paths";

export default function CustomersPage() {
  const clientes = useClientes();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    clientes.list({ page: String(page) }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const refresh = async () => {
    await clientes.list({ page: String(page) });
  };

  const list = clientes.data?.results ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      `${c.username} ${c.email} ${c.nombre} ${c.apellido} ${c.telefono} ${c.documento} ${c.notas}`
        .toLowerCase()
        .includes(q)
    );
  }, [list, query]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="Clientes" subtitle="Doble click en un cliente para abrir su ficha completa.">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Total: <b>{clientes.data?.count ?? 0}</b> · Página: <b>{page}</b>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Button variant="outline" onClick={() => void refresh()} disabled={clientes.loading}>
              Refrescar
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "560px 1fr", alignItems: "start" }}>
        <CustomersCreatePanel
          loading={clientes.loading}
          onCreate={async (payload) => {
            const res = await clientes.create(payload);
            await refresh();
            return res;
          }}
        />

        <Card title="Listado" subtitle="Busca y abre una ficha. Ideal para muchos datos.">
          <div style={{ display: "grid", gap: 14 }}>
            <Input
              label="Buscar"
              placeholder="admin, juan, 765..., CI..."
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            />

            {clientes.loading && <Loader label="Cargando..." />}
            {clientes.error && <div style={{ color: "#ff5252", fontSize: 13 }}>{clientes.error}</div>}

            <div
              style={{
                maxHeight: 720,
                overflow: "auto",
                border: "1px solid var(--color-border)",
                borderRadius: 14,
                padding: 14,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    onDoubleClick={() => navigate(PATHS.customers + "/" + c.id)}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: 14,
                      padding: 16,
                      minHeight: 96,
                      cursor: "default",
                      background: "transparent",
                    }}
                    title="Doble click para abrir"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontWeight: 950, fontSize: 15 }}>
                        {(c.nombre || c.apellido) ? `${c.nombre} ${c.apellido}`.trim() : c.username}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{c.email}</div>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 13, opacity: 0.86, lineHeight: 1.35 }}>
                      <b>Tel:</b> {c.telefono || "—"} · <b>Doc:</b> {c.documento || "—"}
                    </div>
                  </div>
                ))}

                {!clientes.loading && filtered.length === 0 && (
                  <div style={{ opacity: 0.85, fontSize: 13 }}>No se encontraron clientes.</div>
                )}
              </div>
            </div>

            {/* paginación simple */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || clientes.loading}>
                ← Anterior
              </Button>
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!clientes.data?.next || clientes.loading}>
                Siguiente →
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
