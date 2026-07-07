import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Select from "../../components/ui/Select";
import Toast from "../../components/ui/Toast";
import { useClientes } from "../../hooks/useClientes";
import { useAuth } from "../../hooks/useAuth";
import { hasModule } from "../../models/modules";
import type { InventoryItem } from "../../models/inventory";
import { PATHS } from "../../router/paths";
import inventoryService from "../../services/inventory.service";
import { getErrorMessage } from "../../utils/error";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

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

export default function ProductSalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientes = useClientes();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [received, setReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const total = Number(quantity || 0) * Number(unitPrice || 0);
  const receivedAmount = Number(received || 0);
  const change = Math.max(0, receivedAmount - total);
  const missing = Math.max(0, total - receivedAmount);
  const stock = Number(selectedItem?.stock_actual ?? 0);
  const canSubmit = !!selectedItem && Number(quantity) > 0 && Number(quantity) <= stock && Number(unitPrice) > 0;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const itemsRes = await inventoryService.listItems({
        page: "1",
        page_size: "200",
        ordering: "nombre",
        tipo: "consumible",
        es_para_venta: "true",
        activo: "true",
      });
      setItems(itemsRes.results ?? []);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar productos para venta."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    clientes.list({ page: "1", page_size: "200" }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    setUnitPrice(selectedItem.precio_venta_sugerido || "0");
  }, [selectedItem]);

  const onSubmit = async () => {
    if (!selectedItem || !canSubmit) return;
    setLoading(true);
    try {
      await inventoryService.createProductSale({
        item: selectedItem.id,
        cliente: clienteId || null,
        cantidad: quantity,
        notas: notes.trim() || undefined,
      });
      setQuantity("1");
      setReceived("");
      setNotes("");
      setToast({ open: true, message: "Venta registrada y stock descontado.", type: "success" });
      await load();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo registrar la venta."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Venta de productos"
        subtitle="Registra ventas de comestibles y descuenta automaticamente el stock."
        rightSlot={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {hasModule(user, "sales_history") && (
              <Button variant="outline" onClick={() => navigate(PATHS.salesHistory)}>Historial ventas</Button>
            )}
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div style={panelStyle}><strong>{items.length}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Productos vendibles</div></div>
          <div style={panelStyle}><strong>{money(total)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Total actual</div></div>
          <div style={panelStyle}><strong>{money(receivedAmount)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Recibido</div></div>
          <div style={panelStyle}><strong style={{ color: missing ? "#ffb4b4" : "#8ee59f" }}>{missing ? money(missing) : money(change)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{missing ? "Falta" : "Cambio"}</div></div>
          <div style={panelStyle}><strong>{selectedItem ? Number(selectedItem.stock_actual).toFixed(2) : "-"}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Stock disponible</div></div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.85fr) minmax(0, 1.15fr)", gap: 18, alignItems: "start" }}>
        <Card title="Nueva venta" subtitle="Solo aparecen items consumibles marcados para venta.">
          <div style={{ display: "grid", gap: 12 }}>
            <Select
              label="Producto"
              options={[
                { label: "Selecciona producto...", value: "" },
                ...items.map((item) => ({
                  label: `${item.nombre} - ${money(item.precio_venta_sugerido)} - stock ${Number(item.stock_actual).toFixed(2)}`,
                  value: item.id,
                })),
              ]}
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
            />

            <Select
              label="Cliente (opcional)"
              options={[
                { label: "Sin cliente asociado", value: "" },
                ...(clientes.data?.results ?? []).map((client) => ({
                  label: `${client.nombre} ${client.apellido}`.trim(),
                  value: client.id,
                })),
              ]}
              value={clienteId}
              onChange={(event) => setClienteId(event.target.value)}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Cantidad" type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              <Input label="Precio unitario" type="number" min="0.01" step="0.01" value={unitPrice} readOnly disabled />
            </div>

            <Input label="Monto recibido" type="number" min="0" step="0.01" value={received} onChange={(event) => setReceived(event.target.value)} placeholder="Ej: 20" />

            <Input label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ej: venta en reserva, pago efectivo..." />

            {selectedItem && Number(quantity) > stock && (
              <div style={{ color: "#fecaca", background: "#3f1111", border: "1px solid #ff5252", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 800 }}>
                Stock insuficiente. Disponible: {stock.toFixed(2)} unidades.
              </div>
            )}

            <div style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 13, fontWeight: 850 }}>Total venta</span>
              <strong style={{ color: "#ffd24a", fontSize: 24 }}>{money(total)}</strong>
            </div>

            <div style={{ ...panelStyle, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Recibido</div>
                <strong>{money(receivedAmount)}</strong>
              </div>
              <div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{missing ? "Falta cobrar" : "Cambio"}</div>
                <strong style={{ color: missing ? "#ffb4b4" : "#8ee59f" }}>{missing ? money(missing) : money(change)}</strong>
              </div>
            </div>

            <Button onClick={() => void onSubmit()} disabled={loading || !canSubmit} fullWidth size="lg">
              {loading ? <Loader label="Registrando..." /> : "Registrar venta"}
            </Button>
          </div>
        </Card>

        <Card title="Productos disponibles" subtitle="Consulta stock y precio antes de vender.">
          {loading && <Loader label="Cargando productos..." />}
          {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

          <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 620, overflow: "auto" }}>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                style={{
                  border: `1px solid ${item.id === selectedItemId ? "rgba(255,210,74,0.55)" : "var(--color-border)"}`,
                  borderRadius: 8,
                  padding: 12,
                  background: item.id === selectedItemId ? "rgba(255,210,74,0.08)" : "#0f1420",
                  color: "var(--color-text)",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 0.8fr 0.8fr", gap: 12, alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{item.nombre}</strong>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                      {item.sku || "Sin codigo"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950 }}>{Number(item.stock_actual).toFixed(2)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Stock</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950, color: "#ffd24a" }}>{money(item.precio_venta_sugerido)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Precio</div>
                  </div>
                </div>
              </button>
            ))}
            {!loading && items.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay productos consumibles para venta.</div>}
          </div>
        </Card>
      </div>

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((state) => ({ ...state, open: false }))} />
    </div>
  );
}
