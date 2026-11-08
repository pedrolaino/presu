import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { auth } from "./auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/");
  return session.user;
}

/** The signed-in user's business. Every data access takes its id from here, never from the client. */
export const requireBusiness = cache(async () => {
  const user = await requireUser();
  const business = await db.query.businesses.findFirst({ where: eq(businesses.userId, user.id) });
  if (!business) redirect("/onboarding");
  return { user, business };
});

export async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
