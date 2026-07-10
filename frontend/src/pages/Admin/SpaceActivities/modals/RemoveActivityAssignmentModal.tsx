import Button from "../../../../components/ui/Button";
import Loader from "../../../../components/ui/Loader";
import type { Espacio } from "../../../../models/espacio";
import type { EspacioActividad } from "../../../../models/actividad";

export default function RemoveActivityAssignmentModal({
  space,
  relation,
  loading,
  onClose,
  onConfirm,
}: {
  space: Espacio | null;
  relation: EspacioActividad | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!relation) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
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
          Se eliminara la relacion entre {space?.nombre ?? "este espacio"} y {relation.tipo_nombre ?? "esta actividad"}.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Button variant="danger" onClick={onConfirm} disabled={loading} fullWidth>
            {loading ? <Loader label="Quitando..." /> : "Quitar actividad"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </section>
    </div>
  );
}
