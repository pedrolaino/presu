<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-white.svg">
    <img src="docs/images/logo.svg" alt="Presu" height="72">
  </picture>
</h1>

Presu is a quoting app for tradespeople and freelancers in Argentina. Build quotes from your price list, share a link on WhatsApp, and see when someone opens or accepts the quote.

[![CI](https://github.com/pedrolaino/presu/actions/workflows/ci.yml/badge.svg)](https://github.com/pedrolaino/presu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**[Live demo](https://presu-pedrolaino.vercel.app)**. Click "Probar con datos de ejemplo" to try Presu with sample data. You can start without signing up.

![Quote detail with the accepted version, sharing options and history](docs/images/quote.png)

## Why

If you make quotes by hand and send them as PDFs over WhatsApp, it can be hard to tell whether the client opened the file or which version they agreed to. Inflation can make prices go stale while you're waiting for a reply. Presu records the first time someone other than the owner opens the link and keeps the version the client accepted. If a quote expires, you can update it with current catalog prices before you send it again.

## Features

- Build quotes with items from your catalog or custom items. Presu supports decimal quantities (2,5 m²), fixed or percentage discounts, and three VAT modes. A quote can be in ARS or USD.
- Sequential numbers per business (#0001, #0002...), safe under concurrent creation
- Clients can open the public quote link on their phones without signing in. They enter their name to accept and can optionally give a reason when declining.
- Presu marks the quote as "Viewed" the first time someone other than the owner opens the link.
- Sharing by copying the link, opening WhatsApp with a message, or sending the PDF from the phone's share menu
- Editing a sent version creates a revision and shows what changed. Presu locks accepted quotes for editing.
- When a quote expires, preview the changes at current catalog prices before reactivating it.
- Catalog with categories, VAT rates and bulk price increases with a preview
- PDFs rendered on the server, with the business logo
- Dashboard with acceptance rate, average response time, quotes expiring this week and accepted amounts per month by currency
- Guest accounts come with sample data. They expire after 24 hours, and the cleanup job deletes them afterward.

<p align="center">
  <img src="docs/images/client-phone.png" alt="The public quote page as the client sees it on a phone" width="320">
</p>

![Quote list with every status](docs/images/quotes.png)

## Tech stack

| Area       | Choice                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Framework  | Next.js (App Router, server components and server actions), TypeScript in strict mode             |
| Database   | Postgres: Neon in production, local Postgres in development and CI; `postgres.js` driver for both |
| ORM        | Drizzle, with versioned SQL migrations in [`drizzle/`](drizzle)                                   |
| Auth       | Better Auth: Google sign-in, anonymous guest accounts, sessions stored in Postgres                |
| Validation | Zod, on the server only                                                                           |
| PDF        | pdfkit with embedded fonts (no headless browser)                                                  |
| Images     | sharp, to validate and resize logos                                                               |
| Tests      | Vitest (unit and integration against Postgres), Playwright (desktop and mobile)                   |
| Hosting    | Vercel Hobby, Neon free tier                                                                      |

## Architecture

```mermaid
flowchart LR
  subgraph Browser
    Owner[Owner app]
    Client[Client on the public link]
  end
  subgraph Next.js on Vercel
    Proxy[proxy.ts<br/>CSP nonce]
    Pages[Server components]
    Actions[Server actions<br/>and route handlers]
    Data[src/server/data<br/>queries scoped by business]
    Domain[src/domain<br/>pure business rules]
  end
  DB[(Postgres)]

  Owner --> Proxy --> Pages
  Client --> Proxy
  Pages --> Data
  Actions --> Data
  Data --> Domain
  Actions --> Domain
  Data --> DB
```

### Business rules

Totals, rounding, status transitions, version diffs, repricing, bulk price increases and metrics live in [`src/domain`](src/domain). These modules have no dependencies on Next.js or the database. They take the current time and randomness as inputs so tests can run deterministically. The editor uses the same rules to show totals as you type, and the server recalculates them when you save.

### Money

Amounts are stored as cents in `bigint` columns, quantities as hundredths (2,5 becomes 250) and VAT rates as basis points (21 % becomes 2100). Every division rounds half up to the cent, once per line, once for a percent discount and once per VAT rate. The discount is applied before VAT and split across rates with the largest-remainder method, so the per-rate bases always add up. Intermediate products use `BigInt`, and anything that would exceed `Number.MAX_SAFE_INTEGER` is rejected instead of silently losing precision. Formatting with `Intl.NumberFormat("es-AR")` happens only in the presentation layer.

### Quote states

Sending a `draft` moves it to `sent`. Opening the public link can mark it `viewed`. A client can respond to an open quote in either `sent` or `viewed` state, moving it to `accepted` or `rejected`. Invalid transitions throw. When the app reads a `sent` or `viewed` quote, it displays `expired` if the validity date has passed in Argentina.

### Versions

Each version stores a JSON snapshot of the client and items, plus the computed total. Presu updates unsent versions in place and creates a new revision when you edit a sent one. The public link shows the latest sent version. The client's response includes the version they saw, so Presu can reject responses from an older page after a new revision is sent. Accepted quotes are locked for editing and can be duplicated.

### Numbering

Each business has a `next_quote_number` that is incremented with `UPDATE ... RETURNING` inside the transaction that creates the quote. The row lock serializes concurrent creations, and a unique constraint on `(business_id, number)` backs it up. An integration test creates 25 quotes in parallel and checks the numbers are exactly 1 to 25.

### Data access

Data functions take the business ID as their first argument and use it to scope queries. The app gets that ID from the session. Malformed IDs are ignored. Integration tests check that one business cannot read or change another business's clients, catalog or quotes.

### Share links

Each public link contains a random 192-bit token. You can revoke the link and generate a new one. The browser sends a separate request to mark a quote as "Viewed", so link previews in chat apps do not count as views.

### Rate limits

Rate limiting uses a fixed-window counter in Postgres, updated with a single upsert, so there is no external service to run. It covers guest account creation, the public page, accepting or rejecting, and PDF generation, which is the most CPU-heavy route.

### Security

A nonce-based Content Security Policy is set in `proxy.ts`, along with `nosniff`, a referrer policy, a permissions policy and HSTS.

Logos are checked by their bytes, not their extension, capped at 200 KB, resized and stored as PNG.

### Configuration

Settings you may want to change (validity days, guest lifetime, rate limits, logo limits) are in [`src/config.ts`](src/config.ts). Colors and sizes are CSS variables at the top of [`src/app/globals.css`](src/app/globals.css).

## Project structure

```
src/
  app/            routes: landing, /app (owner), /p/[token] (client), /privacy
  components/     UI components (forms, quote editor, quote document, status badge)
  domain/         pure business rules and their unit tests
  server/
    data/         database access, always scoped by business
    actions/      server actions called from forms
    pdf.ts        PDF rendering
  db/             Drizzle schema and client
  config.ts       tunable settings
  proxy.ts        CSP nonce
drizzle/          SQL migrations
tests/            integration tests against Postgres
e2e/              Playwright end-to-end tests
```

## Getting started

Requirements: Node 22 and a Postgres database (16 works).

```bash
git clone https://github.com/pedrolaino/presu.git
cd presu
npm install
cp .env.example .env.local
```

Edit `.env.local`:

- `DATABASE_URL`: your local database, for example `postgres://presu:presu@localhost:5432/presu`
- `BETTER_AUTH_SECRET`: any random string of 32 characters or more (`openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: optional locally; without them the Google button is hidden and guest mode still works

Then create the tables and start the app:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000 and click "Probar con datos de ejemplo".

## Tests

```bash
npm test             # unit and integration tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright, desktop and mobile)
npm run lint
npm run typecheck
```

Integration tests apply migrations before running against the database in `.env.test` (`presu_test` by default). The database name must contain `test`. End-to-end tests use guest accounts and require no Google credentials.

CI runs lint, format check, typecheck, unit and integration tests, the production build and the end-to-end tests on every pull request, with a Postgres service container.

## Deploy

Production runs on Vercel (Hobby) with a Neon database (free tier).

1. Create a Neon project and copy the pooled connection string.
2. Import the repository in Vercel. `vercel.json` skips deployments for `feature/**`, `fix/**`, `refactor/**` and `docs/**` branches.
3. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the public URL, no trailing slash), `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for the Production environment.
4. In the Google OAuth client, add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI.

The production build runs the migrations before `next build`. Functions run in `iad1`, next to the database; change `regions` in `vercel.json` if your database lives elsewhere.

## License

[MIT](LICENSE)
