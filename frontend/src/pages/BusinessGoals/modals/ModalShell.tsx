import Button from "../../../components/ui/Button";

export default function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div role="presentation" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1200, display: "grid", placeItems: "center", padding: 24, background: "rgba(5,8,15,0.72)", backdropFilter: "blur(3px)" }}>
      <section role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ width: "min(900px, 100%)", maxHeight: "88vh", overflow: "auto", border: "1px solid rgba(255,210,74,0.28)", borderRadius: 10, background: "var(--color-surface)", color: "var(--color-text)", boxShadow: "0 24px 80px rgba(0,0,0,0.45)", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>{title}</h2>
            {subtitle && <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        {children}
      </section>
    </div>
  );
}
