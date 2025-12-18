import { useState, type ChangeEvent } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { ClienteWriteDTO, Cliente } from "../../models/cliente";

export default function CustomersCreatePanel({
  loading,
  onCreate,
}: {
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

  const [toast, setToast] = useState<{ open: boolean; message: string; type: "info" | "success" | "error" }>({
    open: false,
    message: "",
    type: "info",
  });

  const setField =
    (key: keyof ClienteWriteDTO) =>
    (evt: ChangeEvent<HTMLInputElement>) => {
      const value = evt.target.value;
      setForm((s) => ({ ...s, [key]: value }));
    };

  const reset = () => {
    setForm({ nombre: "", apellido: "", telefono: "", documento: "", notas: "" });
  };

  const handleCreate = async () => {
    if (!form.nombre.trim() && !form.apellido.trim()) {
      setToast({ open: true, message: "Ingresa al menos nombre o apellido.", type: "error" });
      return;
    }

    try {
      await onCreate({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim(),
        documento: form.documento.trim(),
        notas: form.notas.trim(),
      });
      setToast({ open: true, message: "Cliente creado.", type: "success" });
      reset();
    } catch {
      setToast({ open: true, message: "No se pudo crear el cliente.", type: "error" });
    }
  };

  return (
    <>
      <Card title="Crear cliente" subtitle="Registra datos básicos del cliente.">
        <div style={{ display: "grid", gap: 14 }}>
          <Input label="Nombre" value={form.nombre} onChange={setField("nombre")} placeholder="Ej: Juan" />
          <Input label="Apellido" value={form.apellido} onChange={setField("apellido")} placeholder="Ej: Pérez" />
          <Input label="Teléfono" value={form.telefono} onChange={setField("telefono")} placeholder="Ej: 76543210" />
          <Input label="Documento" value={form.documento} onChange={setField("documento")} placeholder="CI / NIT / etc." />
          <Input label="Notas" value={form.notas} onChange={setField("notas")} placeholder="Opcional" />

          <Button onClick={() => void handleCreate()} disabled={loading} fullWidth>
            {loading ? <Loader label="Guardando..." /> : "Crear cliente"}
          </Button>
        </div>
      </Card>

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </>
  );
}
