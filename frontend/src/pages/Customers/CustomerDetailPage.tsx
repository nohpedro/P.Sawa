import { useEffect, useState, type ChangeEvent } from "react";
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
      .then((c) => {
        setMeta({ username: c.username, email: c.email });
        setDraft({
          nombre: c.nombre ?? "",
          apellido: c.apellido ?? "",
          telefono: c.telefono ?? "",
          documento: c.documento ?? "",
          notas: c.notas ?? "",
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setField =
    (key: keyof ClienteWriteDTO) =>
    (evt: ChangeEvent<HTMLInputElement>) => {
      const value = evt.target.value;
      setDraft((s) => ({ ...s, [key]: value }));
    };

  const onSave = async () => {
    if (!id) return;
    try {
      await clientes.patch(id, draft);
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
    <div style={{ display: "grid", gap: 20 }}>
      <Card title="Ficha del cliente" subtitle="Edición a pantalla completa.">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="outline" onClick={() => navigate(PATHS.customers)}>
            ← Volver a clientes
          </Button>

          {meta && (
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              <b>Username:</b> {meta.username} · <b>Email:</b> {meta.email}
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Button onClick={() => void onSave()} disabled={clientes.loading}>
              {clientes.loading ? <Loader label="Guardando..." /> : "Guardar cambios"}
            </Button>
            <Button variant="danger" onClick={() => void onDelete()} disabled={clientes.loading}>
              {clientes.loading ? <Loader label="Eliminando..." /> : "Eliminar"}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Datos" subtitle="Actualiza la información del cliente.">
        {clientes.loading && <Loader label="Cargando..." />}

        {clientes.error && (
          <div style={{ color: "#ff5252", fontSize: 13 }}>
            {clientes.error}
          </div>
        )}

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <Input label="Nombre" value={draft.nombre} onChange={setField("nombre")} />
          <Input label="Apellido" value={draft.apellido} onChange={setField("apellido")} />
          <Input label="Teléfono" value={draft.telefono} onChange={setField("telefono")} />
          <Input label="Documento" value={draft.documento} onChange={setField("documento")} />
          <div style={{ gridColumn: "1 / -1" }}>
            <Input label="Notas" value={draft.notas} onChange={setField("notas")} />
          </div>
        </div>
      </Card>

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
