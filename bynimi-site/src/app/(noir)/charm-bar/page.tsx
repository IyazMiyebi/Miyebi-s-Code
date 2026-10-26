import type { Metadata } from "next";
import Link from "next/link";
import { getProduct, type Product } from "@/lib/catalog";
import { CharmBar } from "./charm-bar";

export const metadata: Metadata = {
  title: "The Charm Bar",
  description: "Cherries, bears, cats, initials and mini scarves: clip one on and make your bag your own.",
};

const CHARMS = ["cute-cat-charm", "fluffy-cherry-charm", "initial-cherry-charm", "cute-bear-charm", "pastel-mini-scarf"];

export default async function CharmBarPage() {
  const products = (await Promise.all(CHARMS.map((slug) => getProduct(slug)))).filter((p): p is Product => Boolean(p));
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 md:pt-20">
        <p className="label text-gold">The Charm Bar</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <h1 className="max-w-3xl font-serif text-[clamp(3.25rem,9vw,8rem)] leading-[0.9] tracking-tight">
            Make it <em className="text-muted">yours.</em>
          </h1>
          <p className="max-w-sm text-muted">
            Clip on a cherry, a bear or your initial, or tie on a scarf. Give them a swing, then tap one to choose its colour.
          </p>
        </div>
      </section>

      {/* The charms hang from a rail: drag, throw, or tap to choose. */}
      <section aria-label="Charms" className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6">
        <CharmBar products={products} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Link href="/collections/bag-accessories" className="label border-b border-current pb-1 hover:text-accent">
          See every charm and scarf
        </Link>
      </section>
    </>
  );
}
