import { useMemo, useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";
import Loader from "../../components/ui/Loader";

import { useAuth } from "../../hooks/useAuth";
import { PATHS } from "../../router/paths";
import { loginSchema, type LoginFormValues } from "./login.schema";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, isAuthenticated } = useAuth();

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from ?? PATHS.login; // por ahora solo existe login
  }, [location.state]);

  const [form, setForm] = useState<LoginFormValues>({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});
  const [toast, setToast] = useState<{ open: boolean; message: string; type: "info" | "success" | "error" }>({
    open: false,
    message: "",
    type: "info",
  });

  // Evita navegar dentro del render
  useEffect(() => {
    if (isAuthenticated) {
      navigate(PATHS.login, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onChange =
    (key: keyof LoginFormValues) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = (): boolean => {
    const result = loginSchema.safeParse(form);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Partial<Record<keyof LoginFormValues, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof LoginFormValues | undefined;
      if (field) fieldErrors[field] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      setToast({ open: true, message: "Revisa los campos marcados.", type: "error" });
      return;
    }

    try {
      await login({ username: form.username, password: form.password });
      setToast({ open: true, message: "Sesión iniciada.", type: "success" });
      navigate(redirectTo, { replace: true });
    } catch {
      setToast({ open: true, message: "Credenciales inválidas o error del servidor.", type: "error" });
    }
  };

  return (
    <>
      <Card
        title="INICIO DE SESIÓN"
        subtitle="Accede a Sawa"
        style={{ width: 420 }}
      >
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
          <Input
            label="Usuario"
            placeholder="Usuario"
            value={form.username}
            onChange={onChange("username")}
            error={errors.username}
            autoComplete="username"
          />

          <Input
            label="Contraseña"
            placeholder="*********"
            type="password"
            value={form.password}
            onChange={onChange("password")}
            error={errors.password}
            autoComplete="current-password"
          />

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? <Loader label="Ingresando..." /> : "Ingresar"}
          </Button>
        </form>
      </Card>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </>
  );
}
