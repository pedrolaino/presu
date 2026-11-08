import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { clients } from "@/db/schema";
import { isUuid, likePattern, optionalEmail, requiredText, text } from "../forms";

export const clientInput = z.object({
  name: requiredText(120, "Poné el nombre del cliente."),
  email: optionalEmail,
  phone: text(40),
  address: text(200),
});
export type ClientInput = z.infer<typeof clientInput>;

const own = (businessId: string, id: string) =>
  and(eq(clients.businessId, businessId), eq(clients.id, id));

export function listClients(db: Db, businessId: string, search = "") {
  const q = likePattern(search.trim());
  return db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.businessId, businessId),
        search.trim()
          ? or(ilike(clients.name, q), ilike(clients.email, q), ilike(clients.phone, q))
          : undefined,
      ),
    )
    .orderBy(asc(clients.name));
}

export async function getClient(db: Db, businessId: string, id: string) {
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(clients).where(own(businessId, id));
  return row ?? null;
}

export async function createClient(db: Db, businessId: string, input: ClientInput) {
  const [row] = await db
    .insert(clients)
    .values({ businessId, ...input })
    .returning({ id: clients.id });
  return row.id;
}

export async function updateClient(db: Db, businessId: string, id: string, input: ClientInput) {
  if (!isUuid(id)) return false;
  const rows = await db
    .update(clients)
    .set(input)
    .where(own(businessId, id))
    .returning({ id: clients.id });
  return rows.length > 0;
}

/** Quotes keep a snapshot of the client, so deleting one never changes a sent quote. */
export async function deleteClient(db: Db, businessId: string, id: string) {
  if (!isUuid(id)) return false;
  const rows = await db.delete(clients).where(own(businessId, id)).returning({ id: clients.id });
  return rows.length > 0;
}
