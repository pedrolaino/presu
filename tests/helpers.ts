import { db } from "@/db";
import { businesses, user } from "@/db/schema";

export async function createBusiness(name = "Negocio de prueba") {
  const userId = crypto.randomUUID();
  await db.insert(user).values({ id: userId, name, email: `${userId}@example.com` });
  const [business] = await db.insert(businesses).values({ userId, name }).returning();
  return business;
}
