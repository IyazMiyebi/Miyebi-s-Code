# Halo Energy — Website Architecture, SEO & Implementation Plan

## 1. Sitemap

```
Home (index.html)
├── Solutions (solutions.html)
│   ├── Equipment Solutions (equipment.html)          — includes filterable equipment catalogue
│   ├── Energy Infrastructure Support (infrastructure.html)
│   ├── Industrial Digital Solutions (digital.html)
│   └── Integrated Project Delivery (integrated-delivery.html)
├── Technology & Innovation (technology.html)          — Halo Connect, illustrative dashboard, roadmap
├── Industries (industries.html)                      — #oil-gas #lng #construction #power #facilities #logistics
├── Projects & Use Cases (projects.html)              — illustrative use cases + case-study standard
├── About (about.html)
├── Partners (partners.html)                          — pathways + registration (#register)
├── Request a Solution (contact.html)                 — enquiry / RFQ form
├── Brand Guidelines (brand.html)                     — noindex
└── 404.html
```

Primary navigation: Solutions · Technology · Industries · Projects · About · Partners · [Request a Solution].
Footer: four solution pages, company pages, conversion links (enquiry, equipment RFQ, partner registration).

## 2. Homepage wireframe

| # | Section | Content | Primary action |
|---|---|---|---|
| 1 | Hero (navy, animated network) | Eyebrow · H1 "Engineering Progress. Connecting Intelligence." · supporting line · 4-up division strip | Explore Our Solutions / Partner With Halo |
| 2 | Introduction (mist) | Who we are · schematic equipment visual | About Halo |
| 3 | Four divisions (navy grid) | 2×2 division cards | Each solution page |
| 4 | Physical ↔ digital (teal) | Statement · connection diagram · Halo Connect panel (Track/Monitor/Maintain/Optimise), labelled as a concept | Technology & Innovation |
| 5 | Industries (mist) | 6 sector tiles | Industries anchors |
| 6 | Technology capabilities (deep navy) | 8 capability cards, each badged Available / Partner-enabled / In development / Roadmap | — |
| 7 | Integrated delivery (navy) | 5-step process: Define → Source → Mobilise → Connect → Improve | — |
| 8 | Safety & responsibility (white) | Commitments (not certifications) · pipeline visual | — |
| 9 | Partnerships (mist) | 3 partner pathway cards | Partners |
| 10 | Final CTA | Teal band | Request a Solution / Partner With Halo |

Every solution page follows the same structure: **Problem → Solution → Technology component → Delivery model → Benefits → CTA**.

## 3. Conversion flows

**Equipment enquiry / RFQ**
Equipment page (catalogue → "Enquire") or footer → `contact.html?need=equipment` (Equipment pre-ticked) → industry, project type, requirements, location, duration, contact, documents → validation → submit to CRM → acknowledgement → Halo calls to clarify → proposal.

**Solution enquiry**
Any CTA → `contact.html` (optionally `?need=infrastructure|digital|integrated`) → same form.

**Partner / equipment-owner registration**
Partners page pathway card → `partners.html?type=<type>#register` (type pre-selected) → partner type → company & contact → *equipment owner only:* categories, unit count, operators, maintenance, telematics, fleet details → capability & documents → consent → submit → verification call → onboarding in supplier register.

Form endpoint: set `HALO_CONFIG.formEndpoint` in `assets/js/halo.js`. Until then forms validate and show an honest "Preview only — nothing has been sent" message.

## 4. SEO structure & metadata

