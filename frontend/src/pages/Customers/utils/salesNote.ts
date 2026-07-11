import type { Cliente } from "../../../models/cliente";
import type { InventoryProductSale } from "../../../models/inventory";
import type { Reserva } from "../../../models/reserva";
import { formatBolivianos } from "../../../utils/currency";
import type { SalesNoteLine, SalesNotePrintPayload, SalesNotePrintSize } from "../types/salesNote";

const sizeNames: Record<SalesNotePrintSize, string> = {
  page: "pagina",
  roll: "rollo",
};

const PAGE_LINE_UNITS = 13;
const CSS_PX_TO_PT = 72 / 96;

function cssPx(value: number): number {
  return value * CSS_PX_TO_PT;
}

function pdfPageSize(payload: SalesNotePrintPayload): { width: number; height: number; margin: number; fontScale: number } {
  if (payload.size === "page") return { width: 612, height: 792, margin: 36, fontScale: 1 };

  const dynamicHeight = 214 + payload.lines.reduce((sum, line) => sum + pdfRollLineHeight(line), 0);
  return { width: 226.77, height: Math.max(340, dynamicHeight), margin: 14, fontScale: 0.78 };
}

function fullName(cliente: Cliente): string {
  return `${cliente.nombre ?? ""} ${cliente.apellido ?? ""}`.trim() || cliente.username || "Cliente";
}

