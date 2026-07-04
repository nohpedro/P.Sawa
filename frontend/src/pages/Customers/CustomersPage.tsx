import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import { useClientes } from "../../hooks/useClientes";
import type { Cliente, ClienteWriteDTO } from "../../models/cliente";
import { getErrorMessage } from "../../utils/error";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };
type ModalMode = "create" | "edit" | null;

const PAGE_SIZE = 5;

const emptyForm: ClienteWriteDTO = {
  nombre: "",
  apellido: "",
  telefono: "",
  documento: "",
  notas: "",
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

function displayName(cliente: Cliente): string {
  const fullName = `${cliente.nombre ?? ""} ${cliente.apellido ?? ""}`.trim();
  return fullName || cliente.username || "Cliente";
}

function emptyValue(value?: string): string {
  return value?.trim() || "-";
}

function clienteToDraft(cliente: Cliente): ClienteWriteDTO {
  return {
    nombre: cliente.nombre ?? "",
    apellido: cliente.apellido ?? "",
    telefono: cliente.telefono ?? "",
    documento: cliente.documento ?? "",
    notas: cliente.notas ?? "",
  };
}

function cleanDraft(draft: ClienteWriteDTO): ClienteWriteDTO {
  return {
    nombre: draft.nombre.trim(),
    apellido: draft.apellido.trim(),
    telefono: draft.telefono.trim(),
    documento: draft.documento.trim(),
    notas: draft.notas.trim(),
  };
}

export default function CustomersPage() {
  const clientes = useClientes();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [draft, setDraft] = useState<ClienteWriteDTO>(emptyForm);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  useEffect(() => {
    clientes.list({ page: String(page), page_size: String(PAGE_SIZE) }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
  const total = clientes.data?.count ?? 0;
  const pageStart = total === 0 || filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = total === 0 || filtered.length === 0 ? 0 : Math.min((page - 1) * PAGE_SIZE + filtered.length, total);

  const refresh = async (targetPage = page) => {
    const res = await clientes.list({ page: String(targetPage), page_size: String(PAGE_SIZE) });
    if (selected?.id) {
      setSelected(res.results?.find((cliente: Cliente) => cliente.id === selected.id) ?? null);
    }
    return res;
  };

  const openCreate = () => {
    setSelected(null);
    setDraft(emptyForm);
    setModalMode("create");
  };

  const openEdit = (cliente: Cliente) => {
    setSelected(cliente);
    setDraft(clienteToDraft(cliente));
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setDraft(emptyForm);
  };

  const onCreate = async () => {
    const payload = cleanDraft(draft);
    if (!payload.nombre && !payload.apellido) {
      setToast({ open: true, message: "Ingresa al menos nombre o apellido.", type: "error" });
      return;
    }

    try {
      const created = await clientes.create(payload);
      setSelected(created);
      setDraft(emptyForm);
      setModalMode(null);
      setToast({ open: true, message: "Cliente creado correctamente.", type: "success" });
      setPage(1);
      await clientes.list({ page: "1", page_size: String(PAGE_SIZE) });
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo crear el cliente."), type: "error" });
    }
  };

  const onSave = async () => {
    if (!selected) return;
    const payload = cleanDraft(draft);
    if (!payload.nombre && !payload.apellido) {
      setToast({ open: true, message: "Ingresa al menos nombre o apellido.", type: "error" });
      return;
    }

    try {
      const updated = await clientes.patch(selected.id, payload);
      setSelected(updated);
      setModalMode(null);
      setToast({ open: true, message: "Cliente actualizado correctamente.", type: "success" });
      await refresh();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo actualizar el cliente."), type: "error" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setModalMode(null);
    setSelected(null);

    try {
      await clientes.remove(target.id);
      setToast({ open: true, message: "Cliente eliminado correctamente.", type: "success" });
      if (list.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        await refresh();
      }
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo eliminar el cliente."), type: "error" });
    }
  };

  const onQueryChange = (evt: ChangeEvent<HTMLInputElement>) => {
    setQuery(evt.target.value);
    setPage(1);
  };

  const setDraftField =
    (key: keyof ClienteWriteDTO) =>
    (evt: ChangeEvent<HTMLInputElement>) => {
      setDraft((current) => ({ ...current, [key]: evt.target.value }));
    };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Clientes"
        subtitle="Administra clientes para reservas desde un listado simple."
        rightSlot={
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={openCreate}>+ Nuevo cliente</Button>
            <Button variant="outline" onClick={() => void refresh()} disabled={clientes.loading}>
              Refrescar
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={badgeStyle}>Total: {total}</span>
          <span style={badgeStyle}>Pagina: {page}</span>
          <span style={badgeStyle}>Mostrando: {pageStart}-{pageEnd}</span>
          <span style={badgeStyle}>Con telefono: {withPhone}</span>
          <span style={badgeStyle}>Con documento: {withDocument}</span>
        </div>
      </Card>

      <Card title="Listado" subtitle="Click o doble click sobre un cliente para editarlo.">
        <div style={{ display: "grid", gap: 14 }}>
          <Input
            label="Buscar"
            placeholder="Nombre, telefono, documento o email..."
            value={query}
            onChange={onQueryChange}
          />

          {clientes.loading && <Loader label="Cargando clientes..." />}

          <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 610, overflow: "auto" }}>
            {filtered.map((cliente) => {
              const active = selected?.id === cliente.id;

              return (
                <button
                  key={cliente.id}
                  type="button"
                  onClick={() => openEdit(cliente)}
                  onDoubleClick={() => openEdit(cliente)}
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

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(cliente);
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                </button>
              );
            })}

            {!clientes.loading && filtered.length === 0 && (
              <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron clientes.</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
              {total === 0 ? "Sin clientes" : `Clientes ${pageStart}-${pageEnd} de ${total}`}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || clientes.loading}>
                Anterior
              </Button>
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!clientes.data?.next || clientes.loading}>
                Siguiente
              </Button>
            </div>
          </div>

          {clientes.error && <div style={{ color: "#ff5252", fontSize: 13 }}>{clientes.error}</div>}
        </div>
      </Card>

      {modalMode &&
        createPortal(
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
              aria-labelledby="customer-edit-title"
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
                  <h2 id="customer-edit-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                    {modalMode === "create" ? "Nuevo cliente" : "Editar cliente"}
                  </h2>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
                    {modalMode === "create" ? "Registra datos principales para reservas." : `Actualiza ${selected ? displayName(selected) : "el cliente"}.`}
                  </div>
                </div>
                <Button variant="ghost" onClick={closeModal} disabled={clientes.loading}>
                  Cerrar
                </Button>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {modalMode === "edit" && selected ? (
                  <div style={panelStyle}>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Editando</div>
                    <div style={{ fontSize: 18, fontWeight: 950 }}>{displayName(selected)}</div>
                    <div style={{ marginTop: 4, color: "var(--color-text-muted)", fontSize: 12 }}>
                      Email: {emptyValue(selected.email)}
                    </div>
                  </div>
                ) : null}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Input label="Nombre" value={draft.nombre} onChange={setDraftField("nombre")} placeholder="Ej: Juan" />
                  <Input label="Apellido" value={draft.apellido} onChange={setDraftField("apellido")} placeholder="Ej: Perez" />
                </div>

                <Input label="Telefono" value={draft.telefono} onChange={setDraftField("telefono")} placeholder="Ej: 76543210" />
                <Input label="Documento" value={draft.documento} onChange={setDraftField("documento")} placeholder="CI / NIT" />
                <Input label="Notas" value={draft.notas} onChange={setDraftField("notas")} placeholder="Opcional" />

                <div style={{ display: "flex", gap: 10 }}>
                  <Button
                    onClick={() => void (modalMode === "create" ? onCreate() : onSave())}
                    disabled={clientes.loading || (!draft.nombre.trim() && !draft.apellido.trim())}
                    fullWidth
                  >
                    {clientes.loading ? <Loader label="Guardando..." /> : modalMode === "create" ? "Crear cliente" : "Guardar"}
                  </Button>
                  <Button variant="outline" onClick={closeModal} disabled={clientes.loading}>
                    Cerrar
                  </Button>
                </div>

                {modalMode === "edit" && selected ? (
                  <Button variant="danger" onClick={() => setDeleteTarget(selected)} disabled={clientes.loading}>
                    Eliminar cliente
                  </Button>
                ) : null}
              </div>
            </section>
          </div>,
          document.body
        )}

      {deleteTarget &&
        createPortal(
          <div
            role="presentation"
            onClick={() => setDeleteTarget(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1300,
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
              aria-labelledby="customer-delete-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(460px, 100%)",
                border: "1px solid rgba(255,82,82,0.38)",
                borderRadius: 10,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                padding: 18,
              }}
            >
              <h2 id="customer-delete-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                Eliminar cliente
              </h2>
              <div style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
                Se eliminara {displayName(deleteTarget)}. Esta accion no se puede deshacer.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <Button variant="danger" onClick={() => void confirmDelete()} disabled={clientes.loading} fullWidth>
                  {clientes.loading ? <Loader label="Eliminando..." /> : "Eliminar cliente"}
                </Button>
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={clientes.loading}>
                  Cancelar
                </Button>
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
