import Button from "../ui/Button";

export default function GraphZoomToolbar({
  zoom,
  onZoomChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  return (
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
        onClick={() => onZoomChange(Math.max(0.65, Number((zoom - 0.1).toFixed(2))))}
        style={{ width: 40, padding: "8px 0" }}
      >
        -
      </Button>
      <Button variant="outline" size="sm" onClick={() => onZoomChange(1)} style={{ minWidth: 58, padding: "8px 8px" }}>
        {Math.round(zoom * 100)}%
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onZoomChange(Math.min(1.6, Number((zoom + 0.1).toFixed(2))))}
        style={{ width: 40, padding: "8px 0" }}
      >
        +
      </Button>
    </div>
  );
}
