import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { purgeExpired } from "@/server/cleanup";

// Vercel Cron calls this once a day with `Authorization: Bearer $CRON_SECRET` (see vercel.json).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await purgeExpired(db, new Date()));
}
