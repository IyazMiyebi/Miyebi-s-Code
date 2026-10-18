#!/usr/bin/env node
// Imports the live Bumpa store (bynimiie.com) into our own catalog format.
//
//   node scripts/import-bumpa.mjs            fetch live data, write data/catalog.json
//   node scripts/import-bumpa.mjs --offline  rebuild from the last data/bumpa-snapshot.json
//
// Bumpa keeps taking orders until launch, so re-run this right before going
// live to pick up current stock. It's deterministic: same snapshot, same output.
//
// What it cleans up compared with the Bumpa listings:
//   - The 13 separate "Dahlia Mini" listings become one product with
//     finish + colour options; same for the Alissa clutch, the two scarf
//     listings and the two initial-letter charms.
//   - Prices come from the variants, so the wrong parent prices
//     (₦9,750 / ₦10,000 / ₦0) disappear.
//   - Measurements are pulled out of the description into their own field.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SNAPSHOT = path.join(ROOT, "data/bumpa-snapshot.json");
const CATALOG = path.join(ROOT, "data/catalog.json");
const STORE = "https://bynimiie.com/storefront";
const LOCATION = 72206;

// ---------------------------------------------------------------------------
// 1. Snapshot
// ---------------------------------------------------------------------------

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchSnapshot() {
  const products = await getJson(
    `${STORE}/products?min_stock=0&with_variations=true&status=1&location=${LOCATION}&limit=200`,
  );
  const { tags: collections } = await getJson(`${STORE}/collections`);
  const membership = {};
  for (const c of collections) {
    const r = await getJson(
      `${STORE}/products?collection=${c.id}&status=1&location=${LOCATION}&limit=200`,
    );
    membership[c.id] = r.products.data.map((p) => p.id);
  }
  const snap = {
    fetched_at: new Date().toISOString(),
    products: products.products.data,
    collections,
    membership,
  };
  snap.dead_images = await findDeadImages(snap);
  return snap;
}

// Some photos referenced by Bumpa no longer exist on its CDN (they 403).
// Record them in the snapshot so offline rebuilds skip them too.
async function findDeadImages(snap) {
  const urls = new Set();
  for (const p of snap.products) {
    for (const i of p.images) urls.add(img(i.path));
    for (const v of p.variations ?? []) if (v.image) urls.add(img(v.image));
  }
  const dead = [];
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let u = queue.pop(); u; u = queue.pop()) {
        const res = await fetch(u, { method: "HEAD" });
        if (!res.ok) dead.push(u);
      }
    }),
  );
  return dead.sort();
}

// ---------------------------------------------------------------------------
// 2. Grouping rules: which Bumpa listings become which product
// ---------------------------------------------------------------------------

const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s-])\w/g, (m) => m.toUpperCase()).trim();

// Each rule claims Bumpa listings by slug and says how to read the options
// out of each listing (simple listing) or each variant (listing with variations).
const MERGES = [
  {
    slug: "the-dahlia-mini",
    name: "The Dahlia Mini",
    optionNames: ["Finish", "Colour"],
    finishOrder: [
      "Classic Smooth Leather", "Textured Pebble Grain Leather", "Croc Embossed Leather",
      "Suede Velvet", "Denim", "Woven Leather", "Animal Print",
    ],
    match: (p) => p.slug.startsWith("the-dahlia-mini"),
    fromListing: (p) => {
      const t = p.title.replace(/^The Dahlia Mini-\s*/, "");
      const m = t.match(/^(.*?)\s*\((.*)\)\s*$/);
      if (/washed denim/i.test(t)) return ["Denim", "Washed"];
      if (/^denim$/i.test(t)) return ["Denim", "Classic Indigo"];
      if (!m) throw new Error(`Unparsed Dahlia listing: ${p.title}`);
      return [normaliseFinish(m[1]), titleCase(m[2])];
    },
    fromVariant: (p, v) => {
      if (/suede velvet/i.test(p.title)) return ["Suede Velvet", titleCase(v.variant)];
      const [finish, colour] = v.variant.split("-");
      return [normaliseFinish(finish), titleCase(colour)];
    },
  },
  {
    slug: "the-alissa-clutch",
    name: "The Alissa Clutch",
    optionNames: ["Finish", "Colour"],
    match: (p) => p.slug.startsWith("the-alissa-clutch-purse"),
    fromVariant: (p, v) => [
      /asooke/i.test(p.title) ? "Asooke" : "Classic Smooth Leather",
      titleCase(v.variant),
    ],
  },
  {
    slug: "pastel-mini-scarf",
    name: "Pastel Mini Scarf",
    optionNames: ["Design"],
    match: (p) => p.slug === "pastel-mini-scarves",
    fromVariant: (_p, v) => [`Design ${v.variant}`],
  },
  {
    slug: "initial-cherry-charm",
    name: "Initial Letter Cherry Charm",
    optionNames: ["Metal", "Letter"],
    match: (p) => /initial-letter-cherry-charm/.test(p.slug),
    fromListing: (p) => {
      const m = p.title.match(/^(Silver|Gold).*\(Letter (\w)\)/);
      return [m[1], m[2]];
    },
  },
];

