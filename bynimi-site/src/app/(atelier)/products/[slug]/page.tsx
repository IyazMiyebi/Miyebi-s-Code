import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/catalog";
import { VariantPicker } from "./variant-picker";

export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  return {
    title: p.name,
    description: p.description ?? undefined,
    openGraph: { images: p.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="label mb-8 text-muted">
        <Link href="/shop" className="hover:text-ink">Shop</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{product.name}</span>
      </nav>
      <VariantPicker product={product} />
    </div>
  );
}
