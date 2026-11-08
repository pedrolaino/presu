import type { Db } from "@/db";
import { businesses } from "@/db/schema";

/** Fills a fresh guest account with a believable business. */
export async function seedDemo(db: Db, userId: string, now: Date) {
  void now;
  await db.insert(businesses).values({
    userId,
    name: "Gómez Electricidad",
    phone: "+54 9 11 4567-2390",
    email: "martin.gomez.electricidad@example.com",
    address: "Av. Rivadavia 5120, Caballito, CABA",
    taxId: "20-28456123-7",
    defaultTerms:
      "Forma de pago: 50 % de anticipo y saldo al terminar el trabajo.\nLos materiales se compran con el anticipo.",
    defaultValidityDays: 15,
  });
}