function numberValue(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sameDate(iso: string, date: string): boolean {
  return iso.slice(0, 10) === date;
}

function timeRange(reserva: Reserva): string {
  const start = new Date(reserva.inicio);
  const end = new Date(reserva.fin);
  return `${start.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" })}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textBytes(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) bytes[i] = value.charCodeAt(i) & 0xff;
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function estimateTextRows(value: string | null | undefined, maxChars: number): number {
  const text = (value ?? "").trim();
  if (!text) return 0;
  const words = text.split(/\s+/);
  let rows = 1;
  let current = 0;

  words.forEach((word) => {
    if (word.length > maxChars) {
      if (current > 0) rows += 1;
      rows += Math.max(Math.ceil(word.length / maxChars) - 1, 0);
      current = word.length % maxChars || maxChars;
      return;
    }

    const next = current === 0 ? word.length : current + 1 + word.length;
    if (next > maxChars) {
      rows += 1;
      current = word.length;
    } else {
      current = next;
    }
  });

  return rows;
}

function pdfRollLineHeight(line: SalesNoteLine): number {
  const detailRows = estimateTextRows(line.description, 19);
  const referenceRows = estimateTextRows(line.reference, 19);
  return Math.max(26, 14 + detailRows * 10 + referenceRows * 8);
}

function splitLongCanvasWord(context: CanvasRenderingContext2D, word: string, maxWidth: number): string[] {
  const chunks: string[] = [];
  let current = "";

  Array.from(word).forEach((char) => {
    const next = `${current}${char}`;
    if (current && context.measureText(next).width > maxWidth) {
      chunks.push(current);
      current = char;
      return;
    }
    current = next;
  });

  if (current) chunks.push(current);
  return chunks;
}

function wrapCanvasText(context: CanvasRenderingContext2D, value: string | null | undefined, maxWidth: number): string[] {
  const text = (value ?? "").trim();
  if (!text) return [];
  const rows: string[] = [];
  let current = "";

  text.split(/\s+/).forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }

    if (current) {
      rows.push(current);
      current = "";
    }

    if (context.measureText(word).width <= maxWidth) {
      current = word;
      return;
    }

    const chunks = splitLongCanvasWord(context, word, maxWidth);
    rows.push(...chunks.slice(0, -1));
    current = chunks[chunks.length - 1] ?? "";
  });

  if (current) rows.push(current);
  return rows;
}

function paginatePageLines(lines: SalesNoteLine[]): SalesNoteLine[][] {
  const pages: SalesNoteLine[][] = [];
  let current: SalesNoteLine[] = [];
  let units = 0;

  lines.forEach((line) => {
    const lineUnits = line.reference ? 1.35 : 1;
    if (current.length > 0 && units + lineUnits > PAGE_LINE_UNITS) {
      pages.push(current);
      current = [];
      units = 0;
    }
    current.push(line);
    units += lineUnits;
  });

  if (current.length > 0) pages.push(current);
  return pages.length ? pages : [[]];
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = new URL(url, window.location.origin).href;
  });
}

async function renderSalesNoteAsJpeg(
  payload: SalesNotePrintPayload,
  page: { width: number; height: number; margin: number; fontScale: number },
  options?: { lines?: SalesNoteLine[]; showFooter?: boolean; pageNumber?: number; pageCount?: number },
) {
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;

  const logo = await loadImage(payload.logoUrl);
  const lines = options?.lines ?? payload.lines;
  const total = salesNoteTotal(payload.lines);
  const showFooter = options?.showFooter ?? true;
  const clientName = fullName(payload.cliente);
  const isRoll = payload.size === "roll";
  const margin = page.margin;
  const right = page.width - margin;
  const width = page.width - margin * 2;
  const px = (value: number) => (isRoll ? cssPx(value) : cssPx(value));
  const bodyFont = isRoll ? px(10) : px(12);
  const tableFont = isRoll ? px(9) : px(12);
  const tableLine = tableFont * 1.2;
  const mutedFont = px(11);
  const mutedLine = mutedFont * 1.15;
  const cellPadX = isRoll ? px(2) : px(5);
  const cellPadY = isRoll ? px(5) : px(7);
  const drawRight = (value: string, x: number, textY: number) => {
    context.fillText(value, x - context.measureText(value).width, textY);
  };
  const drawLabelValue = (label: string, value: string, x: number, textY: number, fontSize: number) => {
    context.font = `700 ${fontSize}px Arial`;
    context.fillText(label, x, textY);
    const labelWidth = context.measureText(label).width;
    context.font = `${fontSize}px Arial`;
    context.fillText(value, x + labelWidth + px(3), textY);
  };

  context.scale(scale, scale);
  context.textBaseline = "top";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, page.width, page.height);
  context.strokeStyle = "#111827";
  context.fillStyle = "#111827";
  context.lineWidth = isRoll ? px(2) : 1.5;

  const headerTop = margin;
  const titleSize = isRoll ? px(16) : px(22);
  const titleLine = titleSize * 1.2;
  context.font = `700 ${titleSize}px Arial`;
  context.fillText("Nota de venta", margin, headerTop);

  if (logo) {
    const logoMaxWidth = isRoll ? px(44) : px(78);
    const logoMaxHeight = isRoll ? px(44) : px(78);
    const logoRatio = Math.min(logoMaxWidth / logo.naturalWidth, logoMaxHeight / logo.naturalHeight);
    const logoWidth = logo.naturalWidth * logoRatio;
    const logoHeight = logo.naturalHeight * logoRatio;
    context.drawImage(logo, right - logoWidth, headerTop + (isRoll ? px(-10) : px(-14)), logoWidth, logoHeight);
  }

  let y = headerTop + (isRoll ? Math.max(titleLine, px(44) - px(10)) : Math.max(titleLine, px(78) - px(14))) + px(10);
  context.beginPath();
  context.moveTo(margin, y);
  context.lineTo(right, y);
  context.stroke();

  y += px(12);
  context.fillStyle = "#111827";
  if (isRoll) {
    const metaRows = [
      ["Cliente:", clientName],
      ["Fecha:", payload.date],
      ["Documento:", payload.cliente.documento || "-"],
      ["Telefono:", payload.cliente.telefono || "-"],
    ];
    metaRows.forEach(([label, value], index) => {
      drawLabelValue(label, value, margin, y + index * (bodyFont * 1.2 + px(6)), bodyFont);
    });
    y += metaRows.length * bodyFont * 1.2 + (metaRows.length - 1) * px(6) + px(12);
  } else {
    const rightCol = page.width * 0.55;
    drawLabelValue("Cliente:", clientName, margin, y, bodyFont);
    drawLabelValue("Fecha:", payload.date, rightCol, y, bodyFont);
    drawLabelValue("Documento:", payload.cliente.documento || "-", margin, y + bodyFont * 1.2 + px(6), bodyFont);
    drawLabelValue("Telefono:", payload.cliente.telefono || "-", rightCol, y + bodyFont * 1.2 + px(6), bodyFont);
    y += bodyFont * 2.4 + px(6) + px(12);
  }

  const tableTop = y;
  const colPercents = isRoll ? [0.07, 0.43, 0.14, 0.18, 0.18] : [0.05, 0.55, 0.12, 0.14, 0.14];
  const colLefts = colPercents.reduce<number[]>((lefts, _percent, index) => {
    lefts.push(index === 0 ? margin : lefts[index - 1] + width * colPercents[index - 1]);
    return lefts;
  }, []);
  const colRights = colLefts.map((left, index) => left + width * colPercents[index]);
  const columns = {
    no: colLefts[0] + cellPadX,
    detail: colLefts[1] + cellPadX,
    qty: colRights[2] - cellPadX,
    unit: colRights[3] - cellPadX,
    total: colRights[4] - cellPadX,
  };
  const detailMaxWidth = Math.max(30, colRights[1] - colLefts[1] - cellPadX * 2);
  const headHeight = tableLine + cellPadY * 2;

  context.fillStyle = "#f9fafb";
  context.fillRect(margin, tableTop, width, headHeight);
  context.fillStyle = "#111827";
  context.font = `700 ${tableFont}px Arial`;
  context.fillText("#", columns.no, tableTop + cellPadY);
  context.fillText("Detalle", columns.detail, tableTop + cellPadY);
  drawRight("Cant.", columns.qty, tableTop + cellPadY);
  drawRight("P. unit.", columns.unit, tableTop + cellPadY);
  drawRight("Total", columns.total, tableTop + cellPadY);
  y += headHeight;
  context.strokeStyle = "#e5e7eb";
  context.beginPath();
  context.moveTo(margin, y);
  context.lineTo(right, y);
  context.stroke();

  lines.forEach((line, index) => {
    const rowTop = y;
    const textTop = rowTop + cellPadY;
    context.fillStyle = "#111827";
    context.font = `${tableFont}px Arial`;
    const absoluteIndex = options?.pageNumber && payload.size === "page"
      ? paginatePageLines(payload.lines).slice(0, options.pageNumber - 1).reduce((sum, pageLines) => sum + pageLines.length, 0) + index + 1
      : index + 1;
    context.fillText(String(absoluteIndex), columns.no, textTop);
    context.font = `700 ${tableFont}px Arial`;
    const detailRows = wrapCanvasText(context, line.description, detailMaxWidth);
    detailRows.forEach((text, rowIndex) => {
      context.fillText(text, columns.detail, textTop + rowIndex * tableLine);
    });

    context.font = `${mutedFont}px Arial`;
    const referenceRows = wrapCanvasText(context, line.reference, detailMaxWidth);
    if (referenceRows.length > 0) {
      context.fillStyle = "#6b7280";
      const referenceStart = textTop + detailRows.length * tableLine + px(2);
      referenceRows.forEach((text, rowIndex) => {
        context.fillText(text, columns.detail, referenceStart + rowIndex * mutedLine);
      });
    }

    context.fillStyle = "#111827";
    context.font = `${tableFont}px Arial`;
    drawRight(String(line.quantity), columns.qty, textTop);
    drawRight(formatBolivianos(line.unitPrice), columns.unit, textTop);
    drawRight(formatBolivianos(salesNoteLineTotal(line)), columns.total, textTop);

    const contentHeight = Math.max(
      tableLine,
      detailRows.length * tableLine + referenceRows.length * mutedLine + (referenceRows.length > 0 ? px(2) : 0),
    );
    y += contentHeight + cellPadY * 2;
    context.strokeStyle = "#e5e7eb";
    context.beginPath();
    context.moveTo(margin, y);
    context.lineTo(right, y);
    context.stroke();
  });

  y += px(12);
  context.fillStyle = "#111827";

  if (showFooter) {
    context.font = `800 ${isRoll ? px(12) : px(16)}px Arial`;
    drawRight(`Total: ${formatBolivianos(total)}`, right, y);

    y += (isRoll ? px(12) : px(16)) * 1.2 + px(18);
    context.fillStyle = "#4b5563";
    context.font = `${px(11)}px Arial`;
    context.fillText("Emitido para control interno y entrega al cliente.", margin, y);

    const signatureY = y + (isRoll ? px(11) + px(26) + px(24) : px(11) + px(24));
    context.strokeStyle = "#9ca3af";
    context.beginPath();
    context.moveTo(isRoll ? margin : page.width * 0.52, signatureY);
    context.lineTo(right, signatureY);
    context.stroke();
    context.fillStyle = "#4b5563";
    context.font = `${px(11)}px Arial`;
    const signatureText = "Recibi conforme";
    context.fillText(signatureText, (isRoll ? margin + width / 2 : page.width * 0.68) - context.measureText(signatureText).width / 2, signatureY + px(6));
  } else {
    context.font = `800 ${isRoll ? px(9) : px(12)}px Arial`;
    drawRight(`Continua en la siguiente hoja (${options?.pageNumber ?? 1}/${options?.pageCount ?? 1})`, right, y);
  }

  const base64 = canvas.toDataURL("image/jpeg", 0.98).split(",")[1] ?? "";
  const binary = atob(base64);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) data[i] = binary.charCodeAt(i);
  return { data, width: canvas.width, height: canvas.height };
}

export function salesNoteLineTotal(line: SalesNoteLine): number {
  return numberValue(line.quantity) * numberValue(line.unitPrice);
}

export function salesNoteTotal(lines: SalesNoteLine[]): number {
  return lines.reduce((sum, line) => sum + salesNoteLineTotal(line), 0);
}

export function linesFromReservations(reservas: Reserva[]): SalesNoteLine[] {
  return reservas
    .filter((reserva) => reserva.estado_reserva !== "CANCELADA")
    .map((reserva) => ({
      id: `reserva-${reserva.id}`,
      source: "reserva",
      description: `${reserva.actividad_nombre ?? "Reserva"} - ${reserva.espacio_nombre ?? "Espacio"} (${timeRange(reserva)})`,
      reference: reserva.estado_reserva,
      quantity: "1",
      unitPrice: reserva.monto_estimado ?? "0",
    }));
}

export function linesFromProductSales(sales: InventoryProductSale[], date: string): SalesNoteLine[] {
  return sales
    .filter((sale) => sameDate(sale.created_at, date))
    .map((sale) => ({
      id: `venta-${sale.id}`,
      source: "producto",
      description: sale.item_nombre ?? "Producto",
      reference: sale.notas || sale.vendido_por_username || undefined,
      quantity: sale.cantidad,
      unitPrice: sale.precio_unitario,
    }));
}

export function emptyManualLine(): SalesNoteLine {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source: "manual",
    description: "Item manual",
    quantity: "1",
    unitPrice: "0",
  };
}

export function printSalesNote(payload: SalesNotePrintPayload): boolean {
  const popup = window.open("", "_blank", "width=920,height=720");
  if (!popup) return false;

  const total = salesNoteTotal(payload.lines);
  const clientName = fullName(payload.cliente);
  const absoluteLogoUrl = new URL(payload.logoUrl, window.location.origin).href;
  const isRoll = payload.size === "roll";
  const rollHeightMm = Math.max(120, 82 + payload.lines.length * 12 + payload.lines.filter((line) => line.reference).length * 5);
  const pages = isRoll ? [payload.lines] : paginatePageLines(payload.lines);
  const pageOffsets = pages.reduce<number[]>((offsets, _pageLines, index) => {
    offsets.push(index === 0 ? 0 : offsets[index - 1] + pages[index - 1].length);
    return offsets;
  }, []);
  const colgroup = isRoll
    ? `<colgroup><col style="width: 7%" /><col style="width: 43%" /><col style="width: 14%" /><col style="width: 18%" /><col style="width: 18%" /></colgroup>`
    : `<colgroup><col style="width: 5%" /><col style="width: 55%" /><col style="width: 12%" /><col style="width: 14%" /><col style="width: 14%" /></colgroup>`;
  const renderRows = (lines: SalesNoteLine[], offset: number) => lines.map((line, index) => {
      const totalLine = salesNoteLineTotal(line);
      return `
        <tr>
          <td>${offset + index + 1}</td>
          <td class="detail-cell">
            <strong>${escapeHtml(line.description)}</strong>
            ${line.reference ? `<div class="muted">${escapeHtml(line.reference)}</div>` : ""}
          </td>
          <td class="num">${escapeHtml(line.quantity)}</td>
          <td class="num">${formatBolivianos(line.unitPrice)}</td>
          <td class="num">${formatBolivianos(totalLine)}</td>
        </tr>
      `;
    }).join("");
  const renderSheet = (lines: SalesNoteLine[], pageIndex: number) => {
    const isLastPage = pageIndex === pages.length - 1;
    return `
      <main class="sheet ${payload.size}">
        <section class="header">
          <div>
            <h1>Nota de venta</h1>
          </div>
          <img class="logo" src="${absoluteLogoUrl}" alt="Logo" />
        </section>

        <section class="meta">
          <div><strong>Cliente:</strong> ${escapeHtml(clientName)}</div>
          <div><strong>Fecha:</strong> ${escapeHtml(payload.date)}</div>
          <div><strong>Documento:</strong> ${escapeHtml(payload.cliente.documento || "-")}</div>
          <div><strong>Telefono:</strong> ${escapeHtml(payload.cliente.telefono || "-")}</div>
        </section>

        <table>
          ${colgroup}
          <thead>
            <tr>
              <th>#</th>
              <th>Detalle</th>
              <th class="num">Cant.</th>
              <th class="num">P. unit.</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>${renderRows(lines, pageOffsets[pageIndex] ?? 0)}</tbody>
        </table>

        ${isLastPage ? `<div class="total">Total: ${formatBolivianos(total)}</div>` : `<div class="continued">Continua en la siguiente hoja (${pageIndex + 1}/${pages.length})</div>`}

        ${isLastPage ? `<section class="footer">
          <div>Emitido para control interno y entrega al cliente.</div>
          <div class="signature">Recibi conforme</div>
        </section>` : ""}
      </main>
    `;
  };

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Nota de venta - ${escapeHtml(clientName)}</title>
        <style>
          @page { size: ${isRoll ? `80mm ${rollHeightMm}mm` : "letter"}; margin: ${isRoll ? "0" : "8mm"}; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #f3f4f6; color: #111827; font-family: Arial, sans-serif; }
          .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; gap: 10px; padding: 10px; background: #111827; }
          .toolbar button { border: 0; border-radius: 6px; background: #ffd24a; color: #111827; cursor: pointer; font-weight: 800; padding: 9px 14px; }
          .sheet { background: white; margin: 0 auto; padding: 10mm; min-height: 100vh; }
          .sheet.page { width: 216mm; min-height: 279mm; break-after: page; page-break-after: always; }
          .sheet.page:last-child { break-after: auto; page-break-after: auto; }
          .sheet.roll { width: 80mm; min-height: auto; padding: 5mm; font-size: 10px; }
          .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 10px; }
          .logo { width: 78px; max-height: 78px; object-fit: contain; align-self: flex-start; margin-top: -14px; }
          .roll .logo { width: 44px; max-height: 44px; margin-top: -10px; }
          h1 { margin: 0; font-size: 22px; }
          .roll h1 { font-size: 16px; }
          .muted { color: #6b7280; font-size: 11px; margin-top: 2px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin: 12px 0; font-size: 12px; }
          .roll .meta { grid-template-columns: 1fr; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
          .roll table { font-size: 9px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 7px 5px; vertical-align: top; }
          .roll th, .roll td { padding: 5px 2px; }
          th { text-align: left; background: #f9fafb; }
          .num { text-align: right; white-space: nowrap; }
          .detail-cell { overflow-wrap: anywhere; }
          .total { display: flex; justify-content: flex-end; margin-top: 12px; font-size: 16px; font-weight: 800; }
          .continued { display: flex; justify-content: flex-end; margin-top: 18px; font-size: 12px; font-weight: 800; color: #4b5563; }
          .roll .total { font-size: 12px; }
          .footer { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 11px; color: #4b5563; }
          .roll .footer { grid-template-columns: 1fr; gap: 26px; }
          .signature { border-top: 1px solid #9ca3af; padding-top: 6px; text-align: center; margin-top: 24px; }
          @media print {
            body { background: white; }
            .toolbar { display: none; }
            .sheet { margin: 0; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button type="button" onclick="window.print()">Imprimir</button>
        </div>
        ${pages.map(renderSheet).join("")}
      </body>
    </html>
  `);
  popup.document.close();
  return true;
}

