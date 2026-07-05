import { type FormEvent, useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiLock, FiMail, FiSave, FiShield, FiUser } from "react-icons/fi";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Toast from "../../components/ui/Toast";
import { useAuth } from "../../hooks/useAuth";
import type { AuthUser } from "../../models/auth";
import { moduleLabel } from "../../models/modules";
import authService from "../../services/auth.service";
import meService, { type MeProfile } from "../../services/me.service";
import { getErrorMessage } from "../../utils/error";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

function initials(value?: string) {
  const source = (value ?? "U").trim();
  return source.slice(0, 2).toUpperCase();
}

export default function MePage() {
  const { user, refreshFromStorage } = useAuth();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [form, setForm] = useState({
    username: user?.username ?? "",
    email: user?.email ?? "",
    nombre: "",
    apellido: "",
    telefono: "",
    documento: "",
    notas: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const currentUser = profile ?? user;
  const modules = currentUser?.modules ?? [];
  const moduleCount = modules.length;
  const hasChanges = useMemo(() => {
    const baseline = profile ?? user;
    return (
      form.username.trim() !== (baseline?.username ?? "") ||
      form.email.trim() !== (baseline?.email ?? "") ||
      form.nombre.trim() !== (profile?.nombre ?? "") ||
      form.apellido.trim() !== (profile?.apellido ?? "") ||
      form.telefono.trim() !== (profile?.telefono ?? "") ||
      form.documento.trim() !== (profile?.documento ?? "") ||
      form.notas.trim() !== (profile?.notas ?? "") ||
      !!form.password
    );
  }, [form, profile, user]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await meService.get();
        if (!active) return;

        setProfile(data);
        setForm({
          username: data.username ?? "",
          email: data.email ?? "",
          nombre: data.nombre ?? "",
          apellido: data.apellido ?? "",
          telefono: data.telefono ?? "",
          documento: data.documento ?? "",
          notas: data.notas ?? "",
          password: "",
        });
      } catch (error) {
        if (!active) return;

        setForm((state) => ({
          ...state,
          username: user.username ?? "",
          email: user.email ?? "",
        }));
        setToast({ open: true, message: getErrorMessage(error, "No se pudo cargar el perfil."), type: "error" });
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id || saving || !hasChanges) return;

    const username = form.username.trim();
    const email = form.email.trim();

    if (!username) {
      setToast({ open: true, message: "El usuario es obligatorio.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const updated = await meService.patch({
        username,
        email,
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        telefono: form.telefono.trim(),
        documento: form.documento.trim(),
        notas: form.notas.trim(),
        ...(form.password ? { password: form.password } : {}),
      });

      const nextUser: AuthUser = {
        ...user,
        username: updated.username,
        email: updated.email,
        is_staff: updated.is_staff,
        is_superuser: updated.is_superuser,
        role: updated.role,
        modules: updated.modules ?? user.modules ?? [],
      };

      authService.setUser(nextUser);
      setProfile(updated);
      refreshFromStorage();
      setForm((current) => ({ ...current, password: "" }));
      setToast({ open: true, message: "Perfil actualizado correctamente.", type: "success" });
    } catch (error) {
      setToast({ open: true, message: getErrorMessage(error, "No se pudo guardar el perfil."), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="me-page">
        <section className="me-hero">
          <div className="me-hero__avatar" aria-hidden="true">
            {initials(currentUser?.username)}
          </div>
          <div className="me-hero__copy">
            <div className="me-hero__eyebrow">Mi cuenta</div>
            <h1>{currentUser?.username ?? "Usuario"}</h1>
            <p>{currentUser?.role ? `Rol ${currentUser.role}` : "Configura los datos basicos de acceso."}</p>
          </div>
          <div className="me-hero__badges">
            <span>
              <FiShield size={14} />
              {currentUser?.is_superuser ? "Superusuario" : currentUser?.is_staff ? "Staff" : "Usuario"}
            </span>
            <span>
              <FiCheckCircle size={14} />
              {moduleCount} modulos
            </span>
          </div>
        </section>

        <div className="me-grid">
          <Card title="Datos basicos" subtitle="Actualiza tus datos principales y de contacto.">
            <form className="me-form" onSubmit={(event) => void onSubmit(event)}>
              {loading && <div className="me-loading">Cargando perfil...</div>}

              <label className="me-field">
                <span>
                  <FiUser size={15} />
                  Usuario
                </span>
                <Input value={form.username} onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))} />
              </label>

              <label className="me-field">
                <span>
                  <FiMail size={15} />
                  Correo
                </span>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
                  placeholder="correo@ejemplo.com"
                />
              </label>

              <label className="me-field">
                <span>
                  <FiLock size={15} />
                  Nueva contrasena
                </span>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
                  placeholder="Dejar vacio para mantener la actual"
                  autoComplete="new-password"
                />
              </label>

              <div className="me-two-columns">
                <label className="me-field">
                  <span>Nombre</span>
                  <Input value={form.nombre} onChange={(event) => setForm((state) => ({ ...state, nombre: event.target.value }))} />
                </label>

                <label className="me-field">
                  <span>Apellido</span>
                  <Input value={form.apellido} onChange={(event) => setForm((state) => ({ ...state, apellido: event.target.value }))} />
                </label>
              </div>

              <div className="me-two-columns">
                <label className="me-field">
                  <span>Telefono</span>
                  <Input value={form.telefono} onChange={(event) => setForm((state) => ({ ...state, telefono: event.target.value }))} />
                </label>

                <label className="me-field">
                  <span>Documento</span>
                  <Input value={form.documento} onChange={(event) => setForm((state) => ({ ...state, documento: event.target.value }))} />
                </label>
              </div>

              <label className="me-field">
                <span>Notas</span>
                <Input value={form.notas} onChange={(event) => setForm((state) => ({ ...state, notas: event.target.value }))} />
              </label>

              <div className="me-actions">
                <Button type="submit" disabled={loading || saving || !hasChanges}>
                  <FiSave size={16} />
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Accesos" subtitle="Resumen de permisos activos para tu sesion.">
            <div className="me-access-list">
              {modules.map((module) => (
                <span key={module}>{moduleLabel(module)}</span>
              ))}
              {moduleCount === 0 && <div className="me-empty">Sin modulos asignados.</div>}
            </div>
          </Card>
        </div>
      </div>

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((state) => ({ ...state, open: false }))} />

      <style>{`
        .me-page {
          display: grid;
          gap: 16px;
        }

        .me-hero {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          padding: 18px;
          border: 1px solid rgba(255, 210, 74, 0.2);
          border-radius: 10px;
          background:
            linear-gradient(135deg, rgba(255, 210, 74, 0.14), transparent 34%),
            linear-gradient(90deg, #111827, #0f1420);
          overflow: hidden;
        }

        .me-hero__avatar {
          width: 64px;
          height: 64px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #ffd24a;
          color: #10131a;
          font-size: 22px;
          font-weight: 950;
          box-shadow: 0 0 0 4px rgba(255, 210, 74, 0.12), 0 16px 28px rgba(0, 0, 0, 0.28);
        }

        .me-hero__copy {
          min-width: 0;
        }

        .me-hero__eyebrow {
          color: #ffd24a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .me-hero h1 {
          margin: 4px 0 2px;
          font-size: 26px;
          line-height: 1.1;
        }

        .me-hero p {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .me-hero__badges,
        .me-access-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .me-hero__badges span,
        .me-access-list span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 30px;
          padding: 6px 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          color: #eaeaea;
          font-size: 12px;
          font-weight: 800;
        }

        .me-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(260px, 0.7fr);
          gap: 16px;
          align-items: start;
        }

        .me-form {
          display: grid;
          gap: 14px;
        }

        .me-two-columns {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .me-field {
          display: grid;
          gap: 7px;
        }

        .me-field > span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 850;
        }

        .me-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 4px;
        }

        .me-empty {
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .me-loading {
          padding: 10px 12px;
          border: 1px solid rgba(255, 210, 74, 0.18);
          border-radius: 8px;
          background: rgba(255, 210, 74, 0.06);
          color: var(--color-text-muted);
          font-size: 13px;
          font-weight: 800;
        }

        @media (max-width: 820px) {
          .me-hero,
          .me-grid {
            grid-template-columns: 1fr;
          }

          .me-two-columns {
            grid-template-columns: 1fr;
          }

          .me-hero__badges,
          .me-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </>
  );
}
