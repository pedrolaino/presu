import path from "node:path";
import PDFDocument from "pdfkit";
import type { businesses, quoteVersions } from "@/db/schema";
import { todayInArgentina } from "@/domain/dates";
import { formatQuoteNumber } from "@/domain/share";
import { computeTotals } from "@/domain/totals";
import { formatDate } from "@/lib/labels";
import { formatMoney, formatPercent, formatQuantity } from "@/lib/numbers";

type Business = typeof businesses.$inferSelect;
type Version = typeof quoteVersions.$inferSelect;

const MARGIN = 48;
// Same palette and typefaces as the app (see globals.css).
const INK = "#22271f";
const MUTED = "#5c6156";
const LINE = "#e6ddce";
const GREEN = "#1f5135";
const FONTS = path.join(process.cwd(), "src/server/fonts");

// The built-in PDF fonts only cover Latin-1; swap the few characters outside it.
const latin1 = (s: string) =>
  s
    .replace(/[−–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x00-\xff]/g, "?");

export function renderQuotePdf(
  business: Business,
  number: number,
  version: Version,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    info: { Title: `Presupuesto ${formatQuoteNumber(number)}` },
  });
  doc.registerFont("Body", path.join(FONTS, "Figtree-Regular.ttf"));
  doc.registerFont("Body-Bold", path.join(FONTS, "Figtree-SemiBold.ttf"));
  doc.registerFont("Display", path.join(FONTS, "Fraunces-SemiBold.ttf"));
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on("end", () => resolve(Buffer.concat(chunks))),
  );

  const width = doc.page.width - MARGIN * 2;
  const money = (cents: number) => latin1(formatMoney(cents, version.currency));
  const text = (s: string, opts: PDFKit.Mixins.TextOptions = {}) => doc.text(latin1(s), opts);

  // Header: logo and business on the left, quote number on the right.
  const top = doc.y;
  let left = MARGIN;
  if (business.logo) {
    doc.image(business.logo, MARGIN, top, { fit: [72, 72] });
    left += 84;
  }
  doc.font("Body-Bold").fontSize(14).fillColor(INK);
  doc.text(latin1(business.name), left, top, { width: width / 2 });
  doc.font("Body").fontSize(9).fillColor(MUTED);
  for (const line of [
    business.address,
    business.phone,
    business.email,
    business.taxId && `CUIT ${business.taxId}`,
  ]) {
    if (line) doc.text(latin1(line), { width: width / 2 });
  }
  const headerBottom = Math.max(doc.y, top + (business.logo ? 72 : 0));

  doc.font("Display").fontSize(20).fillColor(INK);
  doc.text(`Presupuesto ${formatQuoteNumber(number)}`, MARGIN, top, { width, align: "right" });
  doc.font("Body").fontSize(9).fillColor(MUTED);
  doc.text(`Versión ${version.version}`, { width, align: "right" });
  doc.text(`Fecha: ${formatDate(todayInArgentina(version.sentAt ?? version.createdAt))}`, {
    width,
    align: "right",
  });
  doc.text(`Válido hasta: ${formatDate(version.validUntil)}`, { width, align: "right" });

  // Client
  doc.y = Math.max(doc.y, headerBottom) + 24;
  doc.font("Body-Bold").fontSize(9).fillColor(MUTED);
  doc.text("Para", MARGIN);
  doc.font("Body-Bold").fontSize(11).fillColor(INK);
  text(version.client.name);
  doc.font("Body").fontSize(9).fillColor(MUTED);
  for (const line of [version.client.address, version.client.phone, version.client.email])
    if (line) text(line);

  // Items
  const totals = computeTotals({
    lines: version.items,
    discount: version.discount,
    vatMode: version.vatMode,
  });
  const showVat = version.vatMode === "added";
  const cols = showVat
    ? [
        { label: "Descripción", w: 0.4, align: "left" as const },
        { label: "Cantidad", w: 0.14, align: "right" as const },
        { label: "Precio unit.", w: 0.17, align: "right" as const },
        { label: "IVA", w: 0.1, align: "right" as const },
        { label: "Subtotal", w: 0.19, align: "right" as const },
      ]
    : [
        { label: "Descripción", w: 0.46, align: "left" as const },
        { label: "Cantidad", w: 0.15, align: "right" as const },
        { label: "Precio unit.", w: 0.19, align: "right" as const },
        { label: "Subtotal", w: 0.2, align: "right" as const },
      ];

  const row = (cells: string[], bold = false) => {
    if (doc.y > doc.page.height - MARGIN - 60) doc.addPage();
    const y = doc.y;
    let x = MARGIN;
    let bottom = y;
    doc
      .font(bold ? "Body-Bold" : "Body")
      .fontSize(9)
      .fillColor(bold ? MUTED : INK);
    cells.forEach((cell, i) => {
      const w = cols[i].w * width;
      doc.text(latin1(cell), x + 4, y, { width: w - 8, align: cols[i].align });
      bottom = Math.max(bottom, doc.y);
      x += w;
    });
    doc.y = bottom + 6;
    doc
      .moveTo(MARGIN, doc.y - 3)
      .lineTo(MARGIN + width, doc.y - 3)
      .strokeColor(LINE)
      .lineWidth(0.5)
      .stroke();
  };

  doc.y += 20;
  row(
    cols.map((c) => c.label),
    true,
  );
  version.items.forEach((item, i) => {
    const cells = [
      item.name,
      `${formatQuantity(item.quantityHundredths)} ${item.unit}`,
      money(item.unitPriceCents),
      ...(showVat ? [formatPercent(item.vatRateBps)] : []),
      money(totals.lineSubtotals[i]),
    ];
    row(cells);
  });

  // Totals
  doc.y += 8;
  const totalLine = (label: string, value: string, bold = false) => {
    if (doc.y > doc.page.height - MARGIN - 40) doc.addPage();
    const y = doc.y;
    doc
      .font(bold ? "Display" : "Body")
      .fontSize(bold ? 16 : 10)
      .fillColor(bold ? GREEN : INK);
    doc.text(latin1(label), MARGIN + width * 0.5, y, { width: width * 0.3, align: "right" });
    doc.text(latin1(value), MARGIN + width * 0.8, y, { width: width * 0.2, align: "right" });
    doc.y += 4;
  };
  totalLine("Subtotal", money(totals.subtotalCents));
  if (totals.discountCents > 0) {
    const pct =
      version.discount?.kind === "percent" ? ` (${formatPercent(version.discount.bps)})` : "";
    totalLine(`Descuento${pct}`, `-${money(totals.discountCents)}`);
  }
  for (const g of totals.vatBreakdown)
    totalLine(`IVA ${formatPercent(g.rateBps)}`, money(g.vatCents));
  totalLine("Total", money(totals.totalCents), true);
  if (version.vatMode === "included") {
    doc.font("Body").fontSize(9).fillColor(MUTED);
    doc.text("Los precios incluyen IVA.", MARGIN, doc.y, { width, align: "right" });
  }

  for (const [title, body] of [
    ["Notas", version.notes],
    ["Condiciones", version.terms],
  ] as const) {
    if (!body) continue;
    doc.y += 16;
    doc.font("Body-Bold").fontSize(10).fillColor(INK);
    doc.text(title, MARGIN, doc.y, { width });
    doc.font("Body").fontSize(9).fillColor(INK);
    text(body, { width });
  }

  doc.end();
  return done;
}
