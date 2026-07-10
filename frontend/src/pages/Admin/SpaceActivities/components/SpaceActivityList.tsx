import type { ChangeEvent } from "react";
import Button from "../../../../components/ui/Button";
import Card from "../../../../components/ui/Card";
import Input from "../../../../components/ui/Input";
import Loader from "../../../../components/ui/Loader";
import type { Espacio } from "../../../../models/espacio";
import type { TipoActividad } from "../../../../models/actividad";
import { badgeStyle, panelStyle } from "../constants";
import { estadoColor } from "../utils/spaceActivityFormatters";

export default function SpaceActivityList({
  spaces,
  activities,
  loading,
  query,
  onQueryChange,
  onRefresh,
  onOpenGraph,
}: {
  spaces: Espacio[];
  activities: TipoActividad[];
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onOpenGraph: (space: Espacio) => void;
}) {
  return (
    <>
      <Card
        title="Designacion de actividades"
        subtitle="Selecciona un espacio para editar sus actividades en un mapa visual."
        rightSlot={
          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span style={badgeStyle}>Espacios: {spaces.length}</span>
          <span style={badgeStyle}>Actividades activas: {activities.length}</span>
        </div>
      </Card>

      <Card title="Espacios" subtitle="Doble click o Editar abre el mapa de asignaciones.">
        <div style={{ display: "grid", gap: 12 }}>
          <Input
            label="Buscar espacio"
            placeholder="Cancha, sede, etiqueta..."
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
          />

          {loading && <Loader label="Cargando espacios..." />}

          <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 650, overflow: "auto" }}>
            {spaces.map((space) => (
              <button
                key={space.id}
                type="button"
                onDoubleClick={() => onOpenGraph(space)}
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
                      onOpenGraph(space);
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </button>
            ))}

            {!loading && spaces.length === 0 && (
              <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No se encontraron espacios.</div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
