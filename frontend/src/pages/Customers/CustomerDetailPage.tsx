import { useEffect, useState, type ChangeEvent, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import { useClientes } from "../../hooks/useClientes";
import type { ClienteWriteDTO } from "../../models/cliente";
import { PATHS } from "../../router/paths";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

function fullName(draft: ClienteWriteDTO, fallback?: string): string {
  return `${draft.nombre ?? ""} ${draft.apellido ?? ""}`.trim() || fallback || "Cliente";
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clientes = useClientes();

  const [draft, setDraft] = useState<ClienteWriteDTO>({
    nombre: "",
    apellido: "",
    telefono: "",
    documento: "",
    notas: "",
  });
  const [meta, setMeta] = useState<{ username: string; email: string } | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  useEffect(() => {
    if (!id) return;

    clientes.get(id)
      .then((cliente) => {
        setMeta({ username: cliente.username, email: cliente.email });
        setDraft({
          nombre: cliente.nombre ?? "",
          apellido: cliente.apellido ?? "",
          telefono: cliente.telefono ?? "",
          documento: cliente.documento ?? "",
          notas: cliente.notas ?? "",
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setField =
    (key: keyof ClienteWriteDTO) =>
    (evt: ChangeEvent<HTMLInputElement>) => {
      setDraft((s) => ({ ...s, [key]: evt.target.value }));
    };

  const onSave = async () => {
    if (!id) return;
    try {
      await clientes.patch(id, {
        nombre: draft.nombre.trim(),
        apellido: draft.apellido.trim(),
        telefono: draft.telefono.trim(),
        documento: draft.documento.trim(),
        notas: draft.notas.trim(),
      });
      setToast({ open: true, message: "Cliente actualizado.", type: "success" });
    } catch {
      setToast({ open: true, message: "No se pudo actualizar.", type: "error" });
    }
  };

  const onDelete = async () => {
    if (!id) return;
    try {
      await clientes.remove(id);
      setToast({ open: true, message: "Cliente eliminado.", type: "success" });
      navigate(PATHS.customers);
    } catch {
      setToast({ open: true, message: "No se pudo eliminar.", type: "error" });
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Ficha del cliente"
        subtitle="Actualiza datos de contacto, documento y notas."
        rightSlot={
          <Button variant="outline" onClick={() => navigate(PATHS.customers)}>
            Volver
          </Button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr)", gap: 14 }}>
          <div style={panelStyle}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Cliente</div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{fullName(draft, meta?.username)}</div>
          </div>

          <div style={{ ...panelStyle, display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              <b style={{ color: "var(--color-text)" }}>Usuario:</b> {meta?.username || "-"}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", wordBreak: "break-word" }}>
              <b style={{ color: "var(--color-text)" }}>Email:</b> {meta?.email || "-"}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Datos editables" subtitle="Guarda los cambios cuando termines.">
        {clientes.loading && <Loader label="Cargando..." />}
        {clientes.error && <div style={{ color: "#ff5252", fontSize: 13 }}>{clientes.error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1fr)", gap: 16 }}>
          <div style={{ ...panelStyle, display: "grid", gap: 14 }}>
            <Input label="Nombre" value={draft.nombre} onChange={setField("nombre")} />
            <Input label="Apellido" value={draft.apellido} onChange={setField("apellido")} />
            <Input label="Telefono" value={draft.telefono} onChange={setField("telefono")} />
            <Input label="Documento" value={draft.documento} onChange={setField("documento")} />
          </div>

          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <Input label="Notas" value={draft.notas} onChange={setField("notas")} placeholder="Preferencias, observaciones o datos utiles" />

            <div style={panelStyle}>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 800 }}>Acciones</div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Button onClick={() => void onSave()} disabled={clientes.loading || (!draft.nombre.trim() && !draft.apellido.trim())} fullWidth>
                  {clientes.loading ? <Loader label="Guardando..." /> : "Guardar cambios"}
                </Button>
                <Button variant="danger" onClick={() => void onDelete()} disabled={clientes.loading}>
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
