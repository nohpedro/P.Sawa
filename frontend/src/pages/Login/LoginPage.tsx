import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
    return state?.from ?? PATHS.availability;
  }, [location.state]);

  const [form, setForm] = useState<LoginFormValues>({ username: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});
  const [authError, setAuthError] = useState("");
  const [toast, setToast] = useState<{ open: boolean; message: string; type: "info" | "success" | "error" }>({
    open: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(PATHS.availability, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onChange =
    (key: keyof LoginFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setAuthError("");
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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError("");

    if (!validate()) {
      setToast({ open: true, message: "Revisa los campos marcados.", type: "error" });
      return;
    }

    try {
      await login({ username: form.username, password: form.password });
      setToast({ open: true, message: "Sesion iniciada.", type: "success" });
      navigate(redirectTo, { replace: true });
    } catch {
      const message = "Usuario o contrasena incorrectos.";
      setAuthError(message);
      setToast({ open: true, message, type: "error" });
    }
  };

  return (
    <>
      <Card title="INICIO DE SESION" subtitle="Accede a Sawa" style={{ width: 420 }}>
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
            label="Contrasena"
            placeholder="*********"
            type="password"
            value={form.password}
            onChange={onChange("password")}
            error={errors.password}
            autoComplete="current-password"
          />

          {authError && (
            <div
              role="alert"
              style={{
                border: "1px solid #ff5252",
                borderRadius: 8,
                background: "rgba(255,82,82,0.10)",
                color: "#fecaca",
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {authError}
            </div>
          )}

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
