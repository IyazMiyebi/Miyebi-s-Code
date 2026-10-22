// Read access to the product catalog.
//
// Reads from Supabase when NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set, otherwise from
// data/catalog.json (built by scripts/import-bumpa.mjs). The rest of the site
// only talks to this module.

import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import fallback from "../../data/catalog.json";

import type { Collection, Currency, Product, ShippingZone, Variant } from "./product";

export * from "./product";

type Catalog = {
  products: Product[];
  collections: Collection[];
  currencies: Currency[];
  zones: ShippingZone[];
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
  if (!url || !key) return { zones: [], ...(fallback as unknown as Omit<Catalog, "zones">) };

  const db = createClient(url, key, { auth: { persistSession: false } });
  const [products, collections, currencies, zones] = await Promise.all([
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
    db
      .from("shipping_zones")
      .select("id, name, description, countries, price_ngn, free_orders_left, is_pickup")
      .order("position"),
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
    // Missing until the orders migration has run; checkout then stays closed.
    zones: zones.error ? [] : ((zones.data ?? []) as ShippingZone[]),
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

export async function getShippingZones(): Promise<ShippingZone[]> {
  return (await loadCatalog()).zones;
}

export async function getCurrencies(): Promise<Currency[]> {
  return (await loadCatalog()).currencies;
}
