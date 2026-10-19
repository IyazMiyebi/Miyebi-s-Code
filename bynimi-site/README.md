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

## Pages so far (Stage 0)

| Path | Theme | What it is |
|---|---|---|
| `/` | noir | Home: layout and content; the interactive effects come in Stage 1 |
| `/shop` | atelier | Every product, grouped by category |
| `/collections/[slug]` | atelier | Most Loved, The Suede Velvet Edit, Mini Bags, Shoulder Bags, Bag Accessories, Asooke Designs |
| `/products/[slug]` | atelier | Product page with finish and colour picker, live stock, gallery |
| `/style-guide` | atelier | Colours, type and components, for Nimi to approve |
| `/charm-bar`, `/lookbook`, `/about` | noir | Placeholders for Stage 4 |

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
- Until Supabase is connected, the site reads `data/catalog.json` through `src/lib/catalog.ts`.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com) (region: closest to Lagos, e.g. `eu-west`), ideally under the business email.
2. In the SQL editor, run `supabase/migrations/20261018000000_catalog.sql`, then `supabase/seed.sql`.
   Both are tested on Postgres 16; the seed is safe to run again (it updates, never duplicates).
3. Share the project URL and anon key; `src/lib/catalog.ts` then switches to reading from Supabase.

Public visitors can only read published products and collections (row level security); all writes go
through the server with the service role key, and the admin login arrives in Stage 5.

## Deploying a preview (Vercel)

1. Sign in to [vercel.com](https://vercel.com) with GitHub and import this repository.
2. Set **Root Directory** to `bynimi-site`. Everything else stays at its default.
3. Every push then gets its own preview link to try on a phone.
