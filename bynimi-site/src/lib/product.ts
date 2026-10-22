// Product types and the small helpers derived from them. No server-only
// imports, so client components (shop filters, product cards, the picker)
// can use these freely. src/lib/catalog.ts re-exports everything here.

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

export type ShippingZone = {
  id: string;
  name: string;
  description: string | null;
  countries: string[];
  price_ngn: number;
  free_orders_left: number;
  is_pickup: boolean;
};

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
/**
 * The variant a card features: one with its own photo (in stock first), so a
 * card never shows one colour's photo for another.
 */
export function leadVariant(p: Product): Variant | undefined {
  return (
    p.variants.find((v) => v.stock > 0 && v.has_photo) ??
    p.variants.find((v) => v.has_photo) ??
    p.variants.find((v) => v.stock > 0) ??
    p.variants[0]
  );
}

export function cardImages(p: Product): [string, string | undefined] {
  const lead = leadVariant(p);
  const first = p.images[0] ?? lead?.images[0];
  const second = [...p.images, ...(lead?.images ?? [])].find((u) => u !== first);
  return [first, second];
}

export const categoryLabel: Record<Category, string> = {
  bag: "Bags",
  charm: "Charms",
  scarf: "Scarves",
  other: "Other",
};
