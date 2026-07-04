import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";

import { useEspacios } from "../../hooks/useEspacios";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import { useEspacioActividad } from "../../hooks/useEspacioActividad";

import type { Espacio } from "../../models/espacio";
import type { TipoActividad, EspacioActividad } from "../../models/actividad";
import { getErrorMessage } from "../../utils/error";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };
type ViewMode = "list" | "graph";
type GraphPoint = { x: number; y: number };
type DraggingNode = { type: "space" | "activity"; id?: string; offset: GraphPoint };
type PanningGraph = { x: number; y: number; scrollLeft: number; scrollTop: number };

const graphWidth = 1000;
const graphHeight = 620;
const graphPanPadding = 180;
const defaultSpaceNode: GraphPoint = { x: 150, y: 310 };
const spaceNodeSize = { width: 150, height: 108 };
const activityNodeSize = { width: 155, height: 78 };

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

function moneyLike(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function estadoColor(value: string) {
  if (value === "LIBRE" || value === "DISPONIBLE") return "#8ee59f";
  if (value === "OCUPADO" || value === "MANTENIMIENTO") return "#ffd24a";
  return "#cbd5e1";
}

function getActivityPoint(index: number, total: number): GraphPoint {
  if (total <= 1) return { x: 760, y: 310 };
  const top = 86;
  const bottom = 534;
  const step = (bottom - top) / Math.max(1, total - 1);
  return { x: 760, y: top + index * step };
}

function clampPoint(point: GraphPoint, size: { width: number; height: number }): GraphPoint {
  return {
    x: Math.min(graphWidth - size.width / 2, Math.max(size.width / 2, point.x)),
    y: Math.min(graphHeight - size.height / 2, Math.max(size.height / 2, point.y)),
  };
}

function connectionPoints(spacePoint: GraphPoint, activityPoint: GraphPoint) {
  return {
    from: { x: spacePoint.x + spaceNodeSize.width / 2, y: spacePoint.y },
    to: { x: activityPoint.x - activityNodeSize.width / 2, y: activityPoint.y },
  };
}

function graphWidthPercent(width: number): string {
  return `${(width / graphWidth) * 100}%`;
}

function toGraphPoint(evt: PointerEvent<HTMLElement>, rect: DOMRect, zoomValue: number): GraphPoint {
  return {
    x: ((evt.clientX - rect.left) / rect.width) * graphWidth,
    y: ((evt.clientY - rect.top - graphPanPadding) / (graphHeight * zoomValue)) * graphHeight,
  };
}

function relationForActivity(relaciones: EspacioActividad[], activityId: string): EspacioActividad | null {
  return relaciones.find((rel) => rel.tipo === activityId) ?? null;
}

export default function SpaceActivitiesPage() {
  const espacios = useEspacios();
  const tipos = useTiposActividad();
  const ea = useEspacioActividad();

  const graphViewportRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [spaceQuery, setSpaceQuery] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [espacioSel, setEspacioSel] = useState<Espacio | null>(null);
  const [relaciones, setRelaciones] = useState<EspacioActividad[]>([]);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const [dragLine, setDragLine] = useState<{ to: GraphPoint } | null>(null);
  const [spacePosition, setSpacePosition] = useState<GraphPoint>(defaultSpaceNode);
  const [activityPositions, setActivityPositions] = useState<Record<string, GraphPoint>>({});
  const [draggingNode, setDraggingNode] = useState<DraggingNode | null>(null);
  const [panningGraph, setPanningGraph] = useState<PanningGraph | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pendingActivity, setPendingActivity] = useState<TipoActividad | null>(null);
  const [relationToRemove, setRelationToRemove] = useState<EspacioActividad | null>(null);
  const [duracion, setDuracion] = useState(60);
  const [precio, setPrecio] = useState("70.00");

  useEffect(() => {
    espacios.list({ page: "1" }).catch(() => {});
    tipos.list({ page: "1" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const espaciosList = useMemo(() => espacios.data?.results ?? [], [espacios.data?.results]);
  const actividadesList = useMemo(() => (tipos.data?.results ?? []).filter((activity) => activity.activo), [tipos.data?.results]);

  const espaciosFiltrados = useMemo(() => {
    const q = spaceQuery.trim().toLowerCase();
    if (!q) return espaciosList;
    return espaciosList.filter((space) =>
      `${space.nombre} ${space.ubicacion} ${space.tags} ${space.estado_operativo}`.toLowerCase().includes(q)
    );
  }, [espaciosList, spaceQuery]);

  const actividadesFiltradas = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    if (!q) return actividadesList;
    return actividadesList.filter((activity) => `${activity.nombre} ${activity.descripcion ?? ""}`.toLowerCase().includes(q));
  }, [actividadesList, activityQuery]);

  useEffect(() => {
    setActivityPositions((current) => {
      const next = { ...current };
      actividadesFiltradas.forEach((activity, index) => {
        if (!next[activity.id]) {
          next[activity.id] = getActivityPoint(index, actividadesFiltradas.length);
        }
      });
      return next;
    });
  }, [actividadesFiltradas]);

  const assignedCount = relaciones.length;
  const anyError = espacios.error || tipos.error || ea.error;
  const isBusy = espacios.loading || tipos.loading || ea.loading;

  const refreshRelaciones = async (spaceId = espacioSel?.id) => {
    if (!spaceId) return;
    const res = await ea.list({ page: "1", espacio: spaceId });
    setRelaciones(res.results ?? []);
  };

  const openGraph = async (space: Espacio) => {
    setEspacioSel(space);
    setViewMode("graph");
    setActivityQuery("");
    setDragLine(null);
    setDraggingNode(null);
    setSpacePosition(defaultSpaceNode);
    setActivityPositions({});
    try {
      await refreshRelaciones(space.id);
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudieron cargar las asignaciones."), type: "error" });
    }
  };

  const backToList = () => {
    setViewMode("list");
    setEspacioSel(null);
    setRelaciones([]);
    setDragLine(null);
    setDraggingNode(null);
    setPendingActivity(null);
    setRelationToRemove(null);
  };

  const startNodeDrag = (evt: PointerEvent<HTMLElement>, node: DraggingNode["type"], id?: string) => {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toGraphPoint(evt, rect, zoom);
    const current = node === "space" ? spacePosition : activityPositions[id ?? ""] ?? point;
    setDraggingNode({
      type: node,
      id,
      offset: { x: point.x - current.x, y: point.y - current.y },
    });
  };

  const startLineDrag = (evt: PointerEvent<HTMLElement>) => {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    evt.stopPropagation();
    setDraggingNode(null);
    setDragLine({ to: toGraphPoint(evt, rect, zoom) });
  };

  const startGraphPan = (evt: PointerEvent<HTMLDivElement>) => {
    if (dragLine || draggingNode) return;
    const target = evt.target;
    if (target instanceof Element && target.closest("[data-graph-ignore-pan='true']")) return;
    const viewport = graphViewportRef.current;
    if (!viewport) return;

    evt.currentTarget.setPointerCapture(evt.pointerId);
    setPanningGraph({
      x: evt.clientX,
      y: evt.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    });
  };

  const moveDrag = (evt: PointerEvent<HTMLDivElement>) => {
    if (panningGraph) {
      const viewport = graphViewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = panningGraph.scrollLeft - (evt.clientX - panningGraph.x);
      viewport.scrollTop = panningGraph.scrollTop - (evt.clientY - panningGraph.y);
      return;
    }

    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toGraphPoint(evt, rect, zoom);

    if (draggingNode) {
      const nextPoint = { x: point.x - draggingNode.offset.x, y: point.y - draggingNode.offset.y };
      if (draggingNode.type === "space") {
        setSpacePosition(clampPoint(nextPoint, spaceNodeSize));
      } else if (draggingNode.id) {
        setActivityPositions((current) => ({
          ...current,
          [draggingNode.id as string]: clampPoint(nextPoint, activityNodeSize),
        }));
      }
      return;
    }

    if (dragLine) {
      setDragLine({ to: point });
    }
  };

  const cancelDrag = () => {
    if (dragLine) setDragLine(null);
    if (draggingNode) setDraggingNode(null);
    if (panningGraph) setPanningGraph(null);
  };

  const dropOnActivity = (activity: TipoActividad) => {
    if (!dragLine) return;
    setDragLine(null);

    if (relationForActivity(relaciones, activity.id)) {
      setToast({ open: true, message: "Esta actividad ya esta asignada al espacio.", type: "info" });
      return;
    }

    setDuracion(60);
    setPrecio("70.00");
    setPendingActivity(activity);
  };

  const confirmAssignment = async () => {
    if (!espacioSel?.id || !pendingActivity?.id) return;

    try {
      await ea.create({
        espacio: espacioSel.id,
        tipo: pendingActivity.id,
        duracion_minutos: Math.max(1, Number(duracion) || 1),
        precio_base: precio || "0",
        activo: true,
      });

      setToast({ open: true, message: "Actividad asignada al espacio.", type: "success" });
      setPendingActivity(null);
      await refreshRelaciones(espacioSel.id);
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo asignar la actividad."), type: "error" });
    }
  };

  const confirmRemoveRelation = async () => {
    if (!relationToRemove) return;
    const rel = relationToRemove;
    try {
      await ea.remove(rel.id);
      setToast({ open: true, message: "Asignacion eliminada.", type: "success" });
      setRelationToRemove(null);
      await refreshRelaciones(espacioSel?.id);
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo eliminar la asignacion."), type: "error" });
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {viewMode === "list" ? (
        <>
          <Card
            title="Designacion de actividades"
            subtitle="Selecciona un espacio para editar sus actividades en un mapa visual."
            rightSlot={
              <Button variant="outline" onClick={() => void espacios.list({ page: "1" })} disabled={espacios.loading}>
                Refrescar
              </Button>
            }
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={badgeStyle}>Espacios: {espaciosList.length}</span>
              <span style={badgeStyle}>Actividades activas: {actividadesList.length}</span>
            </div>
          </Card>

          <Card title="Espacios" subtitle="Doble click o Editar abre el mapa de asignaciones.">
            <div style={{ display: "grid", gap: 12 }}>
              <Input
                label="Buscar espacio"
                placeholder="Cancha, sede, etiqueta..."
                value={spaceQuery}
                onChange={(evt: ChangeEvent<HTMLInputElement>) => setSpaceQuery(evt.target.value)}
              />

              {espacios.loading && <Loader label="Cargando espacios..." />}

              <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 650, overflow: "auto" }}>
                {espaciosFiltrados.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    onDoubleClick={() => void openGraph(space)}
                    style={{
                      textAlign: "left",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      background: "#0f1420",
                      color: "var(--color-text)",
                      padding: 14,
                      cursor: "default",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <strong>{space.nombre}</strong>
                      <span style={{ color: estadoColor(space.estado_operativo), fontSize: 12, fontWeight: 950 }}>
                        {space.estado_operativo}
                      </span>
                    </div>
                    <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 13 }}>
                      {space.ubicacion || "Sin ubicacion"} / Cap: {space.capacidad ?? "-"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openGraph(space);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  </button>
                ))}

                {!espacios.loading && espaciosFiltrados.length === 0 && (
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron espacios.</div>
                )}
              </div>
            </div>
          </Card>
        </>
      ) : (
        <>
          <Card title="Editor visual" subtitle="Arrastra una linea para asignar. Click sobre una linea para quitar.">
            <div style={{ position: "relative", display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto auto", gap: 10, alignItems: "end" }}>
                <Input
                  label="Filtrar actividades"
                  placeholder="Futbol, voley, entrenamiento..."
                  value={activityQuery}
                  onChange={(evt: ChangeEvent<HTMLInputElement>) => setActivityQuery(evt.target.value)}
                />
                <Button variant="outline" onClick={backToList} disabled={isBusy}>
                  Volver
                </Button>
                <Button variant="outline" onClick={() => void refreshRelaciones()} disabled={!espacioSel?.id || isBusy}>
                  Refrescar
                </Button>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={badgeStyle}>{espacioSel?.nombre ?? "Sin espacio"}</span>
                <span style={badgeStyle}>Asignadas: {assignedCount}</span>
                <span style={badgeStyle}>Actividades visibles: {actividadesFiltradas.length}</span>
              </div>

              {isBusy && <Loader label="Actualizando mapa..." />}

              <div
                data-graph-ignore-pan="true"
                style={{
                  position: "sticky",
                  top: 0,
                  left: 0,
                  zIndex: 40,
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                  width: "fit-content",
                  padding: 6,
                  border: "1px solid rgba(255,210,74,0.28)",
                  borderRadius: 10,
                  background: "rgba(7,11,19,0.92)",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.32)",
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
                  style={{ width: 40, padding: "8px 0" }}
                >
                  -
                </Button>
                <Button variant="outline" size="sm" onClick={() => setZoom(1)} style={{ minWidth: 58, padding: "8px 8px" }}>
                  {Math.round(zoom * 100)}%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
                  style={{ width: 40, padding: "8px 0" }}
                >
                  +
                </Button>
              </div>

              <div
                ref={graphViewportRef}
                onPointerDown={startGraphPan}
                onPointerMove={moveDrag}
                onPointerUp={cancelDrag}
                onPointerLeave={cancelDrag}
                style={{
                  position: "relative",
                  height: graphHeight,
                  minHeight: graphHeight,
                  maxHeight: graphHeight,
                  border: "1px solid rgba(255,210,74,0.22)",
                  borderRadius: 10,
                  overflow: "auto",
                  cursor: panningGraph ? "grabbing" : "grab",
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.035) 1px, transparent 1px), #070b13",
                  backgroundSize: "46px 46px",
                }}
              >
                <div
                  ref={graphRef}
                  style={{
                    position: "relative",
                    width: `${zoom * 100}%`,
                    height: graphHeight * zoom + graphPanPadding * 2,
                    minHeight: graphHeight + graphPanPadding * 2,
                    transform: "none",
                  }}
                >
                <svg
                  viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                  preserveAspectRatio="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: graphPanPadding,
                    width: "100%",
                    height: graphHeight * zoom,
                    pointerEvents: "none",
                  }}
                >
                  <defs>
                    <linearGradient id="assignedLine" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#ffd24a" />
                      <stop offset="100%" stopColor="#8ee59f" />
                    </linearGradient>
                  </defs>

                  {actividadesFiltradas.map((activity, index) => {
                    const rel = relationForActivity(relaciones, activity.id);
                    if (!rel) return null;
                    const to = activityPositions[activity.id] ?? getActivityPoint(index, actividadesFiltradas.length);
                    const line = connectionPoints(spacePosition, to);
                    return (
                      <g
                        key={rel.id}
                        data-graph-ignore-pan="true"
                        style={{ pointerEvents: "auto", cursor: "pointer" }}
                        onClick={() => setRelationToRemove(rel)}
                      >
                        <line x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y} stroke="transparent" strokeWidth="28" />
                        <line
                          x1={line.from.x}
                          y1={line.from.y}
                          x2={line.to.x}
                          y2={line.to.y}
                          stroke="url(#assignedLine)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={rel.activo ? "0" : "10 10"}
                        />
                        <circle cx={line.to.x} cy={line.to.y} r="7" fill="#8ee59f" />
                      </g>
                    );
                  })}

                  {dragLine && (
                    <line
                      x1={spacePosition.x + spaceNodeSize.width / 2}
                      y1={spacePosition.y}
                      x2={dragLine.to.x}
                      y2={dragLine.to.y}
                      stroke="#ffd24a"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray="14 10"
                    />
                  )}
                </svg>

                <div
                  data-graph-ignore-pan="true"
                  role="button"
                  tabIndex={0}
                  onPointerDown={(evt) => startNodeDrag(evt, "space")}
                  style={{
                    position: "absolute",
                    left: `${(spacePosition.x / graphWidth) * 100}%`,
                    top: graphPanPadding + (spacePosition.y / graphHeight) * graphHeight * zoom,
                    transform: "translate(-50%, -50%)",
                    width: graphWidthPercent(spaceNodeSize.width),
                    minHeight: 118,
                    boxSizing: "border-box",
                    border: "2px solid #ffd24a",
                    borderRadius: 16,
                    background: "linear-gradient(135deg, rgba(255,210,74,0.24), #111827 62%)",
                    color: "#f8fafc",
                    boxShadow: "0 18px 46px rgba(255,210,74,0.12)",
                    cursor: draggingNode?.type === "space" ? "grabbing" : "grab",
                    padding: 14,
                    textAlign: "center",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#ffd24a", fontWeight: 950, textTransform: "uppercase" }}>Espacio</div>
                  <div style={{ fontSize: 18, fontWeight: 950, marginTop: 6 }}>{espacioSel?.nombre}</div>
                  <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8 }}>Mueve o conecta</div>
                  <span
                    data-graph-ignore-pan="true"
                    role="button"
                    tabIndex={0}
                    aria-label="Crear conexion"
                    onPointerDown={startLineDrag}
                    style={{
                      position: "absolute",
                      right: -10,
                      top: "50%",
                      width: 20,
                      height: 20,
                      transform: "translateY(-50%)",
                      borderRadius: "50%",
                      border: "2px solid #070b13",
                      background: "#ffd24a",
                      boxShadow: "0 0 0 5px rgba(255,210,74,0.20)",
                      cursor: "crosshair",
                    }}
                  />
                </div>

                {actividadesFiltradas.map((activity, index) => {
                  const point = activityPositions[activity.id] ?? getActivityPoint(index, actividadesFiltradas.length);
                  const rel = relationForActivity(relaciones, activity.id);
                  return (
                    <button
                      key={activity.id}
                      data-graph-ignore-pan="true"
                      type="button"
                      onPointerDown={(evt) => {
                        if (dragLine) return;
                        startNodeDrag(evt, "activity", activity.id);
                      }}
                      onPointerUp={(evt) => {
                        evt.stopPropagation();
                        if (dragLine) {
                          dropOnActivity(activity);
                        }
                        setDraggingNode(null);
                      }}
                      style={{
                        position: "absolute",
                        left: `${(point.x / graphWidth) * 100}%`,
                        top: graphPanPadding + (point.y / graphHeight) * graphHeight * zoom,
                        transform: "translate(-50%, -50%)",
                        width: graphWidthPercent(activityNodeSize.width),
                        minHeight: 86,
                        boxSizing: "border-box",
                        border: `1px solid ${rel ? "#8ee59f" : "var(--color-border)"}`,
                        borderRadius: 12,
                        background: rel ? "rgba(142,229,159,0.12)" : "#0f1420",
                        color: "var(--color-text)",
                        padding: 12,
                        cursor: draggingNode?.id === activity.id ? "grabbing" : "grab",
                        boxShadow: rel ? "0 12px 30px rgba(142,229,159,0.08)" : "none",
                        touchAction: "none",
                        userSelect: "none",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 950, lineHeight: 1.2 }}>{activity.nombre}</div>
                      <div style={{ color: rel ? "#8ee59f" : "#94a3b8", fontSize: 11, fontWeight: 900, marginTop: 8 }}>
                        {rel ? `Asignada / ${rel.duracion_minutos} min / Bs ${rel.precio_base}` : "Soltar linea aqui"}
                      </div>
                    </button>
                  );
                })}

                {!tipos.loading && actividadesFiltradas.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      color: "var(--color-text-muted)",
                      fontSize: 13,
                    }}
                  >
                    No hay actividades para mostrar.
                  </div>
                )}
                </div>
              </div>

              {relationToRemove && (
                <div
                  role="presentation"
                  onClick={() => setRelationToRemove(null)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 20,
                    display: "grid",
                    placeItems: "center",
                    padding: 24,
                    background: "rgba(5, 8, 15, 0.58)",
                    backdropFilter: "blur(2px)",
                  }}
                >
                  <section
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="remove-assignment-title"
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      width: "min(480px, 100%)",
                      border: "1px solid rgba(255,82,82,0.38)",
                      borderRadius: 10,
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                      padding: 18,
                    }}
                  >
                    <h2 id="remove-assignment-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                      Quitar asignacion
                    </h2>
                    <div style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
                      Se eliminara la relacion entre {espacioSel?.nombre ?? "este espacio"} y{" "}
                      {relationToRemove.tipo_nombre ?? "esta actividad"}.
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                      <Button variant="danger" onClick={() => void confirmRemoveRelation()} disabled={ea.loading} fullWidth>
                        {ea.loading ? <Loader label="Quitando..." /> : "Quitar actividad"}
                      </Button>
                      <Button variant="outline" onClick={() => setRelationToRemove(null)} disabled={ea.loading}>
                        Cancelar
                      </Button>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {anyError && (
        <div style={{ color: "#ff5252", fontSize: 13 }}>
          {getErrorMessage(new Error(anyError), "No se pudo completar la operacion.")}
        </div>
      )}

      {pendingActivity &&
        createPortal(
          <div
            role="presentation"
            onClick={() => setPendingActivity(null)}
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
              aria-labelledby="assign-activity-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(520px, 100%)",
                border: "1px solid rgba(255,210,74,0.28)",
                borderRadius: 10,
                background: "var(--color-surface)",
                color: "var(--color-text)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
                padding: 18,
              }}
            >
              <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
                <h2 id="assign-activity-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                  Nueva asignacion
                </h2>
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                  {espacioSel?.nombre} recibira la actividad {pendingActivity.nombre}.
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <Input
                  label="Duracion (min)"
                  type="number"
                  value={String(duracion)}
                  onChange={(evt: ChangeEvent<HTMLInputElement>) => setDuracion(Number(evt.target.value))}
                />
                <Input
                  label="Precio base (Bs)"
                  value={precio}
                  onChange={(evt: ChangeEvent<HTMLInputElement>) => setPrecio(moneyLike(evt.target.value))}
                />

                <div style={{ display: "flex", gap: 10 }}>
                  <Button onClick={() => void confirmAssignment()} disabled={ea.loading} fullWidth>
                    {ea.loading ? <Loader label="Asignando..." /> : "Crear asignacion"}
                  </Button>
                  <Button variant="outline" onClick={() => setPendingActivity(null)} disabled={ea.loading}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </section>
          </div>,
          document.body
        )}

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
