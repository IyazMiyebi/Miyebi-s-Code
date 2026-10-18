// Read access to the product catalog.
//
// For now this reads data/catalog.json (built by scripts/import-bumpa.mjs).
// Once the Supabase project exists these functions switch to querying it;
// the rest of the site only talks to this module, so nothing else changes.

import data from "../../data/catalog.json";

export type Category = "bag" | "charm" | "scarf" | "other";

export type Variant = {
  sku: string;
  options: Record<string, string>;
  swatch: string | null;
  price_ngn: number;
  compare_at_ngn: number | null;
  stock: number;
  images: string[];
  /** False when images are the wider gallery, not this variant's own photo. */
  has_photo: boolean;
};

export type Product = {
  slug: string;
  name: string;
  category: Category;
  description: string | null;
  dimensions: string | null;
  option_names: string[];
  images: string[];
  position: number;
  variants: Variant[];
};

export type Collection = {
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  products: string[];
};

export type Currency = { code: string; symbol: string; rate: number };

const catalog = data as unknown as {
  products: Product[];
  collections: Collection[];
  currencies: Currency[];
};

export function getProducts(): Product[] {
  return [...catalog.products].sort((a, b) => a.position - b.position);
}

export function getProduct(slug: string): Product | undefined {
  return catalog.products.find((p) => p.slug === slug);
}

export function getCollections(): Collection[] {
  return catalog.collections;
}

export function getCollection(slug: string) {
  const collection = catalog.collections.find((c) => c.slug === slug);
  if (!collection) return undefined;
  const products = collection.products
    .map((s) => getProduct(s))
    .filter((p): p is Product => Boolean(p));
  return { ...collection, products };
}

export function getCurrencies(): Currency[] {
  return catalog.currencies;
}

// ---------------------------------------------------------------------------
// Derived values used across product cards and pages.

export function priceRange(p: Product) {
  const prices = p.variants.map((v) => v.price_ngn);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function totalStock(p: Product) {
  return p.variants.reduce((n, v) => n + v.stock, 0);
}

/** Distinct swatches across all variants, in order, e.g. for card dots. */
export function swatches(p: Product) {
  const seen = new Map<string, string>();
  for (const v of p.variants) {
    const name = v.options.Colour ?? v.options.Metal;
    if (name && v.swatch && !seen.has(name)) seen.set(name, v.swatch);
  }
  return [...seen].map(([name, hex]) => ({ name, hex }));
}

/** Cover image, then a second image for the hover swap on cards. */
export function cardImages(p: Product): [string, string | undefined] {
  const inStock = p.variants.find((v) => v.stock > 0) ?? p.variants[0];
  const first = p.images[0] ?? inStock?.images[0];
  const second = [...p.images, ...(inStock?.images ?? [])].find((u) => u !== first);
  return [first, second];
}

export const categoryLabel: Record<Category, string> = {
  bag: "Bags",
  charm: "Charms",
  scarf: "Scarves",
  other: "Other",
};