function normaliseFinish(s) {
  const f = s.trim().toLowerCase();
  if (f.startsWith("textured pebble")) return "Textured Pebble Grain Leather";
  if (f.startsWith("classic smooth")) return "Classic Smooth Leather";
  if (f.startsWith("croc embossed")) return "Croc Embossed Leather";
  return titleCase(s);
}

// Listings that stay as they are, keyed by Bumpa slug. Single-colour bags
// keep a Colour option so the shop can filter on it.
const SINGLES = {
  "the-avaia": { optionNames: [] },
  "the-liora": { optionNames: [] },
  "ottie-shoulder-bag": { optionNames: [] },
  "the-mimi-mini-croc-embossed-leather-black": {
    slug: "the-mimi-mini",
    name: "The Mimi Mini",
    optionNames: ["Finish", "Colour"],
    options: ["Croc Embossed Leather", "Black"],
  },
  "amma-shoulder-bag-croc-embossed-leather-blue": {
    slug: "the-amma-shoulder-bag",
    name: "The Amma Shoulder Bag",
    optionNames: ["Finish", "Colour"],
    options: ["Croc Embossed Leather", "Blue"],
  },
  "the-aria-tote-bag": { optionNames: ["Colour"] },
  "cute-cat-charm": { optionNames: ["Colour"] },
  "cute-bear-charm": { optionNames: ["Colour"] },
  "fluffy-cherry-charm": { optionNames: [] },
};

// Swatch colours for the shop. Names not listed fall back to a neutral.
const SWATCHES = {
  white: "#F4F1EA", black: "#141211", brown: "#6B4329", pink: "#E7A6B8",
  "baby pink": "#F3C9D4", green: "#3F6B45", "olive green": "#6B6B34",
  "mint green": "#A8D5BA", red: "#B3202C", purple: "#5E3A7A", wine: "#5C1A2B",
  beige: "#D9C3A5", "pastel blue": "#A9C7E8", lilac: "#C3A9DA",
  "dark blue": "#1F2F5C", blue: "#2B4F9E", "dark espresso": "#3B2418",
  leopard: "#C08A4A", "classic indigo": "#3A4F7A", washed: "#8FA7C4",
  "dark crimson": "#6E1023", "emerald green": "#0F5E46", "royal velvet": "#3B2A86",
  "vintage cocoa": "#5A3B2B", sanyan: "#C8A97E", silver: "#C0C4C8", gold: "#C9A44A",
};

// ---------------------------------------------------------------------------
// 3. Transform
// ---------------------------------------------------------------------------

const money = (x) => (x == null || x === "" ? null : Math.round(Number(x)));
const img = (p) =>
  p.startsWith("http") ? p : `https://dodptt9f4zk9h.cloudfront.net${p}`;

function splitDescription(raw) {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  const re = /Measurements?:\s*([\d.]+"?\s*x\s*[\d.]+")\.?/i;
  const m = text.match(re);
  const description = text.replace(re, "").trim();
  // The suede velvet listing repeats its tagline; keep one copy.
  const deduped = description.replace(/(Bold Minimalism\. Timeless Form\.)\s*\1/i, "$1");
  return { description: deduped, dimensions: m ? m[1].trim() : null };
}

function categoryOf(name) {
  if (/charm/i.test(name)) return "charm";
  if (/scar(f|ves)/i.test(name)) return "scarf";
  return "bag";
}

