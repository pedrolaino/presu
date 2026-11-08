import { randomBytes } from "node:crypto";
import type { Db } from "@/db";
import { businesses } from "@/db/schema";
import { addDays, todayInArgentina } from "@/domain/dates";
import { toFixed2 } from "@/lib/numbers";
import { createCatalogItem, type CatalogInput } from "./data/catalog";
import { createClient } from "./data/clients";
import { recordView, respondToQuote } from "./data/public";
import { createQuote, markSent, quoteInput, updateQuote } from "./data/quotes";

const DAY = 86_400_000;

const catalog: (Omit<CatalogInput, "description" | "active"> & { active?: boolean })[] = [
  {
    name: "Visita técnica y diagnóstico",
    unit: "visita",
    priceCents: 3_500_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Mano de obra",
  },
  {
    name: "Hora de oficial electricista",
    unit: "hora",
    priceCents: 2_800_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Mano de obra",
  },
  {
    name: "Instalación de tomacorriente",
    unit: "unidad",
    priceCents: 2_200_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Mano de obra",
  },
  {
    name: "Cambio de tablero eléctrico",
    unit: "unidad",
    priceCents: 18_000_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Mano de obra",
  },
  {
    name: "Puesta a tierra con jabalina",
    unit: "unidad",
    priceCents: 9_500_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Mano de obra",
  },
  {
    name: "Cable unipolar 2,5 mm²",
    unit: "metro",
    priceCents: 125_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Materiales",
  },
  {
    name: "Cable unipolar 4 mm²",
    unit: "metro",
    priceCents: 190_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Materiales",
  },
  {
    name: "Disyuntor diferencial 2x40 A",
    unit: "unidad",
    priceCents: 6_800_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Materiales",
  },
  {
    name: "Térmica bipolar 2x20 A",
    unit: "unidad",
    priceCents: 1_650_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Materiales",
  },
  {
    name: "Panel LED 60x60",
    unit: "unidad",
    priceCents: 4_200_000,
    currency: "ARS",
    vatRateBps: 1050,
    category: "Materiales",
  },
  {
    name: "Medición de puesta a tierra con protocolo",
    unit: "informe",
    priceCents: 15_000,
    currency: "USD",
    vatRateBps: 2100,
    category: "Certificaciones",
  },
  {
    name: "Tubo fluorescente 36 W",
    unit: "unidad",
    priceCents: 450_000,
    currency: "ARS",
    vatRateBps: 2100,
    category: "Materiales",
    active: false,
  },
];

const clients = [
  {
    name: "Laura Fernández",
    email: "laura.fernandez@example.com",
    phone: "+54 9 11 5321-8890",
    address: "Av. Pedro Goyena 1180, Caballito",
  },
  {
    name: "Consorcio Av. Corrientes 4321",
    email: "administracion.corrientes@example.com",
    phone: "+54 11 4862-1100",
    address: "Av. Corrientes 4321, Almagro",
  },
  {
    name: "Panadería La Espiga",
    email: "",
    phone: "+54 9 11 6012-4477",
    address: "Acoyte 455, Caballito",
  },
  {
    name: "Diego Romero",
    email: "diego.romero@example.com",
    phone: "+54 9 11 4498-2213",
    address: "Hortiguera 820, Parque Chacabuco",
  },
  {
    name: "Estudio Contable Ruiz y Asociados",
    email: "contacto.ruiz@example.com",
    phone: "+54 11 4903-5566",
    address: "Av. Rivadavia 4870, piso 3",
  },
  {
    name: "Carolina Sosa",
    email: "",
    phone: "+54 9 11 3877-0912",
    address: "Rojas 230, Caballito",
  },
  {
    name: "Julieta Herrera",
    email: "julieta.herrera@example.com",
    phone: "+54 9 11 2765-4401",
    address: "Senillosa 1420, Boedo",
  },
];

type Line = [name: string, quantity: string, price?: string];

