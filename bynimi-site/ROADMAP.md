# Bags by Nimi: Website Rebuild Roadmap

The plan for rebuilding [bynimiie.com](https://bynimiie.com) as a modern, interactive
store. We build it in stages; each stage ends with something live you can click
through on a preview link before we move on.

---

## Where we're starting from

What the current site (Bumpa, "Vogue" theme) has, and what we must keep or fix:

| Keep | Fix |
|---|---|
| 27 products / 79 variants, ₦ base price + USD/GBP/CAD/EUR | Parent prices wrong on several products (e.g. Dahlia shows ₦9,750, real price ₦35,500; charms show $0.00) |
| Collections: *Most Loved*, *The Suede Velvet Edit* | The Dahlia Mini is split over 13 separate listings → should be **one product with swatches** |
| WELCOME10 code, free shipping for first 5 UK orders, same/next-day dispatch | Pop-up says 20% off, banner says 10% |
| Pre-orders via Instagram/WhatsApp, loyalty points, 8 testimonials | Exchange rates set by hand (₦1,000 = $1 = C$1) |
| Instagram @by.nimiie, TikTok @bagsbynimi, WhatsApp | Meta pixel loaded 3×; thin SEO (description is just the shop name) |

The full product export (as of 18 Oct 2026) is in [`data/products.csv`](data/products.csv).

---

## The interactive effects (from the reference reel) and where each one goes

| Effect | Where it lives on the new site | Mobile version |
|---|---|---|
| **Hover water effect**: image ripples under the cursor | Home hero: the Dahlia Mini on a dark backdrop, rippling as you move | Ripples follow your finger; a slow idle ripple runs on its own |
| **Spiral gallery**: images on a twisting 3D ribbon | Home: *Most Loved* / *Suede Velvet Edit* carousel | Swipe to spin |
| **Smooth image trail**: bag photos spill out behind the cursor | Lookbook / campaign page ("move your cursor") | Trail follows your finger while dragging |
| **Hanging card**: draggable object on a string with physics | **The Charm Bar**: the cherry, bear and cat charms dangle and swing; drag them, tap to add to cart. Also the gift card | Same, with touch drag |
| **Interactive box grid**: grid of tiles that lifts and colours under the cursor | Background of the newsletter "Join the Inner Circle" section, using a monogram tile | Tiles react to scroll position |
| **ASCII pixels**: image redrawn as characters | Loading screen and the About page header (bag drawn in type) | Same, at lower resolution |
| **Runaround text wrap**: text flows around a moving object | About / brand story page: copy wraps around a slowly rotating bag | Static wrap around the image |

Rules for all effects: they are **decoration, not navigation**. Every page must still
work and read well with effects off. We respect the phone's "reduce motion" setting,
and on slow connections or older phones we fall back to still images. Most of your
customers are on phones and mobile data, so this matters.

---

## Recommended stack

| Part | Choice | Why |
|---|---|---|
| Framework | **Next.js** (React) + TypeScript | Fast pages, good SEO, same tech the current Bumpa storefront uses |
| Styling | **Tailwind CSS** | Quick to build a consistent design system |
| Animation | **GSAP** + **Framer Motion** | Scroll animations, page transitions |
| 3D / WebGL | **Three.js** (via React Three Fiber) | Water ripple, spiral gallery, ASCII effect |
| Physics | **Matter.js** | Hanging charms |
| Products, stock, orders | **Supabase** (Postgres database + admin login + image storage) | You own the data; simple admin; generous free tier |
| Payments | **Paystack** | Nigerian; takes Naira cards, bank transfer and USSD, plus international Visa/Mastercard. Flutterwave is the alternative |
| Email | **Resend** | Order confirmations, shipping updates |
| Hosting | **Vercel** | Free to start, preview link for every change |

*Alternative:* keep **Bumpa as the back office** (where you already manage stock and orders) and
build only the new front end on top of it. That's faster, but you depend on Bumpa's
unofficial storefront API and its checkout. *(Decided: Supabase. See Decisions below.)*

---

## The stages

Each stage lists **what we build**, **what I need from you**, and **done means**.

### Stage 0: Foundations (decisions + setup)
**Build**
- Next.js project in `bynimi-site/`, deployed to a Vercel preview URL
- Design system: colours, fonts, spacing, buttons, product card. A one-page style guide you approve
- Product data: import all 27 products into the database, merging the 13 Dahlia listings into one product with colour/finish swatches and fixing the wrong prices
- Page shell: header, menu, footer, page transitions, loading screen

**I need from you**
- ~~The decisions at the end of this file~~ (done)
- Logo files, brand fonts if any, and the **best product and lifestyle photos** (the original high-res files, not Instagram downloads)
- 2–3 websites you love the look of (any industry)

**Done means:** you can open the preview link and see the site shell, style guide and every product's data correct.

### Stage 1: Home page
**Build**
- Hero with **water ripple** effect on the hero bag + headline + "Shop now"
- Announcement bar (dispatch times, WELCOME10, UK free shipping)
- **Spiral gallery** of *Most Loved* / *Suede Velvet Edit*
- "Latest products" grid with hover image swap and quick-add
- Testimonials carousel (the 8 existing reviews)
- Newsletter / Inner Circle section on the **interactive box grid**
- Instagram/TikTok strip, footer

**Done means:** home page is complete on phone and desktop, runs smoothly on a mid-range Android phone, and scores 90+ on Lighthouse performance.

### Stage 2: Shop and product pages
**Build**
- Shop page: all products, filter by collection / material / colour / price / in stock, sort, smooth filtering animation
- Collection pages (`/collections/most-loved`, etc.)
- Product page: image gallery with zoom, **colour and finish swatches** that change the photo, live stock ("Only 1 left"), measurements, size-on-body photo, "Notify me" for sold-out colours, **pre-order button** for unavailable items (replaces DM-only pre-orders), related products / "complete the look" (charm + scarf)
- Search
- Currency switcher (₦ / $ / £ / € / C$)

**Done means:** a customer can find any bag, pick a colour, see the right price and stock, and add it to the cart.

### Stage 3: Cart, checkout and payments
**Build**
- Slide-out cart, edit quantities, add-on suggestions (charms, scarves)
- Checkout: contact → delivery → payment, guest checkout plus optional account
- Shipping rules: Lagos same/next day, rest of Nigeria, UK (first 5 orders free), international
- **Paystack** payments: card, bank transfer, USSD; USD/GBP charged for overseas customers
- Discount codes (WELCOME10 etc.), and **one** consistent first-order offer
- Pre-order checkout (pay now or deposit, ships later)
- Order confirmation page + email; WhatsApp/email alert to you for every new order
- Stock is reserved during checkout and reduced after payment, so nothing oversells

**Done means:** we place real test orders in Naira and in pounds, the money arrives in Paystack test mode, stock goes down, and both you and the customer get confirmations.

### Stage 4: Brand and content pages
**Build**
- **The Charm Bar**: hanging, draggable charms (physics)
- About / Our story: **ASCII** header + **runaround text** wrapped around a rotating bag
- Lookbook / campaign page with **image trail**
- Shipping & returns, FAQ, care guide, contact (WhatsApp button), loyalty programme page
- Gift cards

**Done means:** every page from the current site exists (or has a better replacement), plus the new interactive ones.

### Stage 5: Back office for running the shop
**Build**
- Admin login (only you / your team)
- Add/edit products, photos, variants, prices, stock, collections
- Orders: view, mark as dispatched (customer gets tracking email), refunds
- Pre-orders and back-in-stock waiting lists, with one-click "email everyone it's back"
- Discount codes, homepage banner text, exchange rates
- Simple sales dashboard (revenue, best sellers, low stock)

**Done means:** you can run a normal week of the business without touching code or Bumpa.

### Stage 6: Polish, speed, SEO, testing
- Image optimisation, lazy-loaded effects, mobile-data testing
- Accessibility (keyboard, screen readers, contrast, reduced motion)
- SEO: proper titles and descriptions, product rich results (price/stock in Google), sitemap, Open Graph images for sharing on WhatsApp/Instagram
- Analytics: one Meta pixel (deduplicated) + Conversions API, Google Analytics, TikTok pixel
- Automated tests for checkout; cross-browser checks (iPhone Safari, Android Chrome)

**Done means:** Lighthouse 90+ on every page, a full checkout tested on real phones, nothing missing compared with the old site.

### Stage 7: Launch
- Move to live Paystack keys; final real order
- Point bynimiie.com at the new site; redirects from every old Bumpa product URL so links in Instagram bios and old posts still work
- Uptime and error monitoring
- Announce: Instagram/TikTok launch content (screen recordings of the effects are great content)

**Done means:** the new site is live on bynimiie.com, taking real orders.

### After launch (ideas)
Reviews with photos, customer accounts with loyalty points, "build your bag" (bag + charm + scarf bundle), WhatsApp order updates, a waitlist for drops ("Exclusive drops. Early access").

---

## How we'll work together

1. At the start of each stage I confirm the list for that stage with you.
2. I build it on the `claude/bynimiie-analysis-pajuq1` branch and send you a **preview link**.
3. You click through on your phone and tell me what to change.
4. When you're happy, we tick the stage off here and move on.

## Progress

- [ ] Stage 0: Foundations (built; waiting on the items below)
  - [x] Next.js project, design tokens for both themes, fonts, site shell, page transitions
  - [x] Product data imported and cleaned: 27 Bumpa listings → 13 products, 79 variants, 6 collections
  - [x] Supabase schema + seed, tested on Postgres 16 (re-runnable, public read-only)
  - [x] Shop, collection and product pages with finish/colour picker; style guide at `/style-guide`
  - [ ] Vercel account + preview link (you: import the repo, root directory `bynimi-site`)
  - [x] Supabase project created, schema + products loaded, site reading from it live
  - [ ] Nimi approves the style guide
  - [x] Loading screen (built in Stage 1 as the ASCII intro)
- [x] Stage 1: Home page (live 19 Oct 2026)
  - [x] First-visit **ASCII intro** (once per session, skippable, never on reduced motion)
  - [x] Hero with the **water ripple** over the campaign photo (touch/mouse, gentle idle drops)
  - [x] **Spiral gallery**: one rising ring of 12 Dahlia colours, drag/swipe to spin
  - [x] Latest products, Suede Velvet Edit, **testimonials** marquee (the 8 real reviews)
  - [x] **Inner Circle** sign-up on the **interactive box grid**, saving to Supabase (insert-only, private list)
  - [x] Follow @by.nimiie strip
  - [x] PageSpeed Insights on the live site (mobile): **performance 94**, accessibility 96–100, best practices 100, SEO 100
  - Moved: "quick add" on product cards needs the bag, so it ships with Stage 3. A live Instagram feed needs Meta access, so for now it's a link strip
- [x] Stage 2: Shop and product pages (live 22 Oct 2026)
  - [x] Links open a product on a chosen finish/colour (`?finish=…&colour=…`); spiral cards, the Suede Velvet Edit and finish collections use them; picking options updates the address bar for sharing
  - [x] **Regional prices** (agreed 19 Oct): ₦35,500 shows as ₦35,499 in Nigeria and 34.99 in $, £, € and C$ (thousands of naira, rounded down, less a cent). Currency picked from the visitor's country, changeable in the header, remembered; no flash of the wrong price
  - [x] Shop filters (type, colour family, finish, price cap, in stock) with live counts, search, sort; cards show and open the matching colour; filters live in the URL and survive back/forward
  - [x] Product page: hover zoom and a full-screen photo viewer (swipe, arrows, pinch-zoom)
  - [x] Sold-out colours: **pre-order** (name, WhatsApp, quantity, note; Nimi confirms on WhatsApp) or **notify me**, saved privately to Supabase
  - [x] "Chat with Nimi on WhatsApp" with the bag and colour pre-typed; "Complete the look" pairings
  - [x] `stock_requests` table created in Supabase
  - [ ] Email Nimi when a pre-order arrives (needs the email key, see Stage 3)
  - Note for Stage 3: Paystack charges in naira (USD only with a Zenith dom account), so a £34.99 order is charged as its naira equivalent at the day's rate and the checkout says so
- [x] Stage 3: Cart, checkout and payments (live 25 Oct 2026; test order paid through Paystack test mode)
  - [x] Bag in the browser: slide-out drawer, quantities capped at stock, "Add to bag" on product pages
  - [x] Checkout: contact, country, all 23 of Nimi's delivery zones and fees, address, discount codes (WELCOME10, first orders only), live totals in the visitor's currency
  - [x] Paystack hosted payment (card, bank transfer, USSD) in Naira; overseas totals converted at the day's rate and shown before paying
  - [x] Stock reserved at checkout, released after 30 minutes unpaid; payment confirmed on return and by webhook, recorded once; underpayments and late payments flagged for Nimi
  - [x] UK launch offer: free delivery on the first 5 UK orders, counted down automatically
  - [x] Order confirmation page; customer receipt and new-order alert to Nimi (sent once the email key is set)
  - [x] Secret keys in Vercel, webhook set, orders migration run, test order paid
  - [ ] Optional: Resend account + key for emails (and verify bynimiie.com in Resend at launch)
  - [ ] Later: "quick add" on product cards
- [ ] Stage 4: Brand and content pages
- [ ] Stage 5: Back office
- [ ] Stage 6: Polish, speed, SEO, testing
- [ ] Stage 7: Launch

## Questions for Nimi (found while importing the data)

1. **First-order offer:** the old banner said 10% (WELCOME10), the pop-up said 20%. The new site uses 10% only. Correct?
2. ~~**Exchange rates**~~ Decided 19 Oct: regional prices instead (₦35,499 / 34.99 in $, £, €, C$). Exchange rates are only needed at checkout, to charge foreign prices in naira
3. **Colour names:** the Classic Smooth Dahlia has both *Pink* and *Baby Pink*, and *Green* and *Olive Green*. Are these really different colours?
4. **Photos needed first**, because these variants are in stock but have no photo of their own (Bumpa's links are dead or missing):
   Dahlia Classic Smooth **Black** (2 in stock) and **Pastel Blue** (1), and the Asooke Alissa in **Black, Brown, Purple, Sanyan** (1 each).
   Also the Textured Pebble Dahlia in Black (sold out).
5. **Most Loved** in Bumpa only contains the Dahlia. Which other pieces belong there?

## Decisions (agreed 18 Oct 2026)

1. **Back office:** our own, on **Supabase**. Bumpa is retired at launch.
2. **Payments:** **Paystack**. A new business account will be set up; we build against test keys until it's verified.
3. **Look and feel:** **mixed, by page.** Dark and dramatic for the home page, Lookbook, Charm Bar and About; light and soft for the shop, product pages, cart and checkout, where clarity sells.
4. **Owner:** the site is built **for Nimi**. Before Stages 3 and 7 we need Nimi's access to the Paystack account, the bynimiie.com domain, and Meta/Instagram.
5. **Photos and logo:** coming later. Until then we use the current product photos from the live store as placeholders.
