import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { auth } from "./auth";
import { isExpiredGuest } from "./cleanup";
import { clientIpFrom } from "./ip";

/** The current session; guest accounts past their TTL count as signed out until the purge removes them. */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session && isExpiredGuest(session.user, new Date())) return null;
  return session;
});

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
  return clientIpFrom(await headers(), !!process.env.VERCEL);
}

/** Origin the request came in on, to build links that work wherever the app is deployed. */
export async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
