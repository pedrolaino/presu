"use server";

import { and, eq, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "@/config";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "./auth";
import { seedDemo } from "./demo";
import { allowRequest } from "./rate-limit";
import { clientIp, getSession } from "./session";

export async function signInWithGoogle() {
  const res = await auth.api.signInSocial({
    body: { provider: "google", callbackURL: "/app/quotes" },
  });
  if (res.url) redirect(res.url);
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}

export async function startDemo() {
  if (await getSession()) redirect("/app/quotes");

  const now = new Date();
  const ip = await clientIp();
  const allowed =
    (await allowRequest(db, `guest:${ip}`, config.rateLimits.guestPerIp, now)) &&
    (await allowRequest(db, "guest:all", config.rateLimits.guestGlobal, now));
  if (!allowed) redirect("/?demo=limit");

  // No cron: expired guest accounts are removed whenever a new one is created.
  const cutoff = new Date(now.getTime() - config.guestAccountTtlHours * 3600_000);
  await db.delete(user).where(and(eq(user.isAnonymous, true), lt(user.createdAt, cutoff)));

  const res = await auth.api.signInAnonymous({ headers: await headers() });
  if (!res) throw new Error("Could not create guest account");
  await seedDemo(db, res.user.id, now);
  redirect("/app/quotes");
}

export async function deleteAccount(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/");
  if (form.get("confirm") !== "on") redirect("/app/settings?delete=confirm");
  await db.delete(user).where(eq(user.id, session.user.id));
  redirect("/");
}