function transform(snap) {
  const dead = new Set(snap.dead_images ?? []);
  const alive = (u) => !dead.has(u);
  const products = [];
  const legacy = {}; // bumpa product id -> our slug
  const claimed = new Set();
  const sorted = [...snap.products].sort((a, b) => a.id - b.id);

  const listingImages = (p) => p.images.map((i) => img(i.path)).filter(alive);
  // A variant's own photo, or null when Bumpa has none (or it's dead). We
  // never substitute another colour's photo for it.
  const variantImage = (v) => (v.image && alive(img(v.image)) ? img(v.image) : null);

  for (const rule of MERGES) {
    const listings = sorted.filter(rule.match);
    if (!listings.length) continue;
    const variants = [];
    const images = [];
    let description = null;
    let dimensions = null;
    for (const p of listings) {
      claimed.add(p.id);
      legacy[p.id] = rule.slug;
      const d = splitDescription(p.description);
      // Prefer the oldest listing's copy; it's the canonical one.
      description ??= d.description;
      dimensions ??= d.dimensions;
      const pics = listingImages(p);
      // The merged product's own images are one cover shot per old listing;
      // each variant carries the full gallery of the listing it came from.
      if (pics[0] && !images.includes(pics[0])) images.push(pics[0]);
      if (p.variations?.length) {
        for (const v of p.variations) {
          variants.push(variant(rule.optionNames, rule.fromVariant(p, v), v, {
            image: variantImage(v),
            gallery: pics,
            legacyListing: p,
          }));
        }
      } else {
        variants.push(variant(rule.optionNames, rule.fromListing(p), p, {
          image: pics[0],
          gallery: pics,
          legacyListing: p,
        }));
      }
    }
    if (rule.finishOrder) {
      const rank = (v) => rule.finishOrder.indexOf(v.options.Finish);
      variants.sort((a, b) => rank(a) - rank(b)); // stable: keeps colour order within a finish
    }
    products.push(product(rule.slug, rule.name, rule.optionNames, description, dimensions, images, variants, listings));
  }

  for (const p of sorted) {
    if (claimed.has(p.id)) continue;
    const s = SINGLES[p.slug];
    if (!s) throw new Error(`No rule for Bumpa listing ${p.slug}; add it to MERGES or SINGLES`);
    const slug = s.slug ?? p.slug;
    legacy[p.id] = slug;
    const d = splitDescription(p.description);
    const pics = listingImages(p);
    const variants = p.variations?.length
      ? p.variations.map((v) =>
          variant(s.optionNames, [titleCase(v.variant)], v, {
            image: variantImage(v),
            gallery: pics,
            legacyListing: p,
          }),
        )
      : [variant(s.optionNames, s.options ?? [], p, { image: pics[0], gallery: pics, legacyListing: p })];
    products.push(product(slug, s.name ?? p.title, s.optionNames, d.description, d.dimensions, pics, variants, [p]));
  }

  // Newest Bumpa listing first, same as the current shop.
  products.sort((a, b) => b._newest - a._newest);
  products.forEach((p, i) => {
    p.position = i + 1;
    delete p._newest;
  });

  const collections = snap.collections
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      slug: c.tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: c.tag,
      description: c.description?.trim() || null,
      image: c.image_url ?? null,
      products: [...new Set((snap.membership[c.id] ?? []).map((id) => legacy[id]).filter(Boolean))],
    }));

  return {
    source: { platform: "bumpa", url: "https://bynimiie.com", fetched_at: snap.fetched_at },
    currencies: [
      // Rates as currently configured in Bumpa (NGN per unit). Nimi to confirm.
      { code: "NGN", symbol: "₦", rate: 1 },
      { code: "USD", symbol: "$", rate: 1000 },
      { code: "GBP", symbol: "£", rate: 1300 },
      { code: "EUR", symbol: "€", rate: 1300 },
      { code: "CAD", symbol: "C$", rate: 1000 },
    ],
    collections,
    products,
  };
}

function variant(optionNames, values, src, { image, gallery, legacyListing }) {
  if (values.length !== optionNames.length) {
    throw new Error(`Option mismatch for ${legacyListing.slug}: ${optionNames} vs ${values}`);
  }
  const options = Object.fromEntries(optionNames.map((n, i) => [n, values[i]]));
  const colour = options.Colour ?? options.Metal;
  return {
    options,
    swatch: colour ? SWATCHES[colour.toLowerCase()] ?? "#9A8F86" : null,
    price_ngn: money(src.price),
    compare_at_ngn: money(src.compare_at_price),
    stock: src.quantity ?? 0,
    // Variant photo first, then the rest of its listing's photos.
    images: [image, ...gallery.filter((u) => u !== image)].filter(Boolean),
    has_photo: Boolean(image),
    legacy: { bumpa_product_id: legacyListing.id, bumpa_variant_id: src.product_id ? src.id : null },
  };
}

function product(slug, name, optionNames, description, dimensions, images, variants, listings) {
  for (const v of variants) {
    v.sku = [slug, ...Object.values(v.options)].join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }
  const skus = variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) throw new Error(`Duplicate SKU in ${slug}`);
  return {
    slug,
    name,
    category: categoryOf(name),
    description,
    dimensions,
    option_names: optionNames,
    images,
    variants,
    legacy: {
      bumpa_ids: listings.map((l) => l.id),
      bumpa_urls: listings.map((l) => new URL(l.url).pathname),
    },
    _newest: Math.max(...listings.map((l) => l.id)),
  };
}

// ---------------------------------------------------------------------------

const offline = process.argv.includes("--offline");
const snap = offline ? JSON.parse(await readFile(SNAPSHOT, "utf8")) : await fetchSnapshot();
if (!offline || !snap.dead_images) {
  snap.dead_images ??= await findDeadImages(snap);
  await mkdir(path.dirname(SNAPSHOT), { recursive: true });
  await writeFile(SNAPSHOT, JSON.stringify(snap, null, 2) + "\n");
}
const catalog = transform(snap);
await writeFile(CATALOG, JSON.stringify(catalog, null, 2) + "\n");

const nv = catalog.products.reduce((n, p) => n + p.variants.length, 0);
console.log(
  `${snap.products.length} Bumpa listings -> ${catalog.products.length} products, ${nv} variants, ${catalog.collections.length} collections`,
);
