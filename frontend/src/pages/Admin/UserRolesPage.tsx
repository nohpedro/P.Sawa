import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import { MODULES, moduleLabel, type ModuleKey } from "../../models/modules";
import type { ManagedUser, ManagedUserWriteDTO } from "../../models/user";
import usersService from "../../services/users.service";
import { getErrorMessage } from "../../utils/error";

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

const PAGE_SIZE = 5;

const MODULE_SECTIONS: Array<{
  title: string;
  description: string;
  modules: ModuleKey[];
}> = [
  {
    title: "Operacion",
    description: "Pantallas de disponibilidad y uso diario.",
    modules: ["availability"],
  },
  {
    title: "Reservacion",
    description: "Gestion y revision de reservas.",
    modules: ["reservations", "history"],
  },
  {
    title: "Clientes",
    description: "Consulta y administracion de clientes.",
    modules: ["customers"],
  },
  {
    title: "Administracion",
    description: "Configuracion de espacios, actividades, inventario y usuarios.",
    modules: ["spaces", "activities", "space_activities", "inventory", "users", "audit"],
  },
];

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

function setSectionModules(list: ModuleKey[], modules: ModuleKey[], checked: boolean): ModuleKey[] {
  if (checked) {
    return Array.from(new Set([...list, ...modules]));
  }

  return list.filter((item) => !modules.includes(item));
}

function normalizeUser(user: ManagedUser): ManagedUser {
  return {
    ...user,
    role: user.role || (user.is_superuser ? "superuser" : user.is_staff ? "admin" : "operador"),
    modules: Array.isArray(user.modules) ? user.modules : [],
  };
}

function ModuleAccessSections({
  value,
  disabled = false,
  includeUsers = true,
  onChange,
}: {
  value: ModuleKey[];
  disabled?: boolean;
  includeUsers?: boolean;
  onChange: (modules: ModuleKey[]) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {MODULE_SECTIONS.map((section) => {
        const sectionModules = section.modules.filter((module) => includeUsers || module !== "users");
        if (sectionModules.length === 0) return null;

        const selectedCount = sectionModules.filter((module) => value.includes(module)).length;
        const allChecked = selectedCount === sectionModules.length;

        return (
          <div key={section.title} style={{ ...panelStyle, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 950 }}>{section.title}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                  {section.description}
                </div>
              </div>

              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  disabled={disabled}
                  onChange={(event) => onChange(setSectionModules(value, sectionModules, event.target.checked))}
                />
                Todos
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              {sectionModules.map((module) => {
                const checked = value.includes(module);

                return (
                  <label
                    key={module}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      border: `1px solid ${checked ? "rgba(255,210,74,0.55)" : "var(--color-border)"}`,
                      borderRadius: 8,
                      background: checked ? "rgba(255,210,74,0.08)" : "rgba(255,255,255,0.02)",
                      padding: "9px 10px",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onChange(toggleModule(value, module))}
                    />
                    {MODULES.find((item) => item.key === module)?.label ?? module}
                  </label>
                );
              })}
            </div>

            <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
              {selectedCount} de {sectionModules.length} accesos seleccionados
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function UserRolesPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<ManagedUserWriteDTO>(emptyForm);
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
      const res = await usersService.list({ page: String(targetPage), page_size: String(PAGE_SIZE) });
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
  const pageStart = totalUsers === 0 || filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = totalUsers === 0 || filtered.length === 0
    ? 0
    : Math.min((page - 1) * PAGE_SIZE + filtered.length, totalUsers);

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
    setForm(emptyForm);
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13 }}>
          <span style={panelStyle}>Usuarios: {totalUsers}</span>
          <span style={panelStyle}>Pagina: {page}</span>
          <span style={panelStyle}>Seleccionado: {selected?.username ?? "Ninguno"}</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{user.username}</strong>
                    <span style={{ color: user.is_active ? "#8ee59f" : "#ffb4b4", fontSize: 12, fontWeight: 900 }}>
                      {user.is_superuser ? "Superuser" : user.role}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 12 }}>
                    {(user.modules ?? []).map(moduleLabel).join(", ") || "Sin modulos"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
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
              width: "min(860px, 100%)",
              maxHeight: "88vh",
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

            <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 330px) minmax(360px, 1fr)", gap: 18, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 12 }}>
                <Input label="Usuario" value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} />
                <Input label="Email" value={form.email ?? ""} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                <Input label="Contrasena" value={form.password ?? ""} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} placeholder="Default: 123456" />
                <Input label="Rol visible" value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} />

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

              <ModuleAccessSections
                value={form.modules ?? []}
                includeUsers={false}
                onChange={(modules) => setForm((s) => ({ ...s, modules }))}
              />
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
              width: "min(980px, 100%)",
              maxHeight: "88vh",
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

            <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 330px) minmax(360px, 1fr)", gap: 18, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 12 }}>
                <Input label="Usuario" value={selected.username} onChange={(e) => setSelected((s) => (s ? { ...s, username: e.target.value } : s))} disabled={selected.is_superuser} />
                <Input label="Email" value={selected.email ?? ""} onChange={(e) => setSelected((s) => (s ? { ...s, email: e.target.value } : s))} />
                <Input label="Rol visible" value={selected.role} onChange={(e) => setSelected((s) => (s ? { ...s, role: e.target.value } : s))} disabled={selected.is_superuser} />

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

              <ModuleAccessSections
                value={selected.is_superuser ? MODULES.map((module) => module.key) : selected.modules ?? []}
                disabled={selected.is_superuser}
                onChange={(modules) => setSelected((s) => (s ? { ...s, modules } : s))}
              />
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
