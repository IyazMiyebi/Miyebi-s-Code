# Bags by Nimi: website

The new [bynimiie.com](https://bynimiie.com). See [ROADMAP.md](ROADMAP.md) for the plan and progress.

Next.js 16 (App Router, Cache Components) · Tailwind CSS 4 · Supabase · Paystack

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
| `/products/[slug]` | atelier | Finish and colour picker, zoomable gallery, add to bag, pre-order / notify me for sold-out colours, complete the look |
| `/checkout`, `/checkout/complete` | atelier | Contact, delivery zone, address, discount code, live totals, Paystack payment and confirmation |
| `/style-guide` | atelier | Colours, type and components, for Nimi to approve |
| `/charm-bar` | noir | Charms and scarves hanging on strings: drag, throw, tap to pick a colour and add to bag |
| `/lookbook` | noir | Campaign photos that trail behind the cursor (or finger), then a grid linking each photo to its bag |
| `/about` | noir | Our story: the campaign photo drawn in type, and the story wrapping around a bag that drifts down the page |
| `/gift-cards`, `/gift-cards/complete` | noir | Buy a gift card (Paystack), with the card hanging on a string; check a balance |
| `/inner-circle` | noir | The loyalty programme and sign-up |
| `/shipping`, `/returns`, `/care`, `/faq`, `/contact` | atelier | Help pages; delivery fees come straight from the delivery zones |

**Placeholder words:** the text on the brand and help pages is a draft written for the build, in
`src/content/pages.ts` (lookbook photos in `src/content/lookbook.ts`). Pages show a "Draft, for Nimi
to edit" tag until `draft` is set to `false` there.

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
4. `supabase/migrations/20261022000000_orders.sql` (once): delivery zones, discount codes, orders
5. `supabase/migrations/20261026000000_gift_cards.sql` (once): gift cards, and paying for orders with them
6. `supabase/seed.sql` (safe to re-run; it updates, never duplicates)

Sign-ups land in `newsletter_subscribers`, and pre-orders / back-in-stock requests in
`stock_requests` (Table Editor in Supabase; set a request's `status` to `contacted` or `fulfilled` as
you go). The public can add rows to both but can't read either.

Public visitors can only read published products and collections (row level security, verified
against the live project). The publishable key is safe in the browser; the **secret / service_role
key must never go in this repo or in a `NEXT_PUBLIC_` variable**.

## Checkout and payments (Stage 3)

The bag lives in the browser; checkout re-prices everything on the server from the database before
charging. Paystack's hosted page takes the payment (card, bank transfer, USSD), always in Naira:
overseas totals are converted at the day's rate (open.er-api.com, falling back to the `currencies`
table).

Stock is reserved when checkout starts and released if payment isn't completed within 30 minutes.
Payment is confirmed twice over: when the customer returns (`/checkout/complete`) and by Paystack's
webhook (`/api/paystack/webhook`), whichever comes first; emails go out once.

**Server-only settings** (Vercel → Environment Variables, type **Secret**, never `NEXT_PUBLIC_`):

| Name | Where to find it |
|---|---|
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key (`sb_secret_…`) |
| `PAYSTACK_SECRET_KEY` | Paystack → Settings → API Keys & Webhooks → Test secret key (`sk_test_…`); the live key at launch |
| `RESEND_API_KEY` | Optional, for order emails: resend.com → API Keys. Without it, emails are skipped |
| `ORDER_NOTIFY_EMAIL` | Optional: where new-order alerts go (default by.nimiie@gmail.com) |

In Paystack, set the **Webhook URL** to `https://<your site>/api/paystack/webhook`.

Orders are in Supabase → Table Editor → `orders` (with `order_items`).

**Gift cards** are paid through the same Paystack account and webhook (references start `GC-`, orders
`BN-`). They're in `gift_cards`, with each use on an order in `gift_card_redemptions`. A card is
spent in the currency it was bought in, over as many orders as it takes; while an order waits for
payment its gift card amount is held, and given back if the order expires. An order a gift card pays
in full skips Paystack. Delivery fees, the UK
launch offer (`free_orders_left`) and discount codes are in `shipping_zones` and `discount_codes`.

## Deploying a preview (Vercel)

1. Sign in to [vercel.com](https://vercel.com) with GitHub and import this repository.
2. Set **Root Directory** to `bynimi-site`. Everything else stays at its default.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (values above) for all environments.
4. Every push then gets its own preview link to try on a phone.
