import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Button from "../../../components/ui/Button";
import DateInput from "../../../components/ui/DateInput";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import Toast from "../../../components/ui/Toast";
import type { Cliente } from "../../../models/cliente";
import inventoryService from "../../../services/inventory.service";
import reservasService from "../../../services/reservas.service";
import logoUrl from "../../../assets/sas_noback.png";
import { formatBolivianos } from "../../../utils/currency";
import { getErrorMessage } from "../../../utils/error";
import type { SalesNoteLine, SalesNotePrintSize } from "../types/salesNote";
import {
  downloadSalesNotePdf,
  emptyManualLine,
  linesFromProductSales,
  linesFromReservations,
  printSalesNote,
  salesNoteLineTotal,
  salesNoteTotal,
} from "../utils/salesNote";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };

const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

const lineEditorStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const lineControlsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
  gap: 10,
  alignItems: "end",
};

const inputFillStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

const lineTotalStyle: CSSProperties = {
  minHeight: 63,
  display: "grid",
  alignContent: "end",
  gap: 8,
  minWidth: 0,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function clientName(cliente: Cliente): string {
  return `${cliente.nombre ?? ""} ${cliente.apellido ?? ""}`.trim() || cliente.username || "Cliente";
}

function sourceLabel(line: SalesNoteLine): string {
  if (line.source === "reserva") return "Reserva";
  if (line.source === "producto") return "Producto";
  return "Manual";
}

export default function SalesNoteModal({ cliente, canEdit = false, onClose }: { cliente: Cliente; canEdit?: boolean; onClose: () => void }) {
  const [date, setDate] = useState(today());
  const [lines, setLines] = useState<SalesNoteLine[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const total = useMemo(() => salesNoteTotal(lines), [lines]);
  const canConfirm = lines.length > 0 && lines.every((line) => line.description.trim() && Number(line.quantity) > 0 && Number(line.unitPrice) >= 0);

  const load = async () => {
    setLoading(true);
    setConfirmed(false);
    try {
      const [reservasRes, salesRes] = await Promise.all([
        reservasService.list({ page: "1", page_size: "100", cliente: cliente.id, desde: date, hasta: date }),
        inventoryService.listProductSales({ page: "1", page_size: "500", cliente: cliente.id, ordering: "-created_at" }),
      ]);
      const nextLines = [
        ...linesFromReservations(reservasRes.results ?? []),
        ...linesFromProductSales(salesRes.results ?? [], date),
      ];
      setLines(nextLines);
      if (nextLines.length === 0) {
        setToast({ open: true, message: "No se encontraron reservas ni ventas para esa fecha.", type: "info" });
      }
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo cargar la nota de venta."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id, date]);

  const updateLine = (lineId: string, patch: Partial<SalesNoteLine>) => {
    if (!canEdit) return;
    setConfirmed(false);
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
  };

  const removeLine = (lineId: string) => {
    if (!canEdit) return;
    setConfirmed(false);
    setLines((current) => current.filter((line) => line.id !== lineId));
  };

  const addManualLine = () => {
    if (!canEdit) return;
    setConfirmed(false);
    setLines((current) => [...current, emptyManualLine()]);
  };

  const print = (size: SalesNotePrintSize) => {
    if (!confirmed) {
      setToast({ open: true, message: "Confirma la nota antes de imprimir.", type: "info" });
      return;
    }
    const opened = printSalesNote({ cliente, date, lines, size, logoUrl });
    if (!opened) {
      setToast({ open: true, message: "El navegador bloqueo la ventana de impresion.", type: "error" });
    }
  };

  const downloadPdf = async (size: SalesNotePrintSize) => {
    if (!confirmed) {
      setToast({ open: true, message: "Confirma la nota antes de descargar el PDF.", type: "info" });
      return;
    }

    setDownloading(true);
    try {
      await downloadSalesNotePdf({ cliente, date, lines, size, logoUrl });
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo descargar el PDF."), type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  return (
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
        aria-labelledby="sales-note-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(1120px, 100%)",
          maxHeight: "90vh",
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
            <h2 id="sales-note-title" style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>
              Nota de venta
            </h2>
            <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
              {clientName(cliente)} - reservas y ventas del dia seleccionado.
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={panelStyle}>
              <img src={logoUrl} alt="Logo" style={{ width: 120, maxHeight: 82, objectFit: "contain", display: "block", marginBottom: 10 }} />
              <div style={{ fontWeight: 950 }}>{clientName(cliente)}</div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                Documento: {cliente.documento || "-"}
              </div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 2 }}>
                Telefono: {cliente.telefono || "-"}
              </div>
            </div>

            <DateInput label="Fecha de la nota" value={date} onChange={(event) => setDate(event.target.value)} />

            <div style={{ ...panelStyle, display: "grid", gap: 8 }}>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Resumen</div>
              <strong style={{ fontSize: 24, color: "#ffd24a" }}>{formatBolivianos(total)}</strong>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{lines.length} lineas en la nota</div>
              <div style={{ color: confirmed ? "#8ee59f" : "#ffb4b4", fontSize: 12, fontWeight: 900 }}>
                {confirmed ? "Nota confirmada" : "Pendiente de confirmacion"}
              </div>
            </div>

            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader label="Cargando..." /> : "Recargar datos"}
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={addManualLine} disabled={loading}>
                + Item manual
              </Button>
            )}
            <Button onClick={() => setConfirmed(true)} disabled={!canConfirm || loading} fullWidth>
              Confirmar nota
            </Button>

            <div style={{ ...panelStyle, display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 950 }}>Salida de la nota</div>
              {[
                { size: "page" as const, label: "Hoja por pagina" },
                { size: "roll" as const, label: "Rollo" },
              ].map((option) => (
                <div key={option.size} style={{ display: "grid", gap: 6 }}>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 900 }}>{option.label}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <Button variant="outline" onClick={() => print(option.size)} disabled={!confirmed}>
                      Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => void downloadPdf(option.size)} disabled={!confirmed || downloading}>
                      {downloading ? <Loader label="PDF..." /> : "Descargar PDF"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {loading && <Loader label="Cargando consumos..." />}
            <div style={{ ...panelStyle, display: "grid", gap: 10 }}>
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 800 }}>
                {canEdit
                  ? "La edicion de estas lineas aplica solo a esta nota de venta; no modifica reservas ni ventas registradas."
                  : "Permiso de solo lectura: puedes revisar, confirmar, imprimir o descargar la nota; no modificar sus items."}
              </div>
              {lines.map((line) => (
                <div key={line.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "#0f1420", padding: 12 }}>
                  <div style={lineEditorStyle}>
                    <Input
                      label={`${sourceLabel(line)} / Detalle`}
                      value={line.description}
                      style={inputFillStyle}
                      disabled={!canEdit}
                      onChange={(event) => updateLine(line.id, { description: event.target.value })}
                    />
                    <div style={lineControlsStyle}>
                      <Input
                        label="Cantidad"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.quantity}
                        style={inputFillStyle}
                        disabled={!canEdit}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                      />
                      <Input
                        label="Precio unit."
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        style={inputFillStyle}
                        disabled={!canEdit}
                        onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                      />
                      <div style={lineTotalStyle}>
                        <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Total</div>
                        <strong style={{ color: "#ffd24a", whiteSpace: "nowrap" }}>{formatBolivianos(salesNoteLineTotal(line))}</strong>
                      </div>
                      {canEdit && (
                        <Button variant="danger" size="sm" onClick={() => removeLine(line.id)} style={{ width: "100%" }}>
                          Quitar
                        </Button>
                      )}
                    </div>
                  </div>
                  {line.reference && (
                    <div style={{ color: "var(--color-text-muted)", fontSize: 11, marginTop: 8 }}>
                      Ref: {line.reference}
                    </div>
                  )}
                </div>
              ))}

              {!loading && lines.length === 0 && (
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                  No hay consumos para esta fecha. Puedes agregar un item manual si corresponde.
                </div>
              )}
            </div>
          </div>
        </div>

        <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((state) => ({ ...state, open: false }))} />
      </section>
    </div>
  );
}