export async function downloadSalesNotePdf(payload: SalesNotePrintPayload): Promise<boolean> {
  const page = pdfPageSize(payload);
  const clientName = fullName(payload.cliente);
  const chunks = payload.size === "page" ? paginatePageLines(payload.lines) : [payload.lines];
  const objects: Uint8Array[] = [
    textBytes("<< /Type /Catalog /Pages 2 0 R >>"),
    textBytes(""),
  ];
  const pageObjectIds: number[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const rendered = await renderSalesNoteAsJpeg(payload, page, {
      lines: chunks[index],
      showFooter: index === chunks.length - 1,
      pageNumber: index + 1,
      pageCount: chunks.length,
    });
    if (!rendered) return false;

    const pageObjectId = objects.length + 1;
    const imageObjectId = pageObjectId + 1;
    const contentObjectId = pageObjectId + 2;
    const content = `q ${page.width} 0 0 ${page.height} 0 0 cm /Im1 Do Q\n`;
    const contentBytes = textBytes(content);
    pageObjectIds.push(pageObjectId);

    objects.push(
      textBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /XObject << /Im1 ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`),
      concatBytes([
        textBytes(`<< /Type /XObject /Subtype /Image /Width ${rendered.width} /Height ${rendered.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${rendered.data.length} >>\nstream\n`),
        rendered.data,
        textBytes("\nendstream"),
      ]),
      concatBytes([
        textBytes(`<< /Length ${contentBytes.length} >>\nstream\n`),
        contentBytes,
        textBytes("\nendstream"),
      ]),
    );
  }

  objects[1] = textBytes(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);

  const parts: Uint8Array[] = [textBytes("%PDF-1.4\n")];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const part = concatBytes([textBytes(`${index + 1} 0 obj\n`), object, textBytes("\nendobj\n")]);
    parts.push(part);
    length += part.length;
  });

  const xrefOffset = length;
  const xrefRows = offsets.map((offset, index) => (index === 0 ? "0000000000 65535 f " : `${String(offset).padStart(10, "0")} 00000 n `)).join("\n");
  parts.push(textBytes(`xref\n0 ${objects.length + 1}\n${xrefRows}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));

  const pdfBytes = concatBytes(parts);
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nota-venta-${clientName.replace(/\s+/g, "-").toLowerCase()}-${payload.date}-${sizeNames[payload.size]}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
