"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "@/config";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "./auth";
import { purgeExpired } from "./cleanup";
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

  // A daily cron also runs this, so guests expire even when nobody starts a new demo.
  await purgeExpired(db, now);

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
