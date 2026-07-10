import { useEffect, useMemo, useState } from "react";
import Toast from "../../components/ui/Toast";
import { useEspacios } from "../../hooks/useEspacios";
import { useTiposActividad } from "../../hooks/useTiposActividad";
import { useEspacioActividad } from "../../hooks/useEspacioActividad";
import type { Espacio } from "../../models/espacio";
import type { EspacioActividad, TipoActividad } from "../../models/actividad";
import { getErrorMessage } from "../../utils/error";
import SpaceActivityGraph from "./SpaceActivities/components/SpaceActivityGraph";
import SpaceActivityList from "./SpaceActivities/components/SpaceActivityList";
import AssignActivityModal from "./SpaceActivities/modals/AssignActivityModal";
import RemoveActivityAssignmentModal from "./SpaceActivities/modals/RemoveActivityAssignmentModal";
import type { ToastState, ViewMode } from "./SpaceActivities/types";
import { filterActivities, filterSpaces, upsertRelation } from "./SpaceActivities/utils/spaceActivityFormatters";

export default function SpaceActivitiesPage() {
  const espacios = useEspacios();
  const tipos = useTiposActividad();
  const ea = useEspacioActividad();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [spaceQuery, setSpaceQuery] = useState("");
  const [activityQuery, setActivityQuery] = useState("");
  const [espacioSel, setEspacioSel] = useState<Espacio | null>(null);
  const [relaciones, setRelaciones] = useState<EspacioActividad[]>([]);
  const [pendingActivity, setPendingActivity] = useState<TipoActividad | null>(null);
  const [relationToRemove, setRelationToRemove] = useState<EspacioActividad | null>(null);
  const [duracion, setDuracion] = useState(60);
  const [precio, setPrecio] = useState("70.00");
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  useEffect(() => {
    espacios.list({ page: "1", page_size: "200" }).catch(() => {});
    tipos.list({ page: "1", page_size: "200" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const espaciosList = useMemo(() => espacios.data?.results ?? [], [espacios.data?.results]);
  const actividadesList = useMemo(() => (tipos.data?.results ?? []).filter((activity) => activity.activo), [tipos.data?.results]);
  const espaciosFiltrados = useMemo(() => filterSpaces(espaciosList, spaceQuery), [espaciosList, spaceQuery]);
  const actividadesFiltradas = useMemo(() => filterActivities(actividadesList, activityQuery), [actividadesList, activityQuery]);
  const anyError = espacios.error || tipos.error || ea.error;
  const isBusy = espacios.loading || tipos.loading || ea.loading;

  const refreshRelaciones = async (spaceId = espacioSel?.id) => {
    if (!spaceId) return [];
    const res = await ea.list({ page: "1", page_size: "200", espacio: spaceId });
    const next = res.results ?? [];
    setRelaciones(next);
    return next;
  };

  const openGraph = async (space: Espacio) => {
    setEspacioSel(space);
    setViewMode("graph");
    setActivityQuery("");
    setPendingActivity(null);
    setRelationToRemove(null);

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
    setPendingActivity(null);
    setRelationToRemove(null);
  };

  const startAssignment = (activity: TipoActividad) => {
    setDuracion(60);
    setPrecio("70.00");
    setPendingActivity(activity);
  };

  const confirmAssignment = async () => {
    if (!espacioSel?.id || !pendingActivity?.id) return;

    try {
      const created = await ea.create({
        espacio: espacioSel.id,
        tipo: pendingActivity.id,
        duracion_minutos: Math.max(1, Number(duracion) || 1),
        precio_base: precio || "0",
        activo: true,
      });

      setToast({ open: true, message: "Actividad asignada al espacio.", type: "success" });
      setRelaciones((current) => upsertRelation(current, created));
      setPendingActivity(null);
      const refreshed = await refreshRelaciones(espacioSel.id);
      if (!refreshed.some((relation) => relation.id === created.id)) {
        setRelaciones((current) => upsertRelation(current, created));
      }
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
        <SpaceActivityList
          spaces={espaciosFiltrados}
          activities={actividadesList}
          loading={espacios.loading}
          query={spaceQuery}
          onQueryChange={setSpaceQuery}
          onRefresh={() => void espacios.list({ page: "1", page_size: "200" })}
          onOpenGraph={(space) => void openGraph(space)}
        />
      ) : (
        espacioSel && (
          <div style={{ position: "relative" }}>
            <SpaceActivityGraph
              space={espacioSel}
              activities={actividadesFiltradas}
              relations={relaciones}
              loading={isBusy}
              activityQuery={activityQuery}
              onActivityQueryChange={setActivityQuery}
              onBack={backToList}
              onRefresh={() => void refreshRelaciones()}
              onAssignActivity={startAssignment}
              onAlreadyAssigned={() => setToast({ open: true, message: "Esta actividad ya esta asignada al espacio.", type: "info" })}
              onRemoveRelation={setRelationToRemove}
            />
            <RemoveActivityAssignmentModal
              space={espacioSel}
              relation={relationToRemove}
              loading={ea.loading}
              onClose={() => setRelationToRemove(null)}
              onConfirm={() => void confirmRemoveRelation()}
            />
          </div>
        )
      )}

      {anyError && (
        <div style={{ color: "#ff5252", fontSize: 13 }}>
          {getErrorMessage(new Error(anyError), "No se pudo completar la operacion.")}
        </div>
      )}

      <AssignActivityModal
        space={espacioSel}
        activity={pendingActivity}
        duration={duracion}
        price={precio}
        loading={ea.loading}
        onDurationChange={setDuracion}
        onPriceChange={setPrecio}
        onClose={() => setPendingActivity(null)}
        onConfirm={() => void confirmAssignment()}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
