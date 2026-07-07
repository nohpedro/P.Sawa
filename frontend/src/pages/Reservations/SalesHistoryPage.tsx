import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import type { InventoryProductSale } from "../../models/inventory";
import inventoryService from "../../services/inventory.service";
import { getErrorMessage } from "../../utils/error";

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

function money(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return `Bs ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function saleTime(sale: InventoryProductSale) {
  const date = new Date(sale.created_at);
  return `${date.toLocaleDateString("es-BO")} ${date.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<InventoryProductSale[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryService.listProductSales({ page: "1", page_size: "100", ordering: "-created_at" });
      setSales(res.results ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el historial de ventas."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((sale) =>
      `${sale.item_nombre ?? ""} ${sale.cliente_nombre ?? ""} ${sale.vendido_por_username ?? ""} ${sale.notas ?? ""}`.toLowerCase().includes(q)
    );
  }, [query, sales]);

  const total = useMemo(() => filtered.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0), [filtered]);
  const units = useMemo(() => filtered.reduce((sum, sale) => sum + Number(sale.cantidad ?? 0), 0), [filtered]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Historial de ventas"
        subtitle="Consulta ventas de productos registradas desde caja."
        rightSlot={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div style={panelStyle}><strong>{filtered.length}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Ventas</div></div>
          <div style={panelStyle}><strong>{units.toFixed(2)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Unidades</div></div>
          <div style={panelStyle}><strong>{money(total)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Total vendido</div></div>
        </div>
      </Card>

      <Card title="Ventas" subtitle="Filtra por producto, cliente, vendedor o notas.">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto", gap: 10, alignItems: "end" }}>
            <Input label="Buscar" placeholder="Producto, cliente, vendedor..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <Button variant="outline" onClick={() => setQuery("")} disabled={!query.trim()}>
              Limpiar
            </Button>
          </div>

          {loading && <Loader label="Cargando historial..." />}
          {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

          <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 680, overflow: "auto" }}>
            {filtered.map((sale) => (
              <div key={sale.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12, background: "#0f1420" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) 0.8fr 0.8fr 0.8fr 0.9fr", gap: 12, alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{sale.item_nombre ?? sale.item}</strong>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                      {sale.cliente_nombre || "Sin cliente"} - {saleTime(sale)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950 }}>{Number(sale.cantidad).toFixed(2)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Cantidad</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950 }}>{money(sale.precio_unitario)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Unitario</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950, color: "#ffd24a" }}>{money(sale.total)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Total</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950 }}>{sale.vendido_por_username ?? "-"}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Vendedor</div>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay ventas para mostrar.</div>}
          </div>
        </div>
      </Card>
    </div>
  );
}
