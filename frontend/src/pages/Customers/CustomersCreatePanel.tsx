import { useState, type ChangeEvent, type CSSProperties } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { ClienteWriteDTO, Cliente } from "../../models/cliente";

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
  padding: 12,
};

export default function CustomersCreatePanel({
  loading,
  onCreate,
}: {
  loading: boolean;
  onCreate: (payload: ClienteWriteDTO) => Promise<Cliente>;
}) {
  const [form, setForm] = useState<ClienteWriteDTO>(emptyForm);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: "info" | "success" | "error" }>({
    open: false,
    message: "",
    type: "info",
  });

  const setField =
    (key: keyof ClienteWriteDTO) =>
    (evt: ChangeEvent<HTMLInputElement>) => {
      setForm((s) => ({ ...s, [key]: evt.target.value }));
    };

  const reset = () => {
    setForm(emptyForm);
  };

  const handleCreate = async () => {
    const payload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: form.telefono.trim(),
      documento: form.documento.trim(),
      notas: form.notas.trim(),
    };

    if (!payload.nombre && !payload.apellido) {
      setToast({ open: true, message: "Ingresa al menos nombre o apellido.", type: "error" });
      return;
    }

    try {
      await onCreate(payload);
      setToast({ open: true, message: "Cliente creado.", type: "success" });
      reset();
    } catch {
      setToast({ open: true, message: "No se pudo crear el cliente.", type: "error" });
    }
  };

  return (
    <>
      <Card title="Nuevo cliente" subtitle="Registra los datos principales para reservas.">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Nombre" value={form.nombre} onChange={setField("nombre")} placeholder="Ej: Juan" />
              <Input label="Apellido" value={form.apellido} onChange={setField("apellido")} placeholder="Ej: Perez" />
            </div>

            <Input label="Telefono" value={form.telefono} onChange={setField("telefono")} placeholder="Ej: 76543210" />
            <Input label="Documento" value={form.documento} onChange={setField("documento")} placeholder="CI / NIT" />
            <Input label="Notas" value={form.notas} onChange={setField("notas")} placeholder="Opcional" />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={() => void handleCreate()} disabled={loading || (!form.nombre.trim() && !form.apellido.trim())} fullWidth>
              {loading ? <Loader label="Guardando..." /> : "Crear cliente"}
            </Button>
            <Button variant="outline" onClick={reset} disabled={loading}>
              Limpiar
            </Button>
          </div>
        </div>
      </Card>

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </>
  );
}