| Page | Title | Primary keywords |
|---|---|---|
| Home | Halo Energy \| Technology-Led Energy & Industrial Solutions | energy solutions company Nigeria, industrial equipment and technology |
| Solutions | Solutions \| Equipment, Infrastructure, Digital & Integrated Delivery | industrial project support Nigeria |
| Equipment | Heavy Equipment Supply, Operated Leasing & Fleet Management | excavator hire Nigeria, swamp excavator, amphibious excavator Niger Delta, operated equipment leasing |
| Infrastructure | Energy Infrastructure & Industrial Project Support | site preparation oil and gas, pipeline right of way clearance, earthworks contractor |
| Digital | Industrial IoT, Fleet Management & Asset Intelligence | fleet management software Nigeria, equipment telematics, maintenance management |
| Integrated | Integrated Project Delivery & Multi-Vendor Equipment Management | multi-vendor equipment management, EPC equipment coordination |
| Technology | Technology & Innovation \| Halo Connect Connected Operations | connected operations, asset visibility, predictive maintenance |
| Industries | Industries \| Oil & Gas, LNG, Construction, Power & Industrial | — |
| Projects | Projects & Use Cases | — |
| Partners | Partner With Halo \| Equipment Owners, OEMs, EPCs & Technology Partners | list my excavator for hire, equipment owner partnership |
| Contact | Request a Solution \| Equipment Enquiry & RFQ | equipment RFQ |

Each page has a unique `<title>`, meta description (≤ 160 chars), Open Graph title/description/image and one `<h1>`. Home carries `Organization` JSON-LD (no address or founding date until confirmed).

**Before launch:**
- Replace `https://www.example.com` in `sitemap.xml` and `robots.txt` with the production domain.
- Add `<link rel="canonical">` and absolute `og:url`/`og:image` URLs once the domain is known.
- Add `LocalBusiness` / `PostalAddress` schema when a verified office address exists.
- Register in Google Search Console and Bing Webmaster Tools; submit the sitemap.

**Content plan for organic growth:** insight articles on swamp equipment selection, equipment utilisation benchmarks (once Halo has data), digital inspections for HSE compliance, and guides for equipment owners.

## 5. Implementation plan

### Current build (this repository)
- Static HTML/CSS/JS, no build step, no framework. One stylesheet (`assets/css/halo.css`), one script (`assets/js/halo.js`).
- Shared head/header/footer live in `partials/` and are stamped into pages by `node scripts/sync-partials.mjs`.
- Hostable on any static host (Netlify, Vercel, Cloudflare Pages, S3/CloudFront, GitHub Pages).

### Accessibility (target WCAG 2.2 AA)
- Semantic landmarks, skip link, one `h1` per page, logical heading order.
- Colour tokens chosen for contrast; dedicated ink tokens for mint/amber on light.
- Visible focus rings; all interactive elements keyboard-reachable; mobile menu closes on Escape.
- Forms: visible labels, required markers, inline error messages, status region that receives focus, no colour-only signals.
- Diagrams and illustrations have text alternatives; decorative SVGs are `aria-hidden`.
- Motion: canvas animation and scroll reveals disabled under `prefers-reduced-motion`; canvas pauses off-screen.
- Dashboard concept: values printed beside every bar, status shown by icon + word + colour.

### Performance
- No framework JS; one small script, deferred.
- Inline SVG sprite for icons and illustrations (no icon font, no image requests).
- Google Fonts with `display=swap` and preconnect; consider self-hosting subsets for production.
- Commissioned photography to be served as AVIF/WebP with `srcset` and lazy loading.
- Targets: LCP < 2.5 s on 4G, CLS < 0.1, total page weight < 1 MB before photography.

### Phase-1 digital functionality (next steps)
| Function | Recommended approach |
|---|---|
| Form handling & CRM | HubSpot or Zoho CRM forms API, or a serverless function posting to the CRM; files to secure object storage with expiring links. |
| Secure document submission | Upload to private bucket (S3/Azure Blob) via signed URLs; virus scan; size/type limits (20 MB enforced client-side). |
| Content management | Move to a headless CMS (Sanity, Contentful or Strapi) with Astro/Next.js when non-developers need to edit content. |
| Equipment catalogue | Data from the equipment database (Airtable/Postgres) feeding the catalogue page; add filters by operating weight, terrain and supply type. |
| Supplier registration | Partner form → supplier register in CRM with verification workflow and document expiry reminders. |
| Analytics | Privacy-respecting analytics (Plausible or GA4 with consent banner); track CTA clicks, form starts, submissions and abandonment by step. |
| Future portals | Client portal, fleet dashboard and equipment-owner portal behind authentication — only once real data is connected (see roadmap). |
