// Filtering, search and sorting for the shop page. Pure functions, shared by
// server and client, so they can be tested on their own.
//
// Filters work on variants: a product shows when at least one of its variants
// passes every filter, and its card then features just those variants (filter
// by Black and the Dahlia card shows, and links to, the black Dahlia).

import { categoryLabel, type Category, type Product, type Variant } from "./product";
import { optionSlug } from "./variant-link";

// ---------------------------------------------------------------------------
// Colour families: the shop filters by family, not by each of the ~35
// colour names.

export const COLOUR_FAMILIES = [
  { slug: "black", label: "Black", hex: "#141211" },
  { slug: "white", label: "White & cream", hex: "#F4F1EA" },
  { slug: "neutral", label: "Beige & neutral", hex: "#D9C3A5" },
  { slug: "brown", label: "Brown", hex: "#6B4329" },
  { slug: "red", label: "Red & wine", hex: "#8E1B2B" },
  { slug: "pink", label: "Pink", hex: "#E7A6B8" },
  { slug: "purple", label: "Purple & lilac", hex: "#7B5BA6" },
  { slug: "blue", label: "Blue", hex: "#3F64A8" },
  { slug: "green", label: "Green", hex: "#3F6B45" },
  { slug: "metallic", label: "Gold & silver", hex: "#C9A44A" },
  { slug: "print", label: "Prints", hex: "#C08A4A" },
] as const;

export type ColourFamily = (typeof COLOUR_FAMILIES)[number]["slug"];

const FAMILY_BY_NAME: Record<string, ColourFamily> = {
  black: "black",
  white: "white",
  beige: "neutral",
  sanyan: "neutral",
  brown: "brown",
  "dark espresso": "brown",
  "vintage cocoa": "brown",
  red: "red",
  wine: "red",
  "dark crimson": "red",
  pink: "pink",
  "baby pink": "pink",
  purple: "purple",
  lilac: "purple",
  "royal velvet": "purple",
  blue: "blue",
  "pastel blue": "blue",
  "dark blue": "blue",
  "classic indigo": "blue",
  washed: "blue",
  green: "green",
  "olive green": "green",
  "mint green": "green",
  "emerald green": "green",
  silver: "metallic",
  gold: "metallic",
  leopard: "print",
};

/** Family for a colour we haven't named above, from its swatch. */
function familyFromHex(hex: string): ColourFamily {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * light - 1));
  if (light < 0.15) return "black";
  if (light > 0.88) return "white";
  if (sat < 0.2) return "neutral";
  const d = max - min;
  const h = (max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  const hue = (h + 360) % 360;
  if (hue < 15 || hue >= 345) return light > 0.7 ? "pink" : "red";
  if (hue < 45) return light < 0.45 ? "brown" : "neutral";
  if (hue < 70) return "neutral";
  if (hue < 170) return "green";
  if (hue < 255) return "blue";
  if (hue < 300) return "purple";
  return "pink";
}

export function colourFamily(v: Variant): ColourFamily | null {
  const name = (v.options.Colour ?? v.options.Metal)?.toLowerCase();
  if (!name) return null;
  return FAMILY_BY_NAME[name] ?? (v.swatch ? familyFromHex(v.swatch) : null);
}

// ---------------------------------------------------------------------------
// Filter state, as stored in the URL: /shop?type=bag&colour=black&max=40000

export const PRICE_CAPS = [20000, 40000, 60000] as const;

export const SORTS = [
  { slug: "featured", label: "Featured" },
  { slug: "price-asc", label: "Price: low to high" },
  { slug: "price-desc", label: "Price: high to low" },
] as const;

export type SortSlug = (typeof SORTS)[number]["slug"];

export type ShopFilters = {
  q: string;
  types: Category[];
  finishes: string[]; // option slugs, e.g. "suede-velvet"
  colours: ColourFamily[];
  max: number | null; // base Naira price cap
  inStock: boolean;
  sort: SortSlug;
};

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function filtersFromParams(params: URLSearchParams): ShopFilters {
  const max = Number(params.get("max"));
  const sort = params.get("sort");
  return {
    q: (params.get("q") ?? "").trim(),
    types: list(params.get("type")).filter((t): t is Category => t in categoryLabel),
    finishes: list(params.get("finish")),
    colours: list(params.get("colour")).filter((c): c is ColourFamily =>
      COLOUR_FAMILIES.some((f) => f.slug === c),
    ),
    max: (PRICE_CAPS as readonly number[]).includes(max) ? max : null,
    inStock: params.get("stock") === "1",
    sort: SORTS.some((s) => s.slug === sort) ? (sort as SortSlug) : "featured",
  };
}

