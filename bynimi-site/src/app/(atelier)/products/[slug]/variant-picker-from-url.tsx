"use client";

import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/catalog";
import { optionsFromParams } from "@/lib/variant-link";
import { VariantPicker } from "./variant-picker";

// Reads ?finish=…&colour=… so links (spiral gallery, collections, shared
// links) open on that exact bag. The page itself stays prerendered: this sits
// inside a Suspense boundary whose fallback is the picker on its default bag.
export function VariantPickerFromUrl({ product }: { product: Product }) {
  const params = useSearchParams();
  return <VariantPicker product={product} initialOptions={optionsFromParams(product, params)} />;
}
