import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import DateInput from "../../components/ui/DateInput";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Select from "../../components/ui/Select";
import type { InventoryItem, InventoryPurchaseBatch } from "../../models/inventory";
import inventoryService from "../../services/inventory.service";
import { cashRound, formatBolivianos } from "../../utils/currency";
import { endOfMonth, startOfMonth, toYYYYMMDD } from "../../utils/date";
import { getErrorMessage } from "../../utils/error";

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

const rowGrid = "minmax(150px, 0.8fr) minmax(220px, 1.4fr) minmax(120px, 0.7fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr)";

function formatDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function batchSaleTotal(batch: InventoryPurchaseBatch) {
  return numberValue(batch.cantidad) * cashRound(batch.precio_venta_unitario);
}

export default function BatchHistoryPage() {
  const today = useMemo(() => new Date(), []);
  const [batches, setBatches] = useState<InventoryPurchaseBatch[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [fechaDesde, setFechaDesde] = useState(toYYYYMMDD(startOfMonth(today)));
  const [fechaHasta, setFechaHasta] = useState(toYYYYMMDD(endOfMonth(today)));
  const [selectedItem, setSelectedItem] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    setItemsLoading(true);
    try {
      const res = await inventoryService.listItems({ page: "1", page_size: "300", ordering: "nombre" });
      setItems(res.results ?? []);
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  const loadBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: "1",
        page_size: "300",
        ordering: "-fecha_compra,-created_at",
      };
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (selectedItem !== "all") params.item = selectedItem;
      if (query.trim()) params.search = query.trim();
      const res = await inventoryService.listBatches(params);
      setBatches(res.results ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar el historial de lotes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    void loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta, selectedItem]);

  const stats = useMemo(() => {
    const proveedores = new Set<string>();
    return batches.reduce(
      (acc, batch) => {
        acc.totalLotes += 1;
        acc.totalCantidad += numberValue(batch.cantidad);
        acc.totalCosto += numberValue(batch.costo_total);
        acc.ventaEstimada += batchSaleTotal(batch);
        if (batch.proveedor?.trim()) proveedores.add(batch.proveedor.trim().toLowerCase());
        acc.proveedores = proveedores.size;
        return acc;
      },
      { totalLotes: 0, totalCantidad: 0, totalCosto: 0, ventaEstimada: 0, proveedores: 0 }
    );
  }, [batches]);

  const grouped = useMemo(() => {
    return batches.reduce<Record<string, InventoryPurchaseBatch[]>>((acc, batch) => {
      acc[batch.fecha_compra] = [...(acc[batch.fecha_compra] ?? []), batch];
      return acc;
    }, {});
  }, [batches]);

  const itemOptions = useMemo(
    () => [
      { value: "all", label: itemsLoading ? "Cargando items..." : "Todos los items" },
      ...items.map((item) => ({ value: item.id, label: item.nombre })),
    ],
    [items, itemsLoading]
  );

  const resetToCurrentMonth = () => {
    const now = new Date();
    setFechaDesde(toYYYYMMDD(startOfMonth(now)));
    setFechaHasta(toYYYYMMDD(endOfMonth(now)));
  };

  const resetFilters = () => {
    resetToCurrentMonth();
    setSelectedItem("all");
    setQuery("");
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Historial de compras de lotes"
        subtitle="Consulta gastos variables registrados por fecha, item, proveedor o notas."
        rightSlot={
          <Button variant="outline" onClick={() => void loadBatches()} disabled={loading}>
            Refrescar
          </Button>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <div style={panelStyle}>
            <strong>{stats.totalLotes}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Lotes ingresados</div>
          </div>
          <div style={panelStyle}>
            <strong>{stats.totalCantidad.toFixed(0)}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Unidades ingresadas</div>
          </div>
          <div style={panelStyle}>
            <strong style={{ color: "#ffd24a" }}>{formatBolivianos(stats.totalCosto)}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Costo registrado</div>
          </div>
          <div style={panelStyle}>
            <strong>{stats.proveedores}</strong>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Proveedores</div>
          </div>
        </div>
      </Card>

      <Card title="Filtros" subtitle="Selecciona el rango de fechas para revisar los ingresos de lotes.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, alignItems: "end" }}>
          <DateInput label="Desde" value={fechaDesde} onChange={(event) => setFechaDesde(event.target.value)} />
          <DateInput label="Hasta" value={fechaHasta} onChange={(event) => setFechaHasta(event.target.value)} />
          <Select label="Item" value={selectedItem} onChange={(event) => setSelectedItem(event.target.value)} options={itemOptions} />
          <Input
            label="Buscar"
            placeholder="Proveedor, item o notas..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void loadBatches();
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <Button size="sm" onClick={() => void loadBatches()} disabled={loading}>
            Aplicar filtros
          </Button>
          <Button size="sm" variant="outline" onClick={resetToCurrentMonth}>
            Mes actual
          </Button>
          <Button size="sm" variant="outline" onClick={resetFilters}>
            Limpiar
          </Button>
        </div>
      </Card>

      <Card title="Gastos variables por lote" subtitle="Detalle cronologico de compras que se descuentan antes de calcular la ganancia.">
        <div style={{ display: "grid", gap: 12 }}>
          {loading && <Loader label="Cargando historial..." />}
          {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

          <div style={{ ...panelStyle, display: "grid", gap: 12, maxHeight: 720, overflow: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: rowGrid,
                gap: 12,
                color: "var(--color-text-muted)",
                fontSize: 12,
                fontWeight: 950,
                textTransform: "uppercase",
                letterSpacing: 0.3,
                minWidth: 900,
              }}
            >
              <span>Fecha ingreso</span>
              <span>Item / proveedor</span>
              <span>Cantidad</span>
              <span>Costo lote</span>
              <span>Costo unit.</span>
              <span>Registrado por</span>
            </div>

            {Object.entries(grouped).map(([date, rows]) => (
              <div key={date} style={{ display: "grid", gap: 8, minWidth: 900 }}>
                <div style={{ color: "#ffd24a", fontWeight: 950, fontSize: 13 }}>{formatDate(date)}</div>
                {rows.map((batch) => (
                  <article
                    key={batch.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: rowGrid,
                      gap: 12,
                      alignItems: "center",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      background: "#0f1420",
                      padding: 12,
                    }}
                  >
                    <div>
                      <strong>{formatDate(batch.fecha_compra)}</strong>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                        Registro: {formatDateTime(batch.created_at)}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <strong>{batch.item_nombre ?? batch.item}</strong>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                        {batch.proveedor || "Sin proveedor"} {batch.compra_por_mayor ? "- compra por mayor" : ""}
                      </div>
                      {batch.notas && (
                        <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4, whiteSpace: "normal" }}>
                          {batch.notas}
                        </div>
                      )}
                    </div>
                    <div>
                      <strong>{numberValue(batch.cantidad).toFixed(0)}</strong>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Unidades</div>
                    </div>
                    <div>
                      <strong style={{ color: "#ffd24a" }}>{formatBolivianos(batch.costo_total)}</strong>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                        Venta est.: {formatBolivianos(batchSaleTotal(batch))}
                      </div>
                    </div>
                    <div>
                      <strong>{formatBolivianos(batch.costo_unitario)}</strong>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                        Venta unit.: {formatBolivianos(cashRound(batch.precio_venta_unitario))}
                      </div>
                    </div>
                    <div>
                      <strong>{batch.creado_por_username ?? "-"}</strong>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>Usuario</div>
                    </div>
                  </article>
                ))}
              </div>
            ))}

            {!loading && batches.length === 0 && (
              <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                No hay ingresos de lotes para el rango seleccionado.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
