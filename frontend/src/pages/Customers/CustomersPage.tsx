import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";

import CustomersCreatePanel from "./CustomersCreatePanel";
import { useClientes } from "../../hooks/useClientes";
import type { Cliente } from "../../models/cliente";
import { PATHS } from "../../router/paths";

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

function displayName(cliente: Cliente): string {
  const fullName = `${cliente.nombre ?? ""} ${cliente.apellido ?? ""}`.trim();
  return fullName || cliente.username || "Cliente";
}

function emptyValue(value?: string): string {
  return value?.trim() || "-";
}

export default function CustomersPage() {
  const clientes = useClientes();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Cliente | null>(null);

  useEffect(() => {
    clientes.list({ page: String(page) }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const refresh = async () => {
    const res = await clientes.list({ page: String(page) });
    if (selected?.id) {
      setSelected(res.results?.find((cliente: Cliente) => cliente.id === selected.id) ?? null);
    }
  };

  const list = useMemo(() => clientes.data?.results ?? [], [clientes.data?.results]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((cliente) =>
      `${cliente.username} ${cliente.email} ${cliente.nombre} ${cliente.apellido} ${cliente.telefono} ${cliente.documento} ${cliente.notas}`
        .toLowerCase()
        .includes(q)
    );
  }, [list, query]);

  const withPhone = useMemo(() => list.filter((cliente) => cliente.telefono?.trim()).length, [list]);
  const withDocument = useMemo(() => list.filter((cliente) => cliente.documento?.trim()).length, [list]);

  const openDetail = (cliente: Cliente) => {
    navigate(`${PATHS.customers}/${cliente.id}`);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Clientes"
        subtitle="Busca, registra y abre fichas de clientes para reservas."
        rightSlot={
          <Button variant="outline" onClick={() => void refresh()} disabled={clientes.loading}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={badgeStyle}>Total: {clientes.data?.count ?? 0}</span>
          <span style={badgeStyle}>Pagina: {page}</span>
          <span style={badgeStyle}>Mostrando: {filtered.length}</span>
          <span style={badgeStyle}>Con telefono: {withPhone}</span>
          <span style={badgeStyle}>Con documento: {withDocument}</span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(360px, 1fr) minmax(300px, 420px)", gap: 18, alignItems: "start" }}>
        <CustomersCreatePanel
          loading={clientes.loading}
          onCreate={async (payload) => {
            const res = await clientes.create(payload);
            await refresh();
            setSelected(res);
            return res;
          }}
        />

        <Card title="Listado" subtitle="Un click selecciona, el boton abre la ficha completa.">
          <div style={{ display: "grid", gap: 12 }}>
            <Input
              label="Buscar"
              placeholder="Nombre, telefono, documento o email..."
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            />

            {clientes.loading && <Loader label="Cargando clientes..." />}
            {clientes.error && <div style={{ color: "#ff5252", fontSize: 13 }}>{clientes.error}</div>}

            <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 660, overflow: "auto" }}>
              {filtered.map((cliente) => {
                const active = selected?.id === cliente.id;

                return (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => setSelected(cliente)}
                    onDoubleClick={() => openDetail(cliente)}
                    style={{
                      textAlign: "left",
                      border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      borderRadius: 8,
                      padding: 14,
                      cursor: "pointer",
                      background: active ? "rgba(255,210,74,0.07)" : "#0f1420",
                      color: "var(--color-text)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <strong>{displayName(cliente)}</strong>
                      <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{emptyValue(cliente.documento)}</span>
                    </div>

                    <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 13 }}>
                      Tel: {emptyValue(cliente.telefono)} / Email: {emptyValue(cliente.email)}
                    </div>

                    {cliente.notas && (
                      <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 12, lineHeight: 1.35 }}>
                        {cliente.notas}
                      </div>
                    )}
                  </button>
                );
              })}

              {!clientes.loading && filtered.length === 0 && (
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron clientes.</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || clientes.loading}>
                Anterior
              </Button>
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!clientes.data?.next || clientes.loading}>
                Siguiente
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Ficha rapida" subtitle={selected ? "Resumen del cliente seleccionado." : "Selecciona un cliente."}>
          {!selected ? (
            <div style={{ ...panelStyle, color: "var(--color-text-muted)", fontSize: 13 }}>
              No hay cliente seleccionado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={panelStyle}>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Cliente</div>
                <div style={{ fontSize: 20, fontWeight: 950 }}>{displayName(selected)}</div>
                <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 13 }}>
                  @{emptyValue(selected.username)}
                </div>
              </div>

              <div style={{ ...panelStyle, display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Telefono</div>
                  <div style={{ fontWeight: 900 }}>{emptyValue(selected.telefono)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Documento</div>
                  <div style={{ fontWeight: 900 }}>{emptyValue(selected.documento)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Email</div>
                  <div style={{ fontWeight: 900, wordBreak: "break-word" }}>{emptyValue(selected.email)}</div>
                </div>
              </div>

              <div style={{ ...panelStyle, color: selected.notas ? "var(--color-text)" : "var(--color-text-muted)", fontSize: 13, lineHeight: 1.4 }}>
                {selected.notas || "Sin notas registradas."}
              </div>

              <Button onClick={() => openDetail(selected)} fullWidth>
                Abrir ficha completa
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