/** Fills a fresh guest account with a believable business, clients, catalog and quotes in every state. */
export async function seedDemo(db: Db, userId: string, now: Date) {
  const [business] = await db
    .insert(businesses)
    .values({
      userId,
      name: "Gómez Electricidad",
      phone: "+54 9 11 4567-2390",
      email: "martin.gomez.electricidad@example.com",
      address: "Av. Rivadavia 5120, Caballito, CABA",
      taxId: "20-28456123-7",
      defaultTerms:
        "Forma de pago: 50 % de anticipo y saldo al terminar el trabajo.\nLos materiales se compran con el anticipo.\nTrabajos con garantía de 6 meses.",
      defaultValidityDays: 15,
    })
    .returning();
  const b = business.id;

  const items = new Map<string, Awaited<ReturnType<typeof createCatalogItem>>>();
  const prices = new Map<string, (typeof catalog)[number]>();
  for (const item of catalog) {
    items.set(
      item.name,
      await createCatalogItem(db, b, { description: "", active: true, ...item }),
    );
    prices.set(item.name, item);
  }
  const clientIds: string[] = [];
  for (const c of clients) clientIds.push(await createClient(db, b, c));

  const at = (days: number, hour = 13) => {
    const d = new Date(now.getTime() - days * DAY);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };
  const input = (
    client: number,
    lines: Line[],
    sentDaysAgo: number,
    extra: Record<string, unknown> = {},
  ) =>
    quoteInput.parse({
      client: { kind: "existing", id: clientIds[client] },
      items: lines.map(([name, quantity, price]) => {
        const item = prices.get(name)!;
        return {
          catalogItemId: items.get(name)!,
          name,
          unit: item.unit,
          quantity,
          unitPrice: price ?? toFixed2(item.priceCents),
          vatRateBps: String(item.vatRateBps),
        };
      }),
      discount: { kind: "none", value: "" },
      vatMode: "added",
      currency: "ARS",
      validUntil: addDays(todayInArgentina(at(sentDaysAgo)), 15),
      notes: "",
      terms: business.defaultTerms,
      ...extra,
    });

  async function quote(
    client: number,
    lines: Line[],
    days: { sent?: number; viewed?: number; answered?: number; created?: number },
    answer?: { accept: string } | { reject: string },
    extra?: Record<string, unknown>,
  ) {
    const created = days.created ?? days.sent ?? 0;
    const q = await createQuote(
      db,
      b,
      input(client, lines, created, extra),
      at(created, 12),
      randomBytes,
    );
    if (days.sent === undefined) return q.id;
    const token = (await markSent(db, b, q.id, at(days.sent)))!;
    if (days.viewed !== undefined) await recordView(db, token, null, at(days.viewed, 21));
    if (answer && days.answered !== undefined) {
      await respondToQuote(
        db,
        token,
        "accept" in answer
          ? { decision: "accept", version: 1, name: answer.accept }
          : { decision: "reject", version: 1, reason: answer.reject },
        at(days.answered, 15),
      );
    }
    return q.id;
  }

  await quote(
    1,
    [
      ["Cambio de tablero eléctrico", "1"],
      ["Disyuntor diferencial 2x40 A", "2"],
      ["Térmica bipolar 2x20 A", "6"],
      ["Hora de oficial electricista", "8"],
    ],
    { sent: 95, viewed: 94, answered: 92 },
    { accept: "Ricardo Méndez (administración)" },
  );
  await quote(
    2,
    [
      ["Panel LED 60x60", "12"],
      ["Cable unipolar 2,5 mm²", "60"],
      ["Hora de oficial electricista", "10"],
    ],
    { sent: 61, viewed: 60, answered: 57 },
    { accept: "Graciela Ponce" },
    { discount: { kind: "percent", value: "5" } },
  );
  await quote(
    3,
    [
      ["Visita técnica y diagnóstico", "1"],
      ["Instalación de tomacorriente", "6"],
      ["Cable unipolar 2,5 mm²", "40"],
    ],
    { sent: 46, viewed: 45, answered: 44 },
    { reject: "Por ahora se me va de presupuesto, lo vemos más adelante." },
  );
  await quote(
    4,
    [["Medición de puesta a tierra con protocolo", "2"]],
    { sent: 41, viewed: 41, answered: 39 },
    { accept: "Mariana Ruiz" },
    { currency: "USD" },
  );

  // Two versions: the client asked for more outlets before accepting.
  const laura = await quote(
    0,
    [
      ["Instalación de tomacorriente", "4"],
      ["Cable unipolar 2,5 mm²", "30"],
    ],
    {
      sent: 25,
      viewed: 24,
    },
  );
  await updateQuote(
    db,
    b,
    laura,
    input(
      0,
      [
        ["Instalación de tomacorriente", "6"],
        ["Cable unipolar 2,5 mm²", "45"],
        ["Térmica bipolar 2x20 A", "1"],
      ],
      22,
    ),
    at(22, 10),
  );
  const lauraToken = (await markSent(db, b, laura, at(22)))!;
  await recordView(db, lauraToken, null, at(21, 20));
  await respondToQuote(
    db,
    lauraToken,
    { decision: "accept", version: 2, name: "Laura Fernández" },
    at(19, 11),
  );

  await quote(
    5,
    [
      ["Puesta a tierra con jabalina", "1"],
      ["Visita técnica y diagnóstico", "1"],
    ],
    { sent: 30, viewed: 28 },
  ); // expired
  await quote(
    3,
    [["Instalación de tomacorriente", "2"]],
    { sent: 4, viewed: 3, answered: 2 },
    { accept: "Diego Romero" },
  );
  await quote(
    6,
    [
      ["Visita técnica y diagnóstico", "1"],
      ["Panel LED 60x60", "4"],
      ["Hora de oficial electricista", "3"],
    ],
    { sent: 12, viewed: 11 },
  ); // viewed, expires in 3 days
  await quote(
    1,
    [
      ["Puesta a tierra con jabalina", "1"],
      ["Cable unipolar 4 mm²", "25"],
    ],
    { sent: 2 },
  );
  await quote(
    2,
    [
      ["Visita técnica y diagnóstico", "1"],
      ["Cable unipolar 2,5 mm²", "15"],
    ],
    { created: 1 },
  );
}
