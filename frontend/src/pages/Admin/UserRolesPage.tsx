import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import { MODULES, moduleLabel, type ModuleKey } from "../../models/modules";
import type { ManagedUser, ManagedUserWriteDTO } from "../../models/user";
import usersService from "../../services/users.service";

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

const emptyForm: ManagedUserWriteDTO = {
  username: "",
  email: "",
  password: "",
  is_active: true,
  is_staff: true,
  role: "operador",
  modules: ["availability", "reservations"],
};

function toggleModule(list: ModuleKey[], module: ModuleKey): ModuleKey[] {
  return list.includes(module) ? list.filter((item) => item !== module) : [...list, module];
}

function normalizeUser(user: ManagedUser): ManagedUser {
  return {
    ...user,
    role: user.role || (user.is_superuser ? "superuser" : user.is_staff ? "admin" : "operador"),
    modules: Array.isArray(user.modules) ? user.modules : [],
  };
}

export default function UserRolesPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<ManagedUserWriteDTO>(emptyForm);
  const [query, setQuery] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: "info" | "success" | "error" }>({
    open: false,
    message: "",
    type: "info",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersService.list({ page: "1" });
      const normalized = (res.results ?? []).map(normalizeUser);
      setUsers(normalized);
      if (selected?.id) {
        setSelected(normalized.find((user) => user.id === selected.id) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => `${user.username} ${user.email} ${user.role}`.toLowerCase().includes(q));
  }, [query, users]);

  const onCreate = async () => {
    if (!form.username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const created = await usersService.create({
        ...form,
        username: form.username.trim(),
        email: form.email?.trim() ?? "",
        password: form.password?.trim() || "123456",
      });
      setForm(emptyForm);
      setSelected(normalizeUser(created));
      setGeneratedPassword(null);
      setToast({ open: true, message: "Usuario creado.", type: "success" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear usuario.");
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await usersService.resetPassword(selected.id, resetPassword.trim());
      setGeneratedPassword(res.password);
      setResetPassword("");
      setToast({ open: true, message: "Contrasena reseteada.", type: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resetear la contrasena.");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!selected?.username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await usersService.patch(selected.id, {
        username: selected.username.trim(),
        email: selected.email?.trim() ?? "",
        is_active: selected.is_active,
        is_staff: selected.is_staff,
        role: selected.role,
        modules: selected.modules,
      });
      setSelected(normalizeUser(updated));
      setToast({ open: true, message: "Permisos actualizados.", type: "success" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!selected || selected.is_superuser) return;
    setLoading(true);
    try {
      await usersService.remove(selected.id);
      setSelected(null);
      setToast({ open: true, message: "Usuario eliminado.", type: "success" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Usuarios y roles"
        subtitle="Solo el superusuario puede crear usuarios y asignar modulos visibles."
        rightSlot={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
          <span style={panelStyle}>Usuarios: {users.length}</span>
          <span style={panelStyle}>Seleccionado: {selected?.username ?? "Ninguno"}</span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) minmax(360px, 1fr) minmax(320px, 460px)", gap: 18, alignItems: "start" }}>
        <Card title="Crear usuario" subtitle="Credenciales y modulos iniciales.">
          <div style={{ display: "grid", gap: 12 }}>
            <Input label="Usuario" value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} />
            <Input label="Email" value={form.email ?? ""} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
            <Input label="Contrasena" value={form.password ?? ""} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} placeholder="Default: 123456" />
            <Input label="Rol visible" value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} />

            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 800 }}>
              <input
                type="checkbox"
                checked={form.is_staff}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, is_staff: e.target.checked }))}
              />
              Puede operar datos administrativos
            </label>

            <div style={{ ...panelStyle, display: "grid", gap: 8 }}>
              {MODULES.filter((module) => module.key !== "users").map((module) => (
                <label key={module.key} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={(form.modules ?? []).includes(module.key)}
                    onChange={() => setForm((s) => ({ ...s, modules: toggleModule(s.modules ?? [], module.key) }))}
                  />
                  {module.label}
                </label>
              ))}
            </div>

            <Button onClick={() => void onCreate()} disabled={loading || !form.username.trim()} fullWidth>
              {loading ? <Loader label="Guardando..." /> : "Crear usuario"}
            </Button>
          </div>
        </Card>

        <Card title="Listado" subtitle="Selecciona un usuario para editar sus modulos.">
          <div style={{ display: "grid", gap: 12 }}>
            <Input label="Buscar" placeholder="Usuario, email o rol..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {loading && <Loader label="Cargando usuarios..." />}
            <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 650, overflow: "auto" }}>
              {filtered.map((user) => {
                const active = selected?.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelected(normalizeUser(user));
                      setGeneratedPassword(null);
                      setResetPassword("");
                    }}
                    style={{
                      border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      borderRadius: 8,
                      background: active ? "rgba(255,210,74,0.07)" : "#0f1420",
                      color: "var(--color-text)",
                      padding: 14,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <strong>{user.username}</strong>
                      <span style={{ color: user.is_active ? "#8ee59f" : "#ffb4b4", fontSize: 12, fontWeight: 900 }}>
                        {user.is_superuser ? "Superuser" : user.role}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 12 }}>
                      {(user.modules ?? []).map(moduleLabel).join(", ") || "Sin modulos"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card title="Permisos" subtitle={selected ? "Edita el acceso por modulos." : "Selecciona un usuario."}>
          {!selected ? (
            <div style={{ ...panelStyle, color: "var(--color-text-muted)", fontSize: 13 }}>No hay usuario seleccionado.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <Input label="Usuario" value={selected.username} onChange={(e) => setSelected((s) => (s ? { ...s, username: e.target.value } : s))} disabled={selected.is_superuser} />
              <Input label="Email" value={selected.email ?? ""} onChange={(e) => setSelected((s) => (s ? { ...s, email: e.target.value } : s))} />
              <Input label="Rol visible" value={selected.role} onChange={(e) => setSelected((s) => (s ? { ...s, role: e.target.value } : s))} disabled={selected.is_superuser} />

              <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={selected.is_active}
                  disabled={selected.is_superuser}
                  onChange={(e) => setSelected((s) => (s ? { ...s, is_active: e.target.checked } : s))}
                />
                Usuario activo
              </label>

              <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 800 }}>
                <input
                  type="checkbox"
                  checked={selected.is_staff}
                  disabled={selected.is_superuser}
                  onChange={(e) => setSelected((s) => (s ? { ...s, is_staff: e.target.checked } : s))}
                />
                Puede operar datos administrativos
              </label>

              <div style={{ ...panelStyle, display: "grid", gap: 8 }}>
                {MODULES.map((module) => (
                  <label key={module.key} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={selected.is_superuser || (selected.modules ?? []).includes(module.key)}
                      disabled={selected.is_superuser}
                      onChange={() =>
                        setSelected((s) => (s ? { ...s, modules: toggleModule(s.modules ?? [], module.key) } : s))
                      }
                    />
                    {module.label}
                  </label>
                ))}
              </div>

              <Button onClick={() => void onSave()} disabled={loading || selected.is_superuser} fullWidth>
                {loading ? <Loader label="Guardando..." /> : "Guardar permisos"}
              </Button>

              <div style={{ ...panelStyle, display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Resetear contrasena</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                    Si dejas el campo vacio se genera una clave temporal.
                  </div>
                </div>
                <Input
                  label="Nueva contrasena"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Opcional"
                  disabled={loading}
                />
                <Button variant="outline" onClick={() => void onResetPassword()} disabled={loading}>
                  Resetear contrasena
                </Button>
                {generatedPassword && (
                  <div
                    style={{
                      border: "1px solid #ffd24a",
                      borderRadius: 8,
                      background: "rgba(255,210,74,0.08)",
                      color: "#ffd24a",
                      padding: 10,
                      fontSize: 13,
                      fontWeight: 900,
                      wordBreak: "break-word",
                    }}
                  >
                    Nueva clave: {generatedPassword}
                  </div>
                )}
              </div>

              <Button variant="danger" onClick={() => void onDelete()} disabled={loading || selected.is_superuser}>
                Eliminar usuario
              </Button>
            </div>
          )}
        </Card>
      </div>

      {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
