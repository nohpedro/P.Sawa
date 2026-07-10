import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Input from "../../../../components/ui/Input";
import Loader from "../../../../components/ui/Loader";
import GraphZoomToolbar from "../../../../components/visualGraph/GraphZoomToolbar";
import type { Espacio } from "../../../../models/espacio";
import type { EspacioActividad, TipoActividad } from "../../../../models/actividad";
import { clampGraphPoint, type GraphPoint } from "../../../../utils/visualGraph";
import { activityNodeSize, badgeStyle, defaultSpaceNode, graphPanPadding, graphSize, spaceNodeSize } from "../constants";
import type { DraggingNode, PanningGraph } from "../types";
import { relationForActivity } from "../utils/spaceActivityFormatters";
import { connectionPoints, getActivityPoint, toGraphPoint, toGraphWidthPercent } from "../utils/spaceActivityGraph";

export default function SpaceActivityGraph({
  space,
  activities,
  relations,
  loading,
  activityQuery,
  onActivityQueryChange,
  onBack,
  onRefresh,
  onAssignActivity,
  onAlreadyAssigned,
  onRemoveRelation,
}: {
  space: Espacio;
  activities: TipoActividad[];
  relations: EspacioActividad[];
  loading: boolean;
  activityQuery: string;
  onActivityQueryChange: (value: string) => void;
  onBack: () => void;
  onRefresh: () => void;
  onAssignActivity: (activity: TipoActividad) => void;
  onAlreadyAssigned: () => void;
  onRemoveRelation: (relation: EspacioActividad) => void;
}) {
  const graphViewportRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);

  const [dragLine, setDragLine] = useState<{ to: GraphPoint } | null>(null);
  const [spacePosition, setSpacePosition] = useState<GraphPoint>(defaultSpaceNode);
  const [activityPositions, setActivityPositions] = useState<Record<string, GraphPoint>>({});
  const [draggingNode, setDraggingNode] = useState<DraggingNode | null>(null);
  const [panningGraph, setPanningGraph] = useState<PanningGraph | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setDragLine(null);
    setDraggingNode(null);
    setPanningGraph(null);
    setSpacePosition(defaultSpaceNode);
    setActivityPositions({});
  }, [space.id]);

  useEffect(() => {
    setActivityPositions((current) => {
      const next = { ...current };
      activities.forEach((activity, index) => {
        if (!next[activity.id]) next[activity.id] = getActivityPoint(index, activities.length);
      });
      return next;
    });
  }, [activities]);

  const startNodeDrag = (event: PointerEvent<HTMLElement>, node: DraggingNode["type"], id?: string) => {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toGraphPoint(event, rect, zoom);
    const current = node === "space" ? spacePosition : activityPositions[id ?? ""] ?? point;
    setDraggingNode({
      type: node,
      id,
      offset: { x: point.x - current.x, y: point.y - current.y },
    });
  };

  const startLineDrag = (event: PointerEvent<HTMLElement>) => {
    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.stopPropagation();
    setDraggingNode(null);
    setDragLine({ to: toGraphPoint(event, rect, zoom) });
  };

  const startGraphPan = (event: PointerEvent<HTMLDivElement>) => {
    if (dragLine || draggingNode) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-graph-ignore-pan='true']")) return;
    const viewport = graphViewportRef.current;
    if (!viewport) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanningGraph({
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    });
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (panningGraph) {
      const viewport = graphViewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = panningGraph.scrollLeft - (event.clientX - panningGraph.x);
      viewport.scrollTop = panningGraph.scrollTop - (event.clientY - panningGraph.y);
      return;
    }

    const rect = graphRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toGraphPoint(event, rect, zoom);

    if (draggingNode) {
      const nextPoint = { x: point.x - draggingNode.offset.x, y: point.y - draggingNode.offset.y };
      if (draggingNode.type === "space") {
        setSpacePosition(clampGraphPoint(nextPoint, graphSize, spaceNodeSize));
      } else if (draggingNode.id) {
        setActivityPositions((current) => ({
          ...current,
          [draggingNode.id as string]: clampGraphPoint(nextPoint, graphSize, activityNodeSize),
        }));
      }
      return;
    }

    if (dragLine) setDragLine({ to: point });
  };

  const cancelDrag = () => {
    if (dragLine) setDragLine(null);
    if (draggingNode) setDraggingNode(null);
    if (panningGraph) setPanningGraph(null);
  };

  const dropOnActivity = (activity: TipoActividad) => {
    if (!dragLine) return;
    setDragLine(null);

    if (relationForActivity(relations, activity.id)) {
      onAlreadyAssigned();
      return;
    }
    onAssignActivity(activity);
  };

  return (
    <Card title="Editor visual" subtitle="Arrastra una linea para asignar. Click sobre una linea para quitar.">
      <div style={{ position: "relative", display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto auto", gap: 10, alignItems: "end" }}>
          <Input
            label="Filtrar actividades"
            placeholder="Futbol, voley, entrenamiento..."
            value={activityQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onActivityQueryChange(event.target.value)}
          />
          <Button variant="outline" onClick={onBack} disabled={loading}>
            Volver
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            Refrescar
          </Button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={badgeStyle}>{space.nombre}</span>
          <span style={badgeStyle}>Asignadas: {relations.length}</span>
          <span style={badgeStyle}>Actividades visibles: {activities.length}</span>
        </div>

        {loading && <Loader label="Actualizando mapa..." />}

        <GraphZoomToolbar zoom={zoom} onZoomChange={setZoom} />

        <div
          ref={graphViewportRef}
          onPointerDown={startGraphPan}
          onPointerMove={moveDrag}
          onPointerUp={cancelDrag}
          onPointerLeave={cancelDrag}
          style={{
            position: "relative",
            height: graphSize.height,
            minHeight: graphSize.height,
            maxHeight: graphSize.height,
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
              height: graphSize.height * zoom + graphPanPadding * 2,
              minHeight: graphSize.height + graphPanPadding * 2,
            }}
          >
            <svg
              viewBox={`0 0 ${graphSize.width} ${graphSize.height}`}
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                left: 0,
                top: graphPanPadding,
                width: "100%",
                height: graphSize.height * zoom,
                pointerEvents: "none",
              }}
            >
              <defs>
                <linearGradient id="assignedLine" gradientUnits="userSpaceOnUse" x1="0" x2={graphSize.width} y1="0" y2="0">
                  <stop offset="0%" stopColor="#ffd24a" />
                  <stop offset="100%" stopColor="#8ee59f" />
                </linearGradient>
              </defs>

              {activities.map((activity, index) => {
                const rel = relationForActivity(relations, activity.id);
                if (!rel) return null;
                const to = activityPositions[activity.id] ?? getActivityPoint(index, activities.length);
                const line = connectionPoints(spacePosition, to);
                return (
                  <g
                    key={rel.id}
                    data-graph-ignore-pan="true"
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                    onClick={() => onRemoveRelation(rel)}
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
                      strokeDasharray={rel.activo ? undefined : "10 10"}
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
              onPointerDown={(event) => startNodeDrag(event, "space")}
              style={{
                position: "absolute",
                left: `${(spacePosition.x / graphSize.width) * 100}%`,
                top: graphPanPadding + (spacePosition.y / graphSize.height) * graphSize.height * zoom,
                transform: "translate(-50%, -50%)",
                width: toGraphWidthPercent(spaceNodeSize.width),
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
              <div style={{ fontSize: 18, fontWeight: 950, marginTop: 6 }}>{space.nombre}</div>
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

            {activities.map((activity, index) => {
              const point = activityPositions[activity.id] ?? getActivityPoint(index, activities.length);
              const rel = relationForActivity(relations, activity.id);
              return (
                <button
                  key={activity.id}
                  data-graph-ignore-pan="true"
                  type="button"
                  onPointerDown={(event) => {
                    if (dragLine) return;
                    startNodeDrag(event, "activity", activity.id);
                  }}
                  onPointerUp={(event) => {
                    event.stopPropagation();
                    if (dragLine) dropOnActivity(activity);
                    setDraggingNode(null);
                  }}
                  style={{
                    position: "absolute",
                    left: `${(point.x / graphSize.width) * 100}%`,
                    top: graphPanPadding + (point.y / graphSize.height) * graphSize.height * zoom,
                    transform: "translate(-50%, -50%)",
                    width: toGraphWidthPercent(activityNodeSize.width),
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

            {activities.length === 0 && (
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
      </div>
    </Card>
  );
}
