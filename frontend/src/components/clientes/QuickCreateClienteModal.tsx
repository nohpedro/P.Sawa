import { useState } from "react";
import FullScreenModal from "../reservas/FullScreenModal";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Loader from "../ui/Loader";
import Toast from "../ui/Toast";
import type { Cliente, ClienteWriteDTO } from "../../models/cliente";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

export default function QuickCreateClienteModal({
  open,
  onClose,
  onCreate,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  onCreate: (payload: ClienteWriteDTO) => Promise<Cliente>;
}) {
  const [form, setForm] = useState<ClienteWriteDTO>({
    nombre: "",
    apellido: "",
    telefono: "",
    documento: "",
    notas: "",
  });

  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const reset = () => {
    setForm({ nombre: "", apellido: "", telefono: "", documento: "", notas: "" });
  };

  const submit = async () => {
    const nombre = form.nombre.trim();
    const apellido = form.apellido.trim();

    if (!nombre || !apellido) {
      setToast({ open: true, message: "Faltan datos obligatorios: nombre y apellido.", type: "error" });
      return;
    }

    try {
      const created = await onCreate({
        nombre,
        apellido,
        telefono: "",
        documento: "",
        notas: "",
      });

      setToast({ open: true, message: "Cliente creado.", type: "success" });
      reset();
      onClose();

      // Importante: el padre (ReservaForm) será quien seleccione el cliente creado
      // (lo hace porque onCreate devuelve el Cliente y lo usa).
      void created;
    } catch {
      setToast({ open: true, message: "No se pudo crear el cliente.", type: "error" });
    }
  };

  return (
    <>
      <FullScreenModal open={open} title="Crear cliente" subtitle="Registro rápido sin salir de Reservas" onClose={onClose}>
        <Card title="Datos minimos del cliente">
          <div style={{ display: "grid", gap: 14 }}>
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
              error={!form.nombre.trim() ? "Obligatorio" : undefined}
            />
            <Input
              label="Apellido *"
              value={form.apellido}
              onChange={(e) => setForm((s) => ({ ...s, apellido: e.target.value }))}
              error={!form.apellido.trim() ? "Obligatorio" : undefined}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <Button onClick={() => void submit()} disabled={loading || !form.nombre.trim() || !form.apellido.trim()} fullWidth>
                {loading ? <Loader label="Guardando..." /> : "Crear cliente"}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      </FullScreenModal>

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </>
  );
}
