import {
  bigint,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { QuoteStatus } from "../domain/status";
import type { Discount, VatMode } from "../domain/totals";
import type { Currency, VersionItem } from "../domain/versions";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
const at = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => at("created_at").notNull().defaultNow();
const cents = (name: string) => bigint(name, { mode: "number" });

// Tables used by the auth library; column names follow its schema.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: at("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: at("access_token_expires_at"),
  refreshTokenExpiresAt: at("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: at("expires_at").notNull(),
  createdAt: createdAt(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  taxId: text("tax_id").notNull().default(""),
  defaultTerms: text("default_terms").notNull().default(""),
  defaultValidityDays: integer("default_validity_days").notNull().default(15),
  logo: bytea("logo"),
  nextQuoteNumber: integer("next_quote_number").notNull().default(1),
  createdAt: createdAt(),
});

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("clients_business_idx").on(t.businessId)],
);

export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    unit: text("unit").notNull().default("unidad"),
    priceCents: cents("price_cents").notNull(),
    currency: text("currency").$type<Currency>().notNull(),
    vatRateBps: integer("vat_rate_bps").notNull(),
    category: text("category").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("catalog_items_business_idx").on(t.businessId)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    status: text("status").$type<QuoteStatus>().notNull().default("draft"),
    shareToken: text("share_token").unique(),
    firstSentAt: at("first_sent_at"),
    respondedAt: at("responded_at"),
    acceptedVersion: integer("accepted_version"),
    acceptedByName: text("accepted_by_name"),
    rejectionReason: text("rejection_reason"),
    createdAt: createdAt(),
  },
  (t) => [unique("quotes_business_number_unique").on(t.businessId, t.number)],
);

export interface ClientSnapshot {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export const quoteVersions = pgTable(
  "quote_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    client: jsonb("client").$type<ClientSnapshot>().notNull(),
    items: jsonb("items").$type<VersionItem[]>().notNull(),
    discount: jsonb("discount").$type<Discount>(),
    vatMode: text("vat_mode").$type<VatMode>().notNull(),
    currency: text("currency").$type<Currency>().notNull(),
    validUntil: date("valid_until", { mode: "string" }).notNull(),
    notes: text("notes").notNull().default(""),
    terms: text("terms").notNull().default(""),
    totalCents: cents("total_cents").notNull(),
    sentAt: at("sent_at"),
    createdAt: createdAt(),
  },
  (t) => [unique("quote_versions_quote_version_unique").on(t.quoteId, t.version)],
);

export type QuoteEventType =
  "created" | "sent" | "viewed" | "accepted" | "rejected" | "new_version" | "reactivated";

export const quoteEvents = pgTable(
  "quote_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    type: text("type").$type<QuoteEventType>().notNull(),
    version: integer("version"),
    detail: text("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("quote_events_quote_idx").on(t.quoteId)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});
