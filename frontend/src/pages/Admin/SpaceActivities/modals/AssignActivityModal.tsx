import { createPortal } from "react-dom";
import type { ChangeEvent } from "react";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";
import Loader from "../../../../components/ui/Loader";
import type { Espacio } from "../../../../models/espacio";
import type { TipoActividad } from "../../../../models/actividad";
import { moneyLike } from "../utils/spaceActivityFormatters";

export default function AssignActivityModal({
  space,
  activity,
  duration,
  price,
  loading,
  onDurationChange,
  onPriceChange,
  onClose,
  onConfirm,
}: {
  space: Espacio | null;
  activity: TipoActividad | null;
  duration: number;
  price: string;
  loading: boolean;
  onDurationChange: (duration: number) => void;
  onPriceChange: (price: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!activity) return null;

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
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
            {space?.nombre} recibira la actividad {activity.nombre}.
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Input
            label="Duracion (min)"
            type="number"
            value={String(duration)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onDurationChange(Number(event.target.value))}
          />
          <Input
            label="Precio base (Bs)"
            value={price}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onPriceChange(moneyLike(event.target.value))}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={onConfirm} disabled={loading} fullWidth>
              {loading ? <Loader label="Asignando..." /> : "Crear asignacion"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
