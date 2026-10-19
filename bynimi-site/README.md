# Bags by Nimi: website

The new [bynimiie.com](https://bynimiie.com). See [ROADMAP.md](ROADMAP.md) for the plan and progress.

Next.js 16 (App Router, Cache Components) · Tailwind CSS 4 · Supabase · Paystack (Stage 3)

## Run it locally

```bash
cd bynimi-site
npm install
npm run dev          # http://localhost:3000
```

Other checks: `npm run lint`, `npm run build`.

## Pages so far

| Path | Theme | What it is |
|---|---|---|
| `/` | noir | Home: ASCII intro, water-ripple hero, spiral gallery, testimonials, Inner Circle sign-up on the box grid |
| `/shop` | atelier | Every product, with filters (type, colour, finish, price, in stock), search and sort |
| `/collections/[slug]` | atelier | Most Loved, The Suede Velvet Edit, Mini Bags, Shoulder Bags, Bag Accessories, Asooke Designs |
| `/products/[slug]` | atelier | Finish and colour picker, zoomable gallery, pre-order / notify me for sold-out colours, complete the look |
| `/style-guide` | atelier | Colours, type and components, for Nimi to approve |
| `/charm-bar`, `/lookbook`, `/about` | noir | Placeholders for Stage 4 |

The effects live in `src/components/effects/`. Each one keeps the plain content underneath (the
photo, the form), pauses when off screen, and respects the phone's "reduce motion" setting.

Themes are set per route group: pages in `src/app/(noir)/` are dark, pages in
`src/app/(atelier)/` are light. Colour tokens live in `src/app/globals.css`.

## Product data

```
scripts/import-bumpa.mjs   live Bumpa store  ->  data/bumpa-snapshot.json + data/catalog.json
scripts/catalog-to-sql.mjs data/catalog.json ->  supabase/seed.sql
```

- `node scripts/import-bumpa.mjs` fetches the live store again (Bumpa keeps selling until launch,
  so re-run this before going live). `--offline` rebuilds from the saved snapshot.
- The importer merges the old duplicate listings (13 Dahlia Mini listings become one product with
  Finish and Colour options), takes prices from the variants, drops photo links that no longer
  exist on Bumpa's CDN, and never shows another colour's photo for a variant that has none.

## Supabase

The live project is connected. The site reads the catalog from Supabase when these are set
(locally in `.env.local`, which git ignores; see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xotbgaxdmlofqkywwuio.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Without them it falls back to `data/catalog.json`. The catalog is cached and refreshes at most a
minute after a change in Supabase (`src/lib/catalog.ts`).

To set up a fresh database, run these in the SQL editor, in order:

1. `supabase/migrations/20261018000000_catalog.sql` (once)
2. `supabase/migrations/20261019000000_newsletter.sql` (once): Inner Circle sign-ups
3. `supabase/migrations/20261020000000_stock_requests.sql` (once): pre-orders and "notify me"
4. `supabase/seed.sql` (safe to re-run; it updates, never duplicates)

Sign-ups land in `newsletter_subscribers`, and pre-orders / back-in-stock requests in
`stock_requests` (Table Editor in Supabase; set a request's `status` to `contacted` or `fulfilled` as
you go). The public can add rows to both but can't read either.

Public visitors can only read published products and collections (row level security, verified
against the live project). The publishable key is safe in the browser; the **secret / service_role
key must never go in this repo or in a `NEXT_PUBLIC_` variable**.

## Deploying a preview (Vercel)

1. Sign in to [vercel.com](https://vercel.com) with GitHub and import this repository.
2. Set **Root Directory** to `bynimi-site`. Everything else stays at its default.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (values above) for all environments.
4. Every push then gets its own preview link to try on a phone.
