// Links that open a product with options already chosen, e.g.
//   /products/the-dahlia-mini?finish=suede-velvet&colour=vintage-cocoa
// Keys are the lower-cased option names; values are slugs, matched
// case-insensitively. Any subset works: ?finish=suede-velvet picks the best
// colour in that finish (in stock first).

import type { Product, Variant } from "./product";

export const optionSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function variantQuery(options: Record<string, string>) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(options)) params.set(optionSlug(name), optionSlug(value));
  return params.toString();
}

export function variantHref(slug: string, options: Record<string, string> = {}) {
  const query = variantQuery(options);
  return `/products/${slug}${query ? `?${query}` : ""}`;
}

/** Variants matching every given option (exact values). */
export function variantsMatching(product: Product, options: Record<string, string>) {
  return product.variants.filter((v) => Object.entries(options).every(([n, val]) => v.options[n] === val));
}

/** The variant to show for a partial choice of options: in stock first. */
export function bestVariant(product: Product, options: Record<string, string> = {}): Variant | undefined {
  const candidates = variantsMatching(product, options);
  return candidates.find((v) => v.stock > 0) ?? candidates[0];
}

/** Read ?finish=…&colour=… back into exact option values for this product. */
export function optionsFromParams(product: Product, params: URLSearchParams) {
  const options: Record<string, string> = {};
  for (const name of product.option_names) {
    const wanted = params.get(optionSlug(name));
    if (!wanted) continue;
    const value = product.variants.map((v) => v.options[name]).find((val) => optionSlug(val) === optionSlug(wanted));
    if (value) options[name] = value;
  }
  return options;
}
