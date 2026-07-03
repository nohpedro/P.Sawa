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

type AuthErrorPayload = {
  code?: string;
  detail?: string;
  message?: string;
};

function getMessageFromPayload(payload?: AuthErrorPayload): string | null {
  if (!payload) return null;

  if (payload.code === "USER_NOT_FOUND") return "Usuario no encontrado.";
  if (payload.code === "PASSWORD_INCORRECT") return "Contraseña incorrecta.";

  return payload.detail || payload.message || null;
}

function getLoginErrorMessage(error: unknown): string {
  const fallback = "Usuario o contraseña incorrectos.";

  const directPayloadMessage = getMessageFromPayload(error as AuthErrorPayload);
  if (directPayloadMessage) return directPayloadMessage;

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as { response?: { data?: AuthErrorPayload } }).response;
    const responseMessage = getMessageFromPayload(response?.data);
    if (responseMessage) return responseMessage;
  }

  if (typeof error === "string") {
    try {
      const payload = JSON.parse(error) as AuthErrorPayload;
      return getMessageFromPayload(payload) || fallback;
    } catch {
      return error || fallback;
    }
  }

  if (error instanceof Error) {
    const jsonStart = error.message.indexOf("{");

    if (jsonStart !== -1) {
      try {
        const payload = JSON.parse(error.message.slice(jsonStart)) as AuthErrorPayload;
        return getMessageFromPayload(payload) || fallback;
      } catch {
        return fallback;
      }
    }

    return error.message || fallback;
  }

  return fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, isAuthenticated } = useAuth();

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from ?? PATHS.availability;
  }, [location.state]);

  const [form, setForm] = useState<LoginFormValues>({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({});
  const [authError, setAuthError] = useState("");

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: "info" | "success" | "error";
  }>({
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
      const message = "Revisa los campos marcados.";
      setAuthError(message);
      setToast({ open: true, message, type: "error" });
      return;
    }

    try {
      await login({
        username: form.username,
        password: form.password,
      });

      setToast({
        open: true,
        message: "Sesión iniciada.",
        type: "success",
      });

      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = getLoginErrorMessage(error);

      setAuthError(message);
      setToast({
        open: true,
        message,
        type: "error",
      });
    }
  };

  return (
    <>
      <Card title="INICIO DE SESIÓN" subtitle="Accede a Sawa" style={{ width: 420 }}>
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

          {authError ? (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                display: "block",
                border: "1px solid #dc2626",
                borderRadius: 8,
                background: "#fee2e2",
                color: "#991b1b",
                padding: "10px 12px",
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {authError}
            </div>
          ) : null}

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