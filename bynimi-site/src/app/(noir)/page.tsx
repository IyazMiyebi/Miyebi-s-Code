import Image from "next/image";
import Link from "next/link";
import { BoxGrid } from "@/components/effects/box-grid";
import { SpiralGallery, type SpiralItem } from "@/components/effects/spiral-gallery";
import { WaterRipple } from "@/components/effects/water-ripple";
import { NewsletterForm } from "@/components/newsletter-form";
import { ProductCard } from "@/components/product-card";
import { Testimonials } from "@/components/testimonials";
import { getCollection, getProduct, getProducts, type Product } from "@/lib/catalog";
import { store } from "@/lib/store";

function hue(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d < 0.08) return 400 + max; // greys, whites and blacks go last
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const SPIRAL_CARDS = 12;

/** Dahlia colours as a rainbow: one photo each, sampled evenly by hue. */
function dahliaRainbow(dahlia: Product | undefined): SpiralItem[] {
  if (!dahlia) return [];
  const seen = new Set<string>();
  const sorted = dahlia.variants
    .filter((v) => v.has_photo && v.swatch && !seen.has(v.images[0]) && seen.add(v.images[0]))
    .sort((a, b) => hue(a.swatch!) - hue(b.swatch!));
  const n = Math.min(SPIRAL_CARDS, sorted.length);
  return Array.from({ length: n }, (_, i) => sorted[Math.floor((i * sorted.length) / n)]).map((v) => ({
      href: `/products/${dahlia.slug}`,
      src: v.images[0],
      label: `The Dahlia Mini in ${Object.values(v.options).join(", ")}`,
    }));
}

export default async function Home() {
  const [dahlia, velvet, products] = await Promise.all([
    getProduct("the-dahlia-mini"),
    getCollection("the-suede-velvet-edit"),
    getProducts(),
  ]);
  const latest = products.filter((p) => p.category === "bag").slice(0, 4);
  const velvetImage = velvet?.image ?? dahlia?.variants.find((v) => v.options.Finish === "Suede Velvet")?.images[0];
  const rainbow = dahliaRainbow(dahlia);
  const { heroImage, heroAlt } = store.home;

  return (
    <>
      {/* Hero: campaign photo under a water surface you can touch. */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pt-6 pb-20 sm:px-6 md:min-h-[calc(100svh-6.5rem)] md:grid-cols-[1fr_1.05fr] md:py-10">
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
        <div className="relative order-1 aspect-[4/5] overflow-hidden rounded-sm md:order-2 md:max-h-[calc(100svh-9rem)] md:justify-self-end md:w-full">
          <Image src={heroImage} alt={heroAlt} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          <WaterRipple src={heroImage} />
          <p className="label pointer-events-none absolute bottom-4 left-4 rounded-full bg-bg/60 px-3 py-1.5 text-ink backdrop-blur-sm">
            Touch the water
          </p>
        </div>
      </section>

      {rainbow.length > 0 && (
        <section aria-labelledby="spiral-heading" className="py-16">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
            <p className="label text-gold">Most loved</p>
            <h2 id="spiral-heading" className="mt-3 font-serif text-5xl sm:text-7xl">
              Every colour of the Dahlia
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">
              48 colours and finishes. Drag to spin, tap a bag to make it yours.
            </p>
          </div>
          <SpiralGallery items={rainbow} />
        </section>
      )}

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
            <p className="mt-6 max-w-md text-lg text-muted">
              An exploration of softness, depth, and quiet presence. Our signature Dahlia Mini in suede velvet, for
              evenings that linger.
            </p>
            <Link href={`/collections/${velvet.slug}`} className="label mt-8 inline-block border-b border-current pb-1 hover:text-accent">
              Explore the edit
            </Link>
          </div>
        </section>
      )}

      <Testimonials />

      <BoxGrid className="border-y border-line">
        <section
          aria-labelledby="circle-heading"
          className="mx-auto flex max-w-3xl flex-col items-center px-4 py-28 text-center sm:py-36"
        >
          <p className="label text-gold">The Inner Circle</p>
          <h2 id="circle-heading" className="mt-4 font-serif text-5xl leading-none sm:text-7xl">
            First to know, <em className="text-muted">first to carry.</em>
          </h2>
          <p className="mt-6 max-w-md text-lg text-muted">
            Exclusive drops. Early access. Thoughtful design updates. No spam, ever.
          </p>
          <div className="mt-10 flex w-full justify-center">
            <NewsletterForm />
          </div>
        </section>
      </BoxGrid>

      <section className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
        <p className="label text-gold">Follow along</p>
        <a href={store.social.instagram} className="font-serif text-5xl transition-colors hover:text-accent sm:text-7xl">
          @by.nimiie
        </a>
        <p className="text-muted">
          New drops, styling and behind the scenes on{" "}
          <a href={store.social.instagram} className="underline underline-offset-4 hover:text-ink">Instagram</a> and{" "}
          <a href={store.social.tiktok} className="underline underline-offset-4 hover:text-ink">TikTok</a>.
        </p>
      </section>
    </>
  );
}
