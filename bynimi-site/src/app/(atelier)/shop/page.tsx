import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCollections, getProducts } from "@/lib/catalog";
import { ShopBrowser } from "./shop-browser";
import { ShopBrowserFromUrl } from "./shop-browser-from-url";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every bag, charm and scarf from Bags by Nimi. Filter by colour, finish and price.",
};

export default async function Shop() {
  const [products, collections] = await Promise.all([getProducts(), getCollections()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="mb-10">
        <h1 className="font-serif text-6xl sm:text-8xl">The shop</h1>
        <ul className="mt-6 flex flex-wrap gap-2">
          {collections.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/collections/${c.slug}`}
                className="label inline-block rounded-full border border-line px-4 py-2 transition-colors hover:border-ink"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </header>

      <Suspense fallback={<ShopBrowser products={products} urlQuery="" />}>
        <ShopBrowserFromUrl products={products} />
      </Suspense>
    </div>
  );
}
