# Halo Energy — Visual Identity Guidelines

Visual reference: `brand.html` (open it in a browser). Source files: `assets/brand/`.

## 1. Logo

### Concepts
| | Concept | Idea | Verdict |
|---|---|---|---|
| A | **Orbit Node** (`halo-mark.svg`) | Solid core = physical asset. Open orbit = the intelligence around it. Mint node in the opening = the point an asset becomes connected. | **Recommended.** Simplest geometry, legible at 16 px, works as a single-colour stencil, and the node becomes a reusable device. |
| B | **Horizon** (`concept-b-horizon.svg`) | A halo arc rising from a ground line, a pipeline line beneath. Intelligence emerging from infrastructure; a sunrise read. | Strong industrial grounding, but closer to conventional energy imagery. |
| C | **Interlink** (`concept-c-interlink.svg`) | An H whose crossbar is an orbital ellipse with a node: two pillars held together by intelligence. | Distinctive monogram, good on vehicles; more complex and letter-led. |

Avoided by design: oil drops, flames, globes, gears and hexagons.

### Construction (Concept A, 64-unit grid)
- Orbit: radius 22, stroke 5, round caps, open 60° at the upper right (−15° to −75°).
- Node: radius 5, centred on the orbit path at −45°, Signal Mint.
- Core: radius 8, centred.
- Clear space: the core's diameter (16 units) on all sides.
- Minimum size: symbol 16 px / 5 mm; horizontal logo 120 px / 30 mm.

### Lock-ups and files
| File | Use |
|---|---|
| `halo-logo-horizontal.svg` | Default, on light backgrounds |
| `halo-logo-horizontal-reverse.svg` | Default, on navy/teal |
| `halo-logo-stacked.svg` | Narrow spaces, signage, social avatars |
| `halo-mark.svg` / `halo-mark-reverse.svg` | Symbol alone |
| `halo-mark-mono.svg` | Single colour: embroidery, stencils, etching, machinery decals, fax/print |
| `favicon.svg` | Browser tab / app icon |
| `og-image.png` | Social share card (1200×630) |

> Wordmark SVGs use live text in Archivo. Before print production, convert text to outlines in Illustrator/Figma so the files render without the font.

**Wordmark:** HALO in Archivo Bold, ENERGY in Archivo Regular at 72% opacity, both expanded width (120%) and tracked +20%.

### Misuse
Do not close the ring, rotate the mark, move or recolour the node (never amber), add effects, stretch, or place on busy imagery without a navy scrim.

## 2. Colour

| Name | HEX | RGB | Role |
|---|---|---|---|
| Midnight Navy | `#091722` | 9 23 34 | Dominant foundation: backgrounds, primary text on light |
| Deep Teal | `#143E50` | 20 62 80 | Depth, secondary surfaces, gradients |
| Signal Mint | `#5CE0C2` | 92 224 194 | Controlled technology accent: CTAs, nodes, data |
| Mist White | `#E8F0F2` | 232 240 242 | Light surfaces, text on dark |
| Energy Amber | `#F5A65B` | 245 166 91 | Sparing emphasis: energy, safety, "illustrative" flags |

**Proportion:** navy ≈55%, mist ≈22%, teal ≈15%, mint ≈6%, amber ≈2%.

**Accessibility tokens:** Mint and amber do not meet text contrast on light backgrounds. Use **Mint Ink `#0B7A64`** and **Amber Ink `#9A5310`** for text/links on Mist or white. Mint on navy and Mist on navy both pass WCAG AA for body text.

**Print:** confirm Pantone/CMYK matches against a physical swatch book before the first print run. Signal Mint needs a fluorescent-free spot match; avoid printing mint at small sizes on uncoated stock.

## 3. Typography

| Role | Family | Settings |
|---|---|---|
| Display / headings / wordmark | **Archivo** (variable, width axis) | 700, width 108–120%, tracking −2% to −3% |
| Body / UI | **IBM Plex Sans** | 400/500/600, 16–18 px, line-height 1.6 |
| Labels / data / eyebrows | **IBM Plex Mono** | 500, uppercase, tracking +10–12% |

All are open-source (SIL OFL). Office fallback for documents: Arial (headings bold) and Arial/Consolas.

## 4. Iconography

- 24 px grid, 1.6 px stroke, round caps and joins, no fills.
- Subjects drawn simply and literally (excavator, pipeline, tank, pylon, truck, valve).
- Accent-coloured only when used as a single focal icon; otherwise ink colour.
- Source: the `<symbol>` sprite in `partials/header.html`.

## 5. Graphic devices

1. **Engineering grid** — 64 px hairline grid at 6–12% opacity on navy or mist.
2. **Orbit rings** — concentric rings from the symbol, with one mint node. For hero crops and slides.
3. **Network** — nodes and fine connecting lines (the animated hero canvas). Motion must be slow and stop when `prefers-reduced-motion` is set.
4. **Node bullet** — a 6 px mint dot used as a list marker and status indicator.
5. **Schematic illustration** — line drawings of equipment and sites with mint data nodes, captioned "Illustration".

## 6. Photography direction

- Commission real photography of Halo-coordinated equipment, partners and sites; never present stock or other companies' projects as Halo work.
- Low, warm natural light; wide frames that show machinery in its environment (swamp, corridor, laydown, plant).
- People always in correct PPE, working safely; feature Nigerian operators, engineers and technicians.
- Show the "data moment": tablet inspections, telematics units, maintenance sign-off.
- Grade: cool shadows, neutral highlights, so imagery sits on navy.
- Avoid: flames, oil gushers, staged handshakes, generic "AI" imagery, fake dashboard overlays.
- Web delivery: AVIF/WebP, ≤ 250 KB per hero at 1600 px, `loading="lazy"` below the fold, always with alt text.

## 7. Applications

| Item | Specification |
|---|---|
| Business card | 85 × 55 mm. Front: navy, symbol + wordmark, tagline in Plex Mono mint. Back: white, name (Archivo Bold), title, contact in Plex Mono, mint 2 pt rule. |
| Letterhead | A4. Symbol + wordmark top left (30 mm wide), mint hairline below, navy footer band with registered details (to be supplied). |
| Presentation | 16:9. Navy master with 64 px grid; oversized symbol crop bottom right in Deep Teal; section numbers in Plex Mono mint; light content master on Mist. |
| PPE | Hard hats: white or navy shell, single-colour mark on the front (40 mm), amber reflective strip at the back. Coveralls: navy, mark on chest, HALO on back in Mist. |
| Vehicles | White body, navy + mint band at sill height, horizontal logo on doors, symbol on bonnet. |
| Machinery decals | Single-colour navy mark and "Coordinated by Halo Energy" on counterweight; never cover OEM or owner branding without agreement. |
| Social | 1:1 and 4:5. One message per post, orbit device, logo bottom left. Templates: insight (statement), capability (icon + line), partner call, illustrative use case (always labelled). |
