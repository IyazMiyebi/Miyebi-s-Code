# Halo Energy — Brand Identity & Corporate Website

Brand identity and a responsive corporate website for **Halo Energy**, a technology-led energy and industrial solutions company.

> **Engineering Progress. Connecting Intelligence.**
> Physical capability. Digital intelligence. One connected solution.

## What's here

| Path | Contents |
|---|---|
| `index.html` … `contact.html` | 12 site pages plus `brand.html` (visual guidelines, noindex) and `404.html` |
| `assets/css/halo.css` | All styles and design tokens |
| `assets/js/halo.js` | Navigation, hero network animation, reveals, catalogue filter, dashboard tooltips, forms |
| `assets/brand/` | Logo concepts, lock-ups, single-colour mark, favicon, social share image |
| `partials/` | Shared `<head>` additions, header (with SVG icon/illustration sprite) and footer |
| `scripts/sync-partials.mjs` | Stamps the partials into every page |
| `docs/01-brand-strategy.md` | Positioning, audiences, voice, message architecture, Halo Connect, copy bank, claims guardrails |
| `docs/02-identity-guidelines.md` | Logo, colour, type, icons, patterns, photography, applications |
| `docs/03-website-plan.md` | Sitemap, homepage wireframe, conversion flows, SEO, accessibility and implementation plan |
| `docs/04-technology-roadmap.md` | Four-phase technology and digital-product roadmap |

## Run it locally

No build step. Serve the folder with any static server:

```bash
cd halo-energy
python3 -m http.server 8000
# open http://localhost:8000
```

## Editing

- **Header, footer or shared head:** edit the file in `partials/`, then run `node scripts/sync-partials.mjs`. Each page marks the regions with `<!-- header:start -->` / `<!-- header:end -->` (and likewise `head`, `footer`), and sets its active nav item with `<body data-nav="…">`.
- **Icons and schematic illustrations** are `<symbol>`s in `partials/header.html`; use them with `<svg class="icon"><use href="#i-name"/></svg>`.
- **Forms** post to `HALO_CONFIG.formEndpoint` in `assets/js/halo.js`. It is empty for now, so forms validate and then show "Preview only — nothing has been sent". Point it at the CRM or form handler before launch.

## Before launch

1. Connect the forms (`HALO_CONFIG.formEndpoint`) and secure file storage.
2. Replace `https://www.example.com` in `sitemap.xml` and `robots.txt`; add canonical and absolute Open Graph URLs.
3. Add verified details: leadership names and photos, registered address, contact numbers, certifications.
4. Replace the schematic illustrations with commissioned photography (see the identity guidelines).
5. Convert wordmark text in the logo SVGs to outlines for print.

## Content rules

The site deliberately does **not** claim equipment ownership, completed projects, certifications, fleet size, founding year, client relationships or live software. Halo Connect is presented as a product concept with phase labels; the dashboard is marked as illustrative sample data; project pages show illustrative use cases. Keep it that way until evidence exists. See *Claims guardrails* in `docs/01-brand-strategy.md`.
