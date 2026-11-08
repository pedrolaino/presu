import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  applyBulkIncrease,
  createCatalogItem,
  deleteCatalogItem,
  getCatalogItem,
  listCatalog,
  previewBulkIncrease,
  updateCatalogItem,
} from "@/server/data/catalog";
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  updateClient,
} from "@/server/data/clients";
import { createBusiness } from "./helpers";

let a: { id: string };
let b: { id: string };

beforeAll(async () => {
  a = await createBusiness("A");
  b = await createBusiness("B");
});

const clientData = { name: "Laura Fernández", email: "", phone: "", address: "" };
const itemData = {
  name: "Cable 2,5 mm²",
  description: "",
  unit: "metro",
  priceCents: 125_000,
  currency: "ARS" as const,
  vatRateBps: 2100,
  category: "Materiales",
  active: true,
};

describe("one business cannot reach another's data", () => {
  it("clients", async () => {
    const id = await createClient(db, a.id, clientData);
    expect(await getClient(db, b.id, id)).toBeNull();
    expect(await listClients(db, b.id)).toEqual([]);
    expect(await updateClient(db, b.id, id, { ...clientData, name: "Hackeado" })).toBe(false);
    expect(await deleteClient(db, b.id, id)).toBe(false);
    expect((await getClient(db, a.id, id))?.name).toBe("Laura Fernández");
  });

  it("catalog items and bulk price changes", async () => {
    const id = await createCatalogItem(db, a.id, itemData);
    expect(await getCatalogItem(db, b.id, id)).toBeNull();
    expect(await listCatalog(db, b.id)).toEqual([]);
    expect(await updateCatalogItem(db, b.id, id, { ...itemData, priceCents: 1 })).toBe(false);
    expect(await previewBulkIncrease(db, b.id, { ids: [id] }, 1000)).toEqual([]);
    expect(await applyBulkIncrease(db, b.id, { ids: [id] }, 1000)).toBe(0);
    expect(await applyBulkIncrease(db, b.id, { category: "Materiales" }, 1000)).toBe(0);
    expect(await deleteCatalogItem(db, b.id, id)).toBe(false);
    expect((await getCatalogItem(db, a.id, id))?.priceCents).toBe(125_000);
  });

  it("ignores malformed ids instead of failing", async () => {
    expect(await getClient(db, a.id, "not-a-uuid")).toBeNull();
    expect(await updateCatalogItem(db, a.id, "1 or 1=1", itemData)).toBe(false);
  });
});

describe("bulk increase", () => {
  it("updates only the selected category", async () => {
    const c = await createBusiness("C");
    const cable = await createCatalogItem(db, c.id, itemData);
    const labor = await createCatalogItem(db, c.id, {
      ...itemData,
      name: "Hora",
      category: "Mano de obra",
      priceCents: 999,
    });
    expect(await applyBulkIncrease(db, c.id, { category: "Materiales" }, 1250)).toBe(1);
    expect((await getCatalogItem(db, c.id, cable))?.priceCents).toBe(140_625);
    expect((await getCatalogItem(db, c.id, labor))?.priceCents).toBe(999);
  });
});
