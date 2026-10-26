import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ImageTrail } from "@/components/effects/image-trail";
import { lookbook } from "@/content/lookbook";
import { variantHref } from "@/lib/variant-link";

export const metadata: Metadata = {
  title: "Lookbook",
  description: "The Dahlia Mini, the Avaia, the Liora and the Alissa Clutch, styled. Every photo links to the bag in it.",
};

const trail = lookbook.filter((p) => p.trail).map((p) => p.src);

export default function Lookbook() {
  return (
    <>
      {/* Photos spill out behind the cursor, or a finger dragging across. */}
      <ImageTrail images={trail} className="border-b border-line">
        <section className="mx-auto flex min-h-[calc(100svh-6.5rem)] max-w-7xl flex-col justify-between px-4 py-10 sm:px-6">
          <p className="label text-gold">Lookbook · Season one</p>
          <div>
            <h1 className="font-serif text-[clamp(4rem,14vw,13rem)] leading-[0.85] tracking-tight">
              Carried
              <br />
              <em className="text-muted">beautifully.</em>
            </h1>
            <p className="label mt-8 text-muted">
              <span className="hidden [@media(hover:hover)]:inline">Move your cursor</span>
              <span className="[@media(hover:hover)]:hidden">Drag your finger across</span>
              <span aria-hidden> ↘</span>
            </p>
          </div>
        </section>
      </ImageTrail>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <h2 className="sr-only">The photos</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6">
          {lookbook.map((p, i) => (
            <li key={p.src} className={i % 3 === 1 ? "md:translate-y-16" : undefined}>
              <Link href={variantHref(p.product, p.options)} className="group block">
                <div className="relative aspect-[930/1163] overflow-hidden rounded-lg bg-surface">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-silk group-hover:scale-105"
                  />
                </div>
                <p className="label mt-3 text-muted transition-colors group-hover:text-ink">
                  {p.caption} <span aria-hidden>→</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
