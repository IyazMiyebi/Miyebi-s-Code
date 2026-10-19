import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { getCollection, getCollections } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollection(slug);
  return c ? { title: c.name, description: c.description ?? undefined } : {};
}

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="mb-12 max-w-2xl">
        <p className="label text-muted">
          Collection · {collection.products.length} {collection.products.length === 1 ? "piece" : "pieces"}
        </p>
        <h1 className="mt-3 font-serif text-6xl sm:text-7xl">{collection.name}</h1>
        {collection.description && <p className="mt-5 text-lg text-muted">{collection.description}</p>}
      </header>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {collection.products.map((p, i) => (
          <ProductCard key={p.slug} product={p} priority={i < 4} />
        ))}
      </div>
    </div>
  );
}
