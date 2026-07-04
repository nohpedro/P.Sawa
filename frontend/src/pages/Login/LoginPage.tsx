import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Toast from "../../components/ui/Toast";
import { useAuth } from "../../hooks/useAuth";
import { PATHS } from "../../router/paths";
import AuthErrorModal from "./AuthErrorModal";
import { getLoginErrorMessage } from "./authErrors";
import { loginSchema, type LoginFormValues } from "./login.schema";
import SportLoginButton from "./SportLoginButton";
import "./LoginPage.css";

const MIN_LOGIN_ANIMATION_MS = 900;

type LoginResultPayload = {
  ok?: boolean;
  success?: boolean;
  status?: number;
  code?: string;
  detail?: string;
  message?: string;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isFailedLoginResult(result: unknown): boolean {
  if (result === false) return true;

  if (typeof result !== "object" || result === null) return false;

  const payload = result as LoginResultPayload;

  if (payload.ok === false) return true;
  if (payload.success === false) return true;
  if (typeof payload.status === "number" && payload.status >= 400) return true;
  if (payload.code === "USER_NOT_FOUND") return true;
  if (payload.code === "PASSWORD_INCORRECT") return true;

  return false;
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

  const [authModal, setAuthModal] = useState({
    open: false,
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    console.log("[LOGIN][authModal changed]", authModal);
  }, [authModal]);

  useEffect(() => {
    console.log("[LOGIN][isAuthenticated changed]", isAuthenticated);

    if (isAuthenticated) {
      navigate(PATHS.availability, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const openAuthModal = (message: string) => {
    console.log("[LOGIN][openAuthModal]", message);

    setAuthModal({
      open: true,
      message,
    });
  };

  const closeAuthModal = () => {
    console.log("[LOGIN][closeAuthModal]");

    setAuthModal((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const onChange =
    (key: keyof LoginFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [key]: event.target.value,
      }));

      setErrors((prev) => ({
        ...prev,
        [key]: undefined,
      }));
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

    console.group("[LOGIN][onSubmit]");
    console.log("Formulario enviado:", {
      username: form.username,
      passwordLength: form.password.length,
    });

    setAuthModal({
      open: false,
      message: "",
    });

    if (!validate()) {
      console.warn("[LOGIN][onSubmit] Validación fallida");

      setToast({
        open: true,
        message: "Revisa los campos marcados.",
        type: "error",
      });

      console.groupEnd();
      return;
    }

    setIsSubmitting(true);

    try {
      await wait(MIN_LOGIN_ANIMATION_MS);

      const loginResult = await login({
        username: form.username,
        password: form.password,
      });

      console.log("[LOGIN][onSubmit] loginResult:", loginResult);

      if (isFailedLoginResult(loginResult)) {
        console.warn("[LOGIN][onSubmit] login devolvió fallo:", loginResult);
        throw loginResult;
      }

      console.log("[LOGIN][onSubmit] Login exitoso. Navegando a:", redirectTo);

      setToast({
        open: true,
        message: "Sesión iniciada.",
        type: "success",
      });

      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error("[LOGIN][onSubmit] Error capturado:", error);

      const message = getLoginErrorMessage(error);

      console.log("[LOGIN][onSubmit] Mensaje para modal:", message);

      openAuthModal(message);

      setToast({
        open: true,
        message,
        type: "error",
      });

      window.setTimeout(() => {
        const modal = document.querySelector("[data-auth-error-modal='true']");
        console.log("[LOGIN][onSubmit] Modal existe en DOM:", Boolean(modal), modal);
      }, 0);
    } finally {
      setIsSubmitting(false);
      console.groupEnd();
    }
  };

  return (
    <>
      <div
        className={`login-shell${isSubmitting ? " login-shell--match" : ""}`}
        style={{ width: 420, maxWidth: "100%" }}
      >
        <Card title="INICIO DE SESIÓN" subtitle="Accede a Sawa" style={{ width: "100%" }}>
          <form
            onSubmit={onSubmit}
            className={isSubmitting ? "login-form--match" : undefined}
            style={{ display: "grid", gap: 14 }}
          >
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

            <SportLoginButton isSubmitting={isSubmitting} disabled={loading} />

            {import.meta.env.DEV ? (
              <button
                type="button"
                className="login-debug-modal-button"
                onClick={() => openAuthModal("Prueba visual del modal.")}
              >
                Probar modal
              </button>
            ) : null}
          </form>
        </Card>
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      <AuthErrorModal
        open={authModal.open}
        message={authModal.message}
        onClose={closeAuthModal}
      />
    </>
  );
}