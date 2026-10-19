"use client";

import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/product";
import { ShopBrowser } from "./shop-browser";

// Hands the address bar's query to the shop browser. The page stays
// prerendered: this sits in a Suspense boundary whose fallback is the
// browser with no filters.
export function ShopBrowserFromUrl({ products }: { products: Product[] }) {
  const params = useSearchParams();
  return <ShopBrowser products={products} urlQuery={params.toString()} />;
}
