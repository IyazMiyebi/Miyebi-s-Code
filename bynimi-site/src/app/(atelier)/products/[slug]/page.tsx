import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { getProduct, getProducts, totalStock, type Product } from "@/lib/catalog";
import { VariantPicker } from "./variant-picker";
import { VariantPickerFromUrl } from "./variant-picker-from-url";

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  return {
    title: p.name,
    description: p.description ?? undefined,
    openGraph: { images: p.images.slice(0, 1) },
  };
}

/** Bags get charms and scarves; accessories get bags. In-stock pieces first. */
function completeTheLook(product: Product, all: Product[]) {
  const accessory = (p: Product) => p.category === "charm" || p.category === "scarf";
  return all
    .filter((p) => p.slug !== product.slug && accessory(p) !== accessory(product))
    .sort((a, b) => Number(totalStock(b) > 0) - Number(totalStock(a) > 0))
    .slice(0, 4);
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getProduct(slug), getProducts()]);
  if (!product) notFound();
  const pairings = completeTheLook(product, all);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="label mb-8 text-muted">
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{product.name}</span>
      </nav>
      <Suspense fallback={<VariantPicker product={product} />}>
        <VariantPickerFromUrl product={product} />
      </Suspense>

      {pairings.length > 0 && (
        <section aria-labelledby="pairings-heading" className="mt-24 border-t border-line pt-14">
          <h2 id="pairings-heading" className="font-serif text-4xl sm:text-5xl">
            {product.category === "bag" ? "Complete the look" : "Made for these bags"}
          </h2>
          <p className="mt-2 text-muted">
            {product.category === "bag"
              ? "A charm or a scarf makes it yours."
              : "Clip it on, tie it on, carry it everywhere."}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {pairings.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
