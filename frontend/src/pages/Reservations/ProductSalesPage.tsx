import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import { useClientes } from "../../hooks/useClientes";
import { useAuth } from "../../hooks/useAuth";
import { hasModule } from "../../models/modules";
import type { Cliente } from "../../models/cliente";
import type { InventoryItem } from "../../models/inventory";
import { PATHS } from "../../router/paths";
import inventoryService from "../../services/inventory.service";
import { cashRound, isWholeQuantity } from "../../utils/currency";
import { getErrorMessage } from "../../utils/error";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };
type SaleCartLine = {
  item: InventoryItem;
  quantity: string;
  unitPrice: string;
};

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

const helperPanelStyle: CSSProperties = {
  ...panelStyle,
  borderColor: "rgba(255,210,74,0.28)",
  background: "rgba(255,210,74,0.06)",
};

function money(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return `Bs ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function clientName(cliente: Cliente): string {
  return `${cliente.nombre ?? ""} ${cliente.apellido ?? ""}`.trim() || cliente.username || "Cliente";
}

function itemSearchText(item: InventoryItem): string {
  return `${item.nombre} ${item.sku ?? ""} ${item.descripcion ?? ""}`.toLowerCase();
}

function lineTotal(line: SaleCartLine): number {
  return Number(line.quantity || 0) * Number(line.unitPrice || 0);
}

export default function ProductSalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const clientes = useClientes();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [availableProductQuery, setAvailableProductQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [cartLines, setCartLines] = useState<SaleCartLine[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [received, setReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const clients = useMemo(() => clientes.data?.results ?? [], [clientes.data?.results]);
  const selectedClient = useMemo(() => clients.find((cliente) => cliente.id === clienteId) ?? null, [clients, clienteId]);
  const filteredItems = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => itemSearchText(item).includes(q));
  }, [items, productQuery]);
  const modalFilteredItems = useMemo(() => {
    const q = availableProductQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => itemSearchText(item).includes(q));
  }, [availableProductQuery, items]);
  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 8);
    return clients.filter((cliente) =>
      `${cliente.username} ${cliente.email} ${cliente.nombre} ${cliente.apellido} ${cliente.telefono} ${cliente.documento}`
        .toLowerCase()
        .includes(q)
    ).slice(0, 8);
  }, [clients, clientQuery]);
  const cartTotal = useMemo(() => cartLines.reduce((sum, line) => sum + lineTotal(line), 0), [cartLines]);
  const receivedText = received.trim();
  const parsedReceivedAmount = Number(receivedText);
  const hasValidReceivedAmount = receivedText !== "" && Number.isFinite(parsedReceivedAmount) && parsedReceivedAmount >= 0;
  const receivedAmount = hasValidReceivedAmount ? parsedReceivedAmount : 0;
  const change = Math.max(0, receivedAmount - cartTotal);
  const missing = Math.max(0, cartTotal - receivedAmount);
  const paymentCoversTotal = hasValidReceivedAmount && cartTotal > 0 && receivedAmount >= cartTotal;
  const stock = Number(selectedItem?.stock_actual ?? 0);
  const cartStockIssue = cartLines.find((line) => Number(line.quantity) > Number(line.item.stock_actual));
  const hasSelectedClient = Boolean(selectedClient?.id);
  const selectedExistingQuantity = cartLines
    .filter((line) => line.item.id === selectedItem?.id)
    .reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const selectedLineTotal = selectedItem ? Number(quantity || 0) * Number(unitPrice || 0) : 0;
  const canAddSelected = !!selectedItem && isWholeQuantity(quantity) && Number(quantity) > 0 && Number(quantity) + selectedExistingQuantity <= stock && Number(unitPrice) > 0;
  const canSubmit = cartLines.length > 0 && hasSelectedClient && !cartStockIssue && paymentCoversTotal;

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
    setUnitPrice(String(cashRound(selectedItem.precio_venta_sugerido || "0")));
    setProductQuery(selectedItem.nombre);
  }, [selectedItem]);

  useEffect(() => {
    if (selectedClient) setClientQuery(clientName(selectedClient));
  }, [selectedClient]);

  const addSelectedToCart = () => {
    if (!selectedItem) return;
    const nextQuantity = Number(quantity || 0);
    if (!canAddSelected) {
      setToast({ open: true, message: "Cantidad invalida o stock insuficiente para agregar el producto.", type: "error" });
      return;
    }

    setCartLines((current) => {
      const existing = current.find((line) => line.item.id === selectedItem.id);
      if (existing) {
        return current.map((line) =>
          line.item.id === selectedItem.id
            ? { ...line, quantity: String(Number(line.quantity || 0) + nextQuantity) }
            : line
        );
      }
      return [...current, { item: selectedItem, quantity, unitPrice: String(cashRound(selectedItem.precio_venta_sugerido || unitPrice || "0")) }];
    });
    setSelectedItemId("");
    setProductQuery("");
    setQuantity("1");
    setUnitPrice("0");
  };

  const removeCartLine = (itemId: string) => {
    setCartLines((current) => current.filter((line) => line.item.id !== itemId));
  };

  const openProductsModal = () => {
    setAvailableProductQuery("");
    setProductsModalOpen(true);
  };

  const onSubmit = async () => {
    if (!selectedClient) {
      setToast({ open: true, message: "Selecciona un cliente para registrar la venta.", type: "error" });
      return;
    }
    if (!hasValidReceivedAmount) {
      setToast({ open: true, message: "Ingresa el monto recibido para registrar la venta.", type: "error" });
      return;
    }
    if (!paymentCoversTotal) {
      setToast({ open: true, message: "El monto recibido debe cubrir el total de la venta.", type: "error" });
      return;
    }
    if (!canSubmit) return;
    setLoading(true);
    try {
      for (const line of cartLines) {
        await inventoryService.createProductSale({
          item: line.item.id,
          cliente: selectedClient.id,
          cantidad: line.quantity,
          notas: notes.trim() || undefined,
        });
      }
      setQuantity("1");
      setReceived("");
      setNotes("");
      setProductQuery("");
      setSelectedItemId("");
      setCartLines([]);
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
            <Button onClick={openProductsModal} disabled={loading}>
              Productos disponibles
            </Button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div style={panelStyle}><strong>{items.length}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Productos vendibles</div></div>
          <div style={panelStyle}><strong>{money(cartTotal)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Total actual</div></div>
          <div style={panelStyle}><strong>{money(receivedAmount)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Recibido</div></div>
          <div style={panelStyle}><strong style={{ color: missing ? "#ffb4b4" : "#8ee59f" }}>{missing ? money(missing) : money(change)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{missing ? "Falta" : "Cambio"}</div></div>
          <div style={panelStyle}><strong>{cartLines.length}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Productos en lista</div></div>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 18, alignItems: "start" }}>
        <Card title="Nueva venta" subtitle="Selecciona cliente, agrega productos a la lista y registra el cobro.">
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ ...helperPanelStyle, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#ffd24a", fontSize: 12, fontWeight: 950 }}>Cliente</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                  Datos del Cliente
                </div>
              </div>
              <strong style={{ color: selectedClient ? "#8ee59f" : "#ffd24a" }}>
                {selectedClient ? clientName(selectedClient) : "Pendiente"}
              </strong>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) auto", gap: 10, alignItems: "end" }}>
              <Input
                label="Buscar producto"
                placeholder="Nombre, codigo o descripcion..."
                value={productQuery}
                onChange={(event) => {
                  setProductQuery(event.target.value);
                  if (selectedItem && event.target.value !== selectedItem.nombre) setSelectedItemId("");
                }}
              />
              <Button variant="outline" onClick={openProductsModal}>
                Ver disponibles
              </Button>
            </div>

            {!selectedItem && productQuery.trim() && (
              <div style={{ ...panelStyle, display: "grid", gap: 8, maxHeight: 220, overflow: "auto" }}>
                {filteredItems.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      background: "#0f1420",
                      color: "var(--color-text)",
                      padding: 10,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <strong>{item.nombre}</strong>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                       {money(cashRound(item.precio_venta_sugerido))} / stock {Number(item.stock_actual).toFixed(0)}
                    </div>
                  </button>
                ))}
                {filteredItems.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay productos con esa busqueda.</div>}
              </div>
            )}

            {selectedItem && (
              <div style={{ ...panelStyle, display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>Producto seleccionado</div>
                  <strong>{selectedItem.nombre}</strong>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                    {selectedItem.sku || "Sin codigo"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Stock</div>
                   <strong>{stock.toFixed(0)}</strong>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedItemId(""); setProductQuery(""); }}>
                  Cambiar
                </Button>
              </div>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              <Input
                label="Buscar cliente"
                placeholder="Nombre, telefono, documento o email..."
                value={clientQuery}
                onChange={(event) => {
                  setClientQuery(event.target.value);
                  if (selectedClient && event.target.value !== clientName(selectedClient)) setClienteId("");
                }}
              />
              {clientQuery.trim() && !selectedClient && (
                <div style={{ ...panelStyle, display: "grid", gap: 8, maxHeight: 210, overflow: "auto" }}>
                  {filteredClients.map((cliente) => (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => setClienteId(cliente.id)}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        background: "#0f1420",
                        color: "var(--color-text)",
                        padding: 10,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <strong>{clientName(cliente)}</strong>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                        Tel: {cliente.telefono || "-"} / Doc: {cliente.documento || "-"}
                      </div>
                    </button>
                  ))}
                  {filteredClients.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay clientes con esa busqueda.</div>}
                </div>
              )}
              {selectedClient && (
                <div style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>Cliente seleccionado</div>
                    <strong>{clientName(selectedClient)}</strong>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setClienteId(""); setClientQuery(""); }}>
                    Cambiar
                  </Button>
                </div>
              )}
              {!selectedClient && (
                <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
                  Cliente
                </div>
              )}
            </div>

            <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 950 }}>Producto para agregar</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                    Ajusta cantidad y confirma con el boton principal.
                  </div>
                </div>
                <strong style={{ color: "#ffd24a", fontSize: 18 }}>{money(selectedLineTotal)}</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Input label="Cantidad" type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                <Input label="Precio unitario" type="number" min="0.01" step="0.01" value={unitPrice} readOnly disabled />
              </div>
              {!isWholeQuantity(quantity) && <div style={{ color: "#ffb4b4", fontSize: 12 }}>La cantidad vendida debe ser un numero entero de unidades.</div>}

              <Button
                onClick={addSelectedToCart}
                disabled={loading || !canAddSelected}
                fullWidth
                size="lg"
                style={{
                  minHeight: 54,
                  fontSize: 16,
                  fontWeight: 950,
                  boxShadow: canAddSelected ? "0 10px 28px rgba(255,210,74,0.16)" : undefined,
                }}
              >
                {selectedItem ? `Agregar a lista - ${money(selectedLineTotal)}` : "Agregar al carrito"}
              </Button>
            </div>

            <Input
              label="Monto recibido"
              type="number"
              min="0"
              step="0.01"
              value={received}
              onChange={(event) => setReceived(event.target.value)}
              placeholder="Ej: 20"
            />

            <Input label="Notas (opcional)" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ej: venta en reserva, pago efectivo..." />

            {selectedItem && Number(quantity) + selectedExistingQuantity > stock && (
              <div style={{ color: "#fecaca", background: "#3f1111", border: "1px solid #ff5252", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 800 }}>
                Stock insuficiente. Disponible: {stock.toFixed(0)} unidades{selectedExistingQuantity ? `, ya agregadas: ${selectedExistingQuantity.toFixed(0)}.` : "."}
              </div>
            )}

            <div style={{ ...panelStyle, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 950 }}>Lista de productos</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                    Agrega varios productos antes de registrar la venta.
                  </div>
                </div>
                <strong style={{ color: "#ffd24a", whiteSpace: "nowrap" }}>{cartLines.length} item(s)</strong>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {cartLines.map((line) => (
                  <div
                    key={line.item.id}
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      background: "#0f1420",
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto auto auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong>{line.item.nombre}</strong>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 3 }}>
                        {line.item.sku || "Sin codigo"}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Cant.</div>
                      <strong>{Number(line.quantity).toFixed(0)}</strong>
                    </div>
                    <div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Total</div>
                      <strong style={{ color: "#ffd24a" }}>{money(lineTotal(line))}</strong>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => removeCartLine(line.item.id)}>
                      Quitar
                    </Button>
                  </div>
                ))}
                {cartLines.length === 0 && (
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                    Todavia no agregaste productos a la venta.
                  </div>
                )}
              </div>
            </div>

            <div style={{ ...panelStyle, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <span style={{ color: "var(--color-text-muted)", fontSize: 13, fontWeight: 850 }}>Total venta</span>
              <strong style={{ color: "#ffd24a", fontSize: 24 }}>{money(cartTotal)}</strong>
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
              {loading ? <Loader label="Registrando..." /> : selectedClient ? "Registrar venta" : "Cliente"}
            </Button>
          </div>
        </Card>
      </div>

      {productsModalOpen && createPortal(
        <div
          role="presentation"
          onClick={() => setProductsModalOpen(false)}
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
            aria-labelledby="available-products-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(920px, 100%)",
              maxHeight: "88vh",
              overflow: "auto",
              border: "1px solid rgba(255,210,74,0.28)",
              borderRadius: 10,
              background: "var(--color-surface)",
              color: "var(--color-text)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
              padding: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 16 }}>
              <div>
                <h2 id="available-products-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
                  Productos disponibles
                </h2>
                <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
                  Consulta stock, precio y selecciona el producto para la venta.
                </div>
              </div>
              <Button variant="ghost" onClick={() => setProductsModalOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <Input
                label="Buscar producto"
                placeholder="Nombre, codigo o descripcion..."
                value={availableProductQuery}
                onChange={(event) => setAvailableProductQuery(event.target.value)}
              />

              {loading && <Loader label="Cargando productos..." />}
              {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

              <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 560, overflow: "auto" }}>
                {modalFilteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setProductsModalOpen(false);
                    }}
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
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) 0.7fr 0.7fr auto", gap: 12, alignItems: "center" }}>
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
                         <div style={{ fontWeight: 950, color: "#ffd24a" }}>{money(cashRound(item.precio_venta_sugerido))}</div>
                        <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Precio</div>
                      </div>
                      <span
                        style={{
                          border: "1px solid var(--color-border)",
                          borderRadius: 6,
                          color: "var(--color-text)",
                          padding: "8px 10px",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        Elegir
                      </span>
                    </div>
                  </button>
                ))}
                {!loading && modalFilteredItems.length === 0 && (
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay productos consumibles para venta.</div>
                )}
              </div>
            </div>
          </section>
        </div>,
        document.body
      )}

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((state) => ({ ...state, open: false }))} />
    </div>
  );
}
