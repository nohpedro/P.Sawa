import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import { MODULES, moduleLabel } from "../../models/modules";
import type { ManagedUser } from "../../models/user";
import usersService from "../../services/users.service";
import { getErrorMessage } from "../../utils/error";
import ModuleAccessSections from "./ModuleAccessSections";
import { emptyUserForm, USER_ROLES_PAGE_SIZE } from "./userRoles.constants";

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

const selectStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #2a3243",
  background: "#0f1420",
  color: "#eaeaea",
  outline: "none",
};

const roleOptions = [
  { value: "operador", label: "Operador" },
  { value: "admin", label: "Administrador" },
  { value: "cliente", label: "Cliente" },
  { value: "superuser", label: "Superuser" },
];

function roleLabel(role: string): string {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function statusColor(user: Pick<ManagedUser, "is_active" | "is_superuser">): string {
  if (user.is_superuser) return "#ffd24a";
  return user.is_active ? "#8ee59f" : "#ffb4b4";
}

function accessPreview(modules: string[], limit = 5): string {
  if (modules.length === 0) return "Sin permisos asignados";
  const visible = modules.slice(0, limit).map(moduleLabel);
  const pending = modules.length - visible.length;
  return pending > 0 ? `${visible.join(", ")} +${pending} mas` : visible.join(", ");
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
  const [form, setForm] = useState(emptyUserForm);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; type: "info" | "success" | "error" }>({
    open: false,
    message: "",
    type: "info",
  });

  const load = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersService.list({ page: String(targetPage), page_size: String(USER_ROLES_PAGE_SIZE) });
      const normalized = (res.results ?? []).map(normalizeUser);
      setUsers(normalized);
      setTotalUsers(res.count ?? 0);
      setHasNextPage(Boolean(res.next));
      setHasPreviousPage(Boolean(res.previous));
      if (selected?.id) {
        setSelected(normalized.find((user) => user.id === selected.id) ?? null);
      }
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar usuarios."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => `${user.username} ${user.email} ${user.role}`.toLowerCase().includes(q));
  }, [query, users]);
  const pageStart = totalUsers === 0 || filtered.length === 0 ? 0 : (page - 1) * USER_ROLES_PAGE_SIZE + 1;
  const pageEnd = totalUsers === 0 || filtered.length === 0
    ? 0
    : Math.min((page - 1) * USER_ROLES_PAGE_SIZE + filtered.length, totalUsers);

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
      setForm(emptyUserForm);
      setPage(1);
      setSelected(normalizeUser(created));
      setModalMode(null);
      setGeneratedPassword(null);
      setToast({ open: true, message: "Usuario creado correctamente.", type: "success" });
      await load(1);
    } catch (err) {
      const message = getErrorMessage(err, "No se pudo crear usuario.");
      setError(message);
      setModalMode(null);
      setToast({ open: true, message, type: "error" });
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
      const message = getErrorMessage(err, "No se pudo resetear la contrasena.");
      setError(message);
      setToast({ open: true, message, type: "error" });
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
      setToast({ open: true, message: "Usuario actualizado correctamente.", type: "success" });
      setModalMode(null);
      await load(page);
    } catch (err) {
      const message = getErrorMessage(err, "No se pudo guardar.");
      setError(message);
      setToast({ open: true, message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleteTarget.is_superuser) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setSelected(null);
    setModalMode(null);
    setLoading(true);
    setError(null);
    try {
      await usersService.remove(target.id);
      setToast({ open: true, message: "Usuario eliminado correctamente.", type: "success" });
      await load(page);
    } catch (err) {
      const message = getErrorMessage(err, "No se pudo eliminar.");
      setError(message);
      setToast({ open: true, message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setForm(emptyUserForm);
    setSelected(null);
    setGeneratedPassword(null);
    setResetPassword("");
    setModalMode("create");
  };

  const openEdit = (user: ManagedUser) => {
    setSelected(normalizeUser(user));
    setGeneratedPassword(null);
    setResetPassword("");
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setGeneratedPassword(null);
    setResetPassword("");
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Usuarios y roles"
        subtitle="Gestiona usuarios y modulos visibles segun los accesos asignados."
        rightSlot={
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={openCreate}>+ Nuevo usuario</Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, fontSize: 13 }}>
          <div style={panelStyle}>
            <strong>{totalUsers}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Usuarios registrados</div>
          </div>
          <div style={panelStyle}>
            <strong>{users.filter((user) => user.is_active).length}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Usuarios activos</div>
          </div>
          <div style={panelStyle}>
            <strong>{selected?.username ?? "Ninguno"}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Seleccionado</div>
          </div>
        </div>
      </Card>

      <Card title="Listado" subtitle="Click o doble click sobre un usuario para editarlo.">
        <div style={{ display: "grid", gap: 14 }}>
          <Input
            label="Buscar"
            placeholder="Usuario, email o rol..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          {loading && <Loader label="Cargando usuarios..." />}
          <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 610, overflow: "auto" }}>
            {filtered.map((user) => {
              const active = selected?.id === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  title={accessPreview(user.modules ?? [])}
                  onClick={() => openEdit(user)}
                  onDoubleClick={() => openEdit(user)}
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
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 15 }}>{user.username}</strong>
                      <div style={{ marginTop: 4, color: "var(--color-text-muted)", fontSize: 12 }}>
                        {user.email || "Sin email"}
                      </div>
                    </div>
                    <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                      <span
                        style={{
                          border: `1px solid ${statusColor(user)}`,
                          borderRadius: 999,
                          color: statusColor(user),
                          padding: "5px 8px",
                          fontSize: 11,
                          fontWeight: 950,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {user.is_superuser ? "Superuser" : roleLabel(user.role)}
                      </span>
                      <span style={{ color: user.is_active ? "#8ee59f" : "#ffb4b4", fontSize: 11, fontWeight: 900 }}>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(user.modules ?? []).slice(0, 6).map((module) => (
                      <span
                        key={module}
                        style={{
                          border: "1px solid var(--color-border)",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.03)",
                          color: "var(--color-text-muted)",
                          padding: "5px 8px",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {moduleLabel(module)}
                      </span>
                    ))}
                    {(user.modules ?? []).length > 6 && (
                      <span style={{ color: "#ffd24a", fontSize: 11, fontWeight: 900, padding: "5px 0" }}>
                        +{(user.modules ?? []).length - 6} permisos
                      </span>
                    )}
                    {(user.modules ?? []).length === 0 && (
                      <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Sin modulos</span>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 12 }}>
                    <span style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
                      {(user.modules ?? []).length} accesos
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEdit(user);
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                </button>
              );
            })}

            {!loading && filtered.length === 0 && (
              <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron usuarios.</div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
              {totalUsers === 0 ? "Sin usuarios" : `Usuarios ${pageStart}-${pageEnd} de ${totalUsers}`}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!hasPreviousPage || loading}>
                Anterior
              </Button>
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!hasNextPage || loading}>
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {modalMode === "create" && createPortal(
        <div
          role="presentation"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(5, 8, 15, 0.72)",
            backdropFilter: "blur(3px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-create-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1280px, calc(100vw - 32px))",
              maxHeight: "90vh",
              overflow: "auto",
              border: "1px solid rgba(255,210,74,0.28)",
              borderRadius: 10,
              background: "var(--color-surface)",
              color: "var(--color-text)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 16 }}>
              <div>
                <h2 id="user-create-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                  Nuevo usuario
                </h2>
                <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
                  Crea credenciales y define accesos iniciales.
                </div>
              </div>
              <Button variant="ghost" onClick={closeModal} disabled={loading}>
                Cerrar
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...panelStyle, display: "grid", gap: 4 }}>
                  <div style={{ color: "#ffd24a", fontSize: 12, fontWeight: 950 }}>Datos de acceso</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                    La contrasena puede dejarse vacia para usar la clave temporal por defecto.
                  </div>
                </div>
                <Input label="Usuario" value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} />
                <Input label="Email" value={form.email ?? ""} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                <Input label="Contrasena" value={form.password ?? ""} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} placeholder="Default: 123456" />
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Rol visible</span>
                  <select value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} style={selectStyle}>
                    {roleOptions.filter((option) => option.value !== "superuser").map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center", fontSize: 13, fontWeight: 800 }}>
                  <input
                    type="checkbox"
                    checked={form.is_staff}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, is_staff: e.target.checked }))}
                  />
                  Puede operar datos administrativos
                </label>

                <Button onClick={() => void onCreate()} disabled={loading || !form.username.trim()} fullWidth>
                  {loading ? <Loader label="Guardando..." /> : "Crear usuario"}
                </Button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 950 }}>Permisos iniciales</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                      Activa solo las pantallas y acciones necesarias para este usuario.
                    </div>
                  </div>
                  <strong style={{ color: "#ffd24a", whiteSpace: "nowrap" }}>{(form.modules ?? []).length} accesos</strong>
                </div>
                <ModuleAccessSections
                  value={form.modules ?? []}
                  includeUsers={false}
                  onChange={(modules) => setForm((s) => ({ ...s, modules }))}
                />
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}

      {modalMode === "edit" && selected && createPortal(
        <div
          role="presentation"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(5, 8, 15, 0.72)",
            backdropFilter: "blur(3px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-permissions-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1320px, calc(100vw - 32px))",
              maxHeight: "90vh",
              overflow: "auto",
              border: "1px solid rgba(255,210,74,0.28)",
              borderRadius: 10,
              background: "var(--color-surface)",
              color: "var(--color-text)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 16 }}>
              <div>
                <h2 id="user-permissions-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                  Editar usuario
                </h2>
                <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
                  Permisos y accesos de {selected.username}.
                </div>
              </div>
              <Button variant="ghost" onClick={closeModal}>
                Cerrar
              </Button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ ...panelStyle, display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>Cuenta</div>
                      <div style={{ fontSize: 18, fontWeight: 950 }}>{selected.username}</div>
                    </div>
                    <span
                      style={{
                        border: `1px solid ${statusColor(selected)}`,
                        borderRadius: 999,
                        color: statusColor(selected),
                        padding: "6px 9px",
                        fontSize: 11,
                        fontWeight: 950,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selected.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                    {selected.is_superuser ? "Usuario con todos los accesos del sistema." : `${(selected.modules ?? []).length} permisos asignados.`}
                  </div>
                </div>
                <Input label="Usuario" value={selected.username} onChange={(e) => setSelected((s) => (s ? { ...s, username: e.target.value } : s))} disabled={selected.is_superuser} />
                <Input label="Email" value={selected.email ?? ""} onChange={(e) => setSelected((s) => (s ? { ...s, email: e.target.value } : s))} />
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Rol visible</span>
                  <select
                    value={selected.role}
                    onChange={(e) => setSelected((s) => (s ? { ...s, role: e.target.value } : s))}
                    disabled={selected.is_superuser}
                    style={{ ...selectStyle, opacity: selected.is_superuser ? 0.65 : 1 }}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div style={{ ...panelStyle, display: "grid", gap: 10 }}>
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

                <Button variant="danger" onClick={() => setDeleteTarget(selected)} disabled={loading || selected.is_superuser}>
                  Eliminar usuario
                </Button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 950 }}>Asignacion de permisos</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                      Los cambios se aplican al guardar permisos.
                    </div>
                  </div>
                  <strong style={{ color: "#ffd24a", whiteSpace: "nowrap" }}>
                    {(selected.is_superuser ? MODULES : selected.modules ?? []).length} accesos
                  </strong>
                </div>
                <ModuleAccessSections
                  value={selected.is_superuser ? MODULES.map((module) => module.key) : selected.modules ?? []}
                  disabled={selected.is_superuser}
                  onChange={(modules) => setSelected((s) => (s ? { ...s, modules } : s))}
                />
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}

      {deleteTarget && createPortal(
        <div
          role="presentation"
          onClick={() => setDeleteTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(5, 8, 15, 0.72)",
            backdropFilter: "blur(3px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-delete-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(460px, 100%)",
              border: "1px solid rgba(255,82,82,0.38)",
              borderRadius: 10,
              background: "var(--color-surface)",
              color: "var(--color-text)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              padding: 18,
            }}
          >
            <h2 id="user-delete-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
              Eliminar usuario
            </h2>
            <div style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
              Se eliminara el usuario {deleteTarget.username}. Esta accion no se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Button variant="danger" onClick={() => void confirmDelete()} disabled={loading} fullWidth>
                {loading ? <Loader label="Eliminando..." /> : "Eliminar usuario"}
              </Button>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </section>
        </div>,
        document.body
      )}

      {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
