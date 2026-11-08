# Presu

Quotes for Argentine tradespeople and freelancers: build them from your price list, send them as a link over WhatsApp, and see when the client opens and accepts them.

[![CI](https://github.com/pedrolaino/presu/actions/workflows/ci.yml/badge.svg)](https://github.com/pedrolaino/presu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Live demo: [presu-pedrolaino.vercel.app](https://presu-pedrolaino.vercel.app)** — click "Probar con datos de ejemplo" to look around with sample data, no account needed.

![Quote detail with the accepted version, sharing options and history](docs/images/quote.png)

The interface and the PDFs are in Rioplatense Spanish; the code is in English.

## Why

Electricians, carpenters, designers and technicians in Argentina usually send quotes as hand-made PDFs over WhatsApp. That leaves three questions open: did the client open it, are the prices still current with inflation, and which version did they actually agree to? Presu answers all three.

## Features

- **Quotes** with catalog or free-form items, decimal quantities (2,5 m²), a global discount (percent or fixed), three VAT modes and ARS or USD
- **Per-business numbering** (#0001, #0002…) that never repeats, even with simultaneous creations
- **Public link** for the client: mobile-first, no login, accept with a name or reject with an optional reason
- **"Viewed" tracking** the first time someone other than the owner opens the link
- **Share** by copying the link, opening WhatsApp with a message, or sending the PDF through the phone's share sheet
- **Versions**: editing a sent quote creates a new version with a diff; the accepted version is frozen
- **Expiry and reactivation**: expired quotes can be reissued with current catalog prices after previewing the changes
- **Catalog** with categories, VAT rates and bulk price increases with a preview
- **Server-rendered PDFs** with the business logo and the same typography as the app
- **Dashboard** with acceptance rate, average response time, quotes expiring this week and accepted amounts per month by currency
- **Guest mode** that creates a temporary account full of realistic data; it is deleted after 24 hours

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

**Business rules are pure functions.** Everything that decides money or state lives in [`src/domain`](src/domain): totals, rounding, status transitions, version diffs, repricing, bulk increases and metrics. These modules import nothing from Next or the database, and the current time and randomness are passed in, so the tests are deterministic. The UI reuses the same functions to show live totals in the editor, and the server recomputes them on save.

**Money is integers.** Amounts are stored as cents in `bigint` columns, quantities as hundredths (2,5 becomes 250) and VAT rates as basis points (21 % becomes 2100). Every division rounds half up to the cent, once per line, once for a percent discount and once per VAT rate. The discount is applied before VAT and split across rates with the largest-remainder method, so the per-rate bases always add up. Intermediate products use `BigInt`, and anything that would exceed `Number.MAX_SAFE_INTEGER` is rejected instead of silently losing precision. Formatting with `Intl.NumberFormat("es-AR")` happens only in the presentation layer.

**State is stored, expiry is derived.** A quote moves `draft → sent → viewed → accepted | rejected`, and invalid transitions throw. `expired` is never written: it is computed when reading, from the validity date in Argentina time, for quotes that are `sent` or `viewed`.

**Versions are snapshots.** Each version stores its own copy of the client and the items as JSON, plus the computed total. Drafts and versions that were never sent are edited in place; editing a sent version adds a new one. The public link always shows the latest sent version, and an answer from the client names the version on screen, so a stale page cannot accept something the client never saw. Accepted quotes cannot be edited, only duplicated.

**Numbering is a counter row.** Each business has a `next_quote_number` that is incremented with `UPDATE … RETURNING` inside the transaction that creates the quote. The row lock serializes concurrent creations, and a unique constraint on `(business_id, number)` backs it up. An integration test creates 25 quotes in parallel and checks the numbers are exactly 1 to 25.

**Every query is scoped by business.** The business id comes from the session, never from the request. Data functions take it as their first argument and filter by it, malformed ids are ignored, and integration tests check that one business cannot read or change another's clients, catalog or quotes.

**The public link is a 192-bit random token** that can be revoked and regenerated. "Viewed" is recorded by a small request from the browser rather than on page render, so link previews in chat apps do not count as a view.

**Rate limits live in Postgres.** A fixed-window counter is updated with a single upsert, with no external service. It covers guest account creation, the public page, accepting or rejecting, and PDF generation, which is the most CPU-heavy route.

**Security headers.** A nonce-based Content Security Policy is set in `proxy.ts`, along with `nosniff`, a referrer policy, a permissions policy and HSTS. Logos are validated by their bytes, not their extension, capped at 200 KB, resized and stored as PNG.

Settings the owner may want to tune (validity days, guest lifetime, rate limits, logo limits) are in [`src/config.ts`](src/config.ts). Colors and sizes are CSS variables at the top of [`src/app/globals.css`](src/app/globals.css).

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

Integration tests run against the database in `.env.test` (`presu_test` by default) and apply the migrations before starting; they refuse to run against a database whose name does not contain `test`. The end-to-end tests use guest accounts, so they need no Google credentials.

CI runs lint, format check, typecheck, unit and integration tests, the production build and the end-to-end tests on every pull request, with a Postgres service container.

## Deploy

Production runs on Vercel (Hobby) with a Neon database (free tier).

1. Create a Neon project and copy the pooled connection string.
2. Import the repository in Vercel. Only `main` is deployed; work branches are skipped by `vercel.json`.
3. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the public URL, no trailing slash), `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for the Production environment.
4. In the Google OAuth client, add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI.

The production build runs the migrations before `next build`. Functions run in `iad1`, next to the database; change `regions` in `vercel.json` if your database lives elsewhere.

## License

[MIT](LICENSE)
