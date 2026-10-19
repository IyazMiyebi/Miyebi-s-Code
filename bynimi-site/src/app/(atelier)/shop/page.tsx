import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { categoryLabel, getCollections, getProducts, type Category } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Every bag, charm and scarf from Bags by Nimi.",
};

// Stage 0: every product, grouped by category. Filtering, sorting and search
// arrive in Stage 2.
export default async function Shop() {
  const [products, collections] = await Promise.all([getProducts(), getCollections()]);
  const groups = (["bag", "charm", "scarf"] as Category[])
    .map((c) => ({ category: c, products: products.filter((p) => p.category === c) }))
    .filter((g) => g.products.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="mb-12">
        <p className="label text-muted">{products.length} pieces</p>
        <h1 className="mt-3 font-serif text-6xl sm:text-8xl">The shop</h1>
        <ul className="mt-8 flex flex-wrap gap-2">
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

      {groups.map((g, gi) => (
        <section key={g.category} className="mb-20">
          <h2 className="label mb-6 border-b border-line pb-3 text-muted">
            {categoryLabel[g.category]} · {g.products.length}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {g.products.map((p, i) => (
              <ProductCard key={p.slug} product={p} priority={gi === 0 && i < 4} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