export function filtersToParams(f: ShopFilters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.types.length) p.set("type", f.types.join(","));
  if (f.finishes.length) p.set("finish", f.finishes.join(","));
  if (f.colours.length) p.set("colour", f.colours.join(","));
  if (f.max) p.set("max", String(f.max));
  if (f.inStock) p.set("stock", "1");
  if (f.sort !== "featured") p.set("sort", f.sort);
  return p;
}

export const activeFilterCount = (f: ShopFilters) =>
  f.types.length + f.finishes.length + f.colours.length + (f.max ? 1 : 0) + (f.inStock ? 1 : 0);

// ---------------------------------------------------------------------------
// Matching

type Facet = "types" | "finishes" | "colours" | "max" | "inStock";

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function productText(p: Product) {
  return words(`${p.name} ${p.description ?? ""} ${categoryLabel[p.category]} ${p.category}`);
}

function variantPasses(v: Variant, f: ShopFilters, skip?: Facet) {
  if (skip !== "finishes" && f.finishes.length && !f.finishes.includes(optionSlug(v.options.Finish ?? ""))) return false;
  if (skip !== "colours" && f.colours.length) {
    const fam = colourFamily(v);
    if (!fam || !f.colours.includes(fam)) return false;
  }
  if (skip !== "max" && f.max && v.price_ngn > f.max) return false;
  if (skip !== "inStock" && f.inStock && v.stock <= 0) return false;
  return true;
}

/** Search: every word must appear in the product or in one variant's options. */
function searchVariants(p: Product, variants: Variant[], q: string) {
  const terms = words(q);
  if (!terms.length) return variants;
  const own = productText(p);
  const hit = (term: string, pool: string[]) => pool.some((w) => w.startsWith(term));
  return variants.filter((v) => {
    const pool = [...own, ...words(Object.values(v.options).join(" "))];
    return terms.every((t) => hit(t, pool));
  });
}

export type ShopResult = { product: Product; variants: Variant[] };

function match(products: Product[], f: ShopFilters, skip?: Facet): ShopResult[] {
  const out: ShopResult[] = [];
  for (const product of products) {
    if (skip !== "types" && f.types.length && !f.types.includes(product.category)) continue;
    const variants = searchVariants(
      product,
      product.variants.filter((v) => variantPasses(v, f, skip)),
      f.q,
    );
    if (variants.length) out.push({ product, variants });
  }
  return out;
}

const minPrice = (r: ShopResult) => Math.min(...r.variants.map((v) => v.price_ngn));

export function applyFilters(products: Product[], f: ShopFilters): ShopResult[] {
  const results = match(products, f);
  if (f.sort === "price-asc") results.sort((a, b) => minPrice(a) - minPrice(b));
  if (f.sort === "price-desc") results.sort((a, b) => minPrice(b) - minPrice(a));
  return results;
}

// ---------------------------------------------------------------------------
// Facet options with counts: how many products each choice would show, given
// the other filters. Choices that would show nothing are left out unless
// already selected.

export type FacetOption = { value: string; label: string; count: number; hex?: string };

export function facetOptions(products: Product[], f: ShopFilters) {
  const count = (skip: Facet, has: (r: ShopResult) => boolean) => match(products, f, skip).filter(has).length;
  const keep = (opts: FacetOption[], selected: string[]) =>
    opts.filter((o) => o.count > 0 || selected.includes(o.value));

  const types = keep(
    (["bag", "charm", "scarf"] as Category[]).map((t) => ({
      value: t,
      label: categoryLabel[t],
      count: count("types", (r) => r.product.category === t),
    })),
    f.types,
  );

  const finishNames = new Map<string, string>();
  for (const p of products) for (const v of p.variants) if (v.options.Finish) finishNames.set(optionSlug(v.options.Finish), v.options.Finish);
  const finishes = keep(
    [...finishNames].map(([value, label]) => ({
      value,
      label,
      count: count("finishes", (r) => r.variants.some((v) => optionSlug(v.options.Finish ?? "") === value)),
    })),
    f.finishes,
  );

  const colours = keep(
    COLOUR_FAMILIES.map((fam) => ({
      value: fam.slug,
      label: fam.label,
      hex: fam.hex,
      count: count("colours", (r) => r.variants.some((v) => colourFamily(v) === fam.slug)),
    })),
    f.colours,
  );

  const prices = PRICE_CAPS.map((cap) => ({
    value: String(cap),
    label: String(cap),
    count: count("max", (r) => r.variants.some((v) => v.price_ngn <= cap)),
  }));

  const inStock = count("inStock", (r) => r.variants.some((v) => v.stock > 0));

  return { types, finishes, colours, prices, inStock };
}
