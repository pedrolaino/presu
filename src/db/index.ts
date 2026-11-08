import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Reuse the client across hot reloads in dev so connections don't pile up.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };
const sql = globalForDb.sql ?? postgres(url, { max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export type Db = typeof db;
