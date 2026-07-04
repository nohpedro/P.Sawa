import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import auditService, { type AuditQuery } from "../../services/audit.service";
import type { AuditAction, AuditLog } from "../../models/audit";
import { getErrorMessage } from "../../utils/error";

const PAGE_SIZE = 200;

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

const badgeStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
};

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function actionVerb(action: AuditAction): string {
  if (action === "CREATE") return "creo";
  if (action === "UPDATE") return "edito";
  return "elimino";
}

function actionColor(action: AuditAction): string {
  if (action === "CREATE") return "#8ee59f";
  if (action === "UPDATE") return "#ffd24a";
  return "#ff8a8a";
}

function auditMessage(log: AuditLog): string {
  if (log.message?.trim()) return log.message;

  return `El usuario ${log.username || "Sistema"} ${actionVerb(log.action)} en ${log.module_label}. Afecto a ${log.affected_summary || log.target_repr || "un registro"} el ${formatDateTime(log.created_at)}.`;
}

function getAuditChanges(log: AuditLog) {
  const changes = log.metadata?.changes;
  if (!Array.isArray(changes)) return [];

  return changes
    .filter((change): change is Record<string, unknown> => typeof change === "object" && change !== null)
    .map((change) => ({
      label: String(change.label || change.field || "Campo"),
      before: String(change.before || "sin valor"),
      after: String(change.after || "sin valor"),
    }));
}

function uniqueOptions(logs: AuditLog[], getValue: (log: AuditLog) => string, getLabel: (log: AuditLog) => string) {
  const map = new Map<string, string>();
  logs.forEach((log) => {
    const value = getValue(log);
    if (!value || map.has(value)) return;
    map.set(value, getLabel(log));
  });
  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export default function AuditPage() {
  const today = useMemo(() => new Date(), []);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [desde, setDesde] = useState(() => toDateInput(addDays(today, -30)));
  const [hasta, setHasta] = useState(() => toDateInput(today));
  const [user, setUser] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: AuditQuery = {
        page: "1",
        page_size: String(PAGE_SIZE),
        desde,
        hasta,
        user: user || undefined,
        module: module || undefined,
        action: action || undefined,
        search: search.trim() || undefined,
      };
      const res = await auditService.list(params);
      setLogs(res.results ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar la auditoria."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userOptions = useMemo(
    () => [
      { label: "Todos los usuarios", value: "" },
      ...uniqueOptions(
        logs.filter((log) => log.user !== null),
        (log) => String(log.user),
        (log) => log.username || "Sistema"
      ),
    ],
    [logs]
  );
  const moduleOptions = useMemo(
    () => [{ label: "Todos los modulos", value: "" }, ...uniqueOptions(logs, (log) => log.module, (log) => log.module_label)],
    [logs]
  );
  const actionOptions = [
    { label: "Todas las acciones", value: "" },
    { label: "Creacion", value: "CREATE" },
    { label: "Edicion", value: "UPDATE" },
    { label: "Eliminacion", value: "DELETE" },
  ];

  const usersCount = useMemo(() => new Set(logs.map((log) => log.username || "Sistema")).size, [logs]);
  const modulesCount = useMemo(() => new Set(logs.map((log) => log.module).filter(Boolean)).size, [logs]);

  const onSearchChange = (evt: ChangeEvent<HTMLInputElement>) => setSearch(evt.target.value);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Auditoria"
        subtitle="Consulta quien realizo acciones sobre reservas, espacios, actividades y designaciones."
        rightSlot={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={badgeStyle}>Eventos: {logs.length}</span>
          <span style={badgeStyle}>Usuarios: {usersCount}</span>
          <span style={badgeStyle}>Modulos: {modulesCount}</span>
        </div>
      </Card>

      <Card title="Filtros" subtitle="Filtra por usuario, fecha, modulo o tipo de accion.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "end" }}>
          <Input label="Desde" type="date" value={desde} onChange={(evt) => setDesde(evt.target.value)} />
          <Input label="Hasta" type="date" value={hasta} onChange={(evt) => setHasta(evt.target.value)} />
          <Select label="Usuario" options={userOptions} value={user} onChange={(evt) => setUser(evt.target.value)} />
          <Select label="Modulo" options={moduleOptions} value={module} onChange={(evt) => setModule(evt.target.value)} />
          <Select label="Accion" options={actionOptions} value={action} onChange={(evt) => setAction(evt.target.value)} />
          <Input label="Buscar" placeholder="Registro afectado..." value={search} onChange={onSearchChange} />
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? <Loader label="Cargando..." /> : "Aplicar"}
          </Button>
        </div>
      </Card>

      <Card title="Eventos" subtitle="Resumen de acciones registradas por el sistema.">
        {loading && <Loader label="Cargando auditoria..." />}
        {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {logs.map((log) => {
            const changes = getAuditChanges(log);

            return (
              <div
                key={log.id}
                style={{
                  ...panelStyle,
                  display: "grid",
                  gap: 8,
                  borderColor: "rgba(255,210,74,0.16)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{auditMessage(log)}</strong>
                  <span style={{ color: actionColor(log.action), fontSize: 12, fontWeight: 950 }}>
                    {log.action_label}
                  </span>
                </div>

                {log.action === "UPDATE" && changes.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {changes.map((change, index) => (
                      <span
                        key={`${log.id}-${change.label}-${index}`}
                        style={{
                          border: "1px solid rgba(255,210,74,0.24)",
                          borderRadius: 999,
                          color: "#ffe082",
                          background: "rgba(255,210,74,0.08)",
                          padding: "5px 9px",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {change.label}: {change.before} &gt; {change.after}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
                  <span>Usuario: {log.username || "Sistema"}</span>
                  <span>Modulo: {log.module_label}</span>
                  <span>Fecha: {formatDateTime(log.created_at)}</span>
                </div>
              </div>
            );
          })}

          {!loading && logs.length === 0 && (
            <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay eventos de auditoria con esos filtros.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
