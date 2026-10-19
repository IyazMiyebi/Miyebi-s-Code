import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getCollection, getProduct, getProducts } from "@/lib/catalog";

// Stage 0 version of the home page: the layout and content are real, the
// interactive effects (water ripple hero, spiral gallery, box grid) arrive
// in Stage 1.
export default function Home() {
  const dahlia = getProduct("the-dahlia-mini");
  const velvet = getCollection("the-suede-velvet-edit");
  const latest = getProducts().filter((p) => p.category === "bag").slice(0, 4);
  const heroImage = dahlia?.images[0];
  const velvetImage = velvet?.image ?? dahlia?.variants.find((v) => v.options.Finish === "Suede Velvet")?.images[0];

  return (
    <>
      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-20 sm:px-6 md:min-h-[calc(100svh-6.5rem)] md:grid-cols-2 md:py-0">
        <div className="order-2 md:order-1">
          <p className="label text-gold">The bag shop, Lagos</p>
          <h1 className="mt-5 font-serif text-[clamp(3.5rem,9vw,8.5rem)] leading-[0.9] tracking-tight">
            Elegance <em className="text-muted">in</em> simplicity.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Bold minimalism, timeless form. Mini bags, shoulder bags and charms, handmade and dispatched same or next day.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/shop" className="label rounded-full bg-accent px-7 py-4 text-accent-ink transition-opacity hover:opacity-85">
              Shop now
            </Link>
            <Link href="/products/the-dahlia-mini" className="label rounded-full border border-line px-7 py-4 transition-colors hover:border-ink">
              Meet the Dahlia
            </Link>
          </div>
        </div>
        {heroImage && (
          <div className="relative order-1 aspect-[4/5] overflow-hidden md:order-2">
            <Image src={heroImage} alt="The Dahlia Mini" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="label text-gold">Latest</p>
            <h2 className="mt-3 font-serif text-5xl sm:text-6xl">New this season</h2>
          </div>
          <Link href="/shop" className="label border-b border-current pb-1 hover:text-accent">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {latest.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {velvet && (
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_1fr]">
          {velvetImage && (
            <div className="relative aspect-square overflow-hidden">
              <Image src={velvetImage} alt={velvet.name} fill sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" />
            </div>
          )}
          <div>
            <p className="label text-gold">The edit</p>
            <h2 className="mt-3 font-serif text-5xl leading-none sm:text-7xl">{velvet.name}</h2>
            <p className="mt-6 max-w-md text-lg text-muted">{velvet.description}</p>
            <Link href={`/collections/${velvet.slug}`} className="label mt-8 inline-block border-b border-current pb-1 hover:text-accent">
              Explore the edit
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
