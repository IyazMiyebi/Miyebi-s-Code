// Read access to the product catalog.
//
// Reads from Supabase when NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set, otherwise from
// data/catalog.json (built by scripts/import-bumpa.mjs). The rest of the site
// only talks to this module.

import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import fallback from "../../data/catalog.json";

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

type Catalog = {
  products: Product[];
  collections: Collection[];
  currencies: Currency[];
};

/** Cache tag for the whole catalog; call updateTag(CATALOG_TAG) after writes. */
export const CATALOG_TAG = "catalog";

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

// The catalog is small (a few dozen products), so it's loaded whole and
// cached. It refreshes at most a minute after a change in Supabase.
async function loadCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return fallback as unknown as Catalog;

  const db = createClient(url, key, { auth: { persistSession: false } });
  const [products, collections, currencies] = await Promise.all([
    db
      .from("products")
      .select(
        "slug, name, category, description, dimensions, option_names, images, position," +
          " product_variants (sku, options, swatch, price_ngn, compare_at_ngn, stock, images, has_photo, position)",
      ),
    db
      .from("collections")
      .select("slug, name, description, image, position, collection_products (position, products (slug))"),
    db.from("currencies").select("code, symbol, ngn_per_unit, position"),
  ]);
  for (const r of [products, collections, currencies]) {
    if (r.error) throw new Error(`Supabase: ${r.error.message}`);
  }

  type ProductRow = Omit<Product, "variants"> & { product_variants: (Variant & { position: number })[] };
  type CollectionRow = Omit<Collection, "products"> & {
    position: number;
    collection_products: { position: number; products: { slug: string } | null }[];
  };
  type CurrencyRow = { code: string; symbol: string; ngn_per_unit: number; position: number };

  return {
    products: (products.data as unknown as ProductRow[])
      .map(({ product_variants, ...p }) => ({
        ...p,
        variants: product_variants.sort(byPosition),
      }))
      .sort(byPosition),
    collections: (collections.data as unknown as CollectionRow[]).sort(byPosition).map(
      ({ collection_products, ...c }) => ({
        ...c,
        products: collection_products
          .sort(byPosition)
          .flatMap((cp) => (cp.products ? [cp.products.slug] : [])),
      }),
    ),
    currencies: (currencies.data as CurrencyRow[])
      .sort(byPosition)
      .map((c) => ({ code: c.code, symbol: c.symbol, rate: Number(c.ngn_per_unit) })),
  };
}

export async function getProducts(): Promise<Product[]> {
  return [...(await loadCatalog()).products].sort(byPosition);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await loadCatalog()).products.find((p) => p.slug === slug);
}

export async function getCollections(): Promise<Collection[]> {
  return (await loadCatalog()).collections;
}

export async function getCollection(slug: string) {
  const { collections, products } = await loadCatalog();
  const collection = collections.find((c) => c.slug === slug);
  if (!collection) return undefined;
  return {
    ...collection,
    products: collection.products.flatMap((s) => products.filter((p) => p.slug === s)),
  };
}

export async function getCurrencies(): Promise<Currency[]> {
  return (await loadCatalog()).currencies;
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
