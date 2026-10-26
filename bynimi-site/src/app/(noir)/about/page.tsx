import type { Metadata } from "next";
import Link from "next/link";
import { AsciiPortrait } from "@/components/effects/ascii-portrait";
import { Runaround } from "@/components/effects/runaround";
import { DraftTag } from "@/components/info-page";
import { draft, story } from "@/content/pages";

export const metadata: Metadata = {
  title: "Our story",
  description: "How Bags by Nimi began in Lagos: handmade mini bags, small batches, and charms to make every bag your own.",
};

const PRODUCTS = "https://dodptt9f4zk9h.cloudfront.net/stores/8942/products";
// Placeholders from the current store until Nimi's own photos arrive.
const PORTRAIT = `${PRODUCTS}/5a33bc5f6763aadff9977ceabaca2a41ee1c9907.jpeg`;
const BAG = `${PRODUCTS}/87461da1279ce95fe3206a613e5c97aa03f0644d.jpeg`;

export default function About() {
  const [first, second, ...rest] = story.paragraphs;
  return (
    <>
      {/* Header: the campaign photo, drawn in type. */}
      <section className="relative">
        <AsciiPortrait
          src={PORTRAIT}
          alt="A woman holding The Avaia bag, drawn in gold characters"
          className="h-[68svh] min-h-[420px] w-full"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/70 to-transparent pt-32">
          <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
            <p className="label flex flex-wrap items-center gap-3 text-gold">
              {story.eyebrow}
              {draft && <DraftTag />}
            </p>
            <h1 className="mt-4 max-w-4xl font-serif text-[clamp(3rem,9vw,8rem)] leading-[0.9] tracking-tight">
              {story.title}
            </h1>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <p className="max-w-4xl font-serif text-3xl leading-tight sm:text-4xl">{story.intro}</p>

        {/* The story wraps around a swaying bag that drifts down as you read. */}
        <div className="mt-16 max-w-3xl text-lg leading-relaxed text-ink/90">
          <Runaround src={BAG} alt="The Dahlia Mini in red">
            <p>{first}</p>
            <p className="mt-6">{second}</p>
            <blockquote className="my-10 border-l-2 border-gold pl-6 font-serif text-3xl leading-snug text-gold">
              {story.pullQuote}
            </blockquote>
            {rest.map((p) => (
              <p key={p} className="mt-6">
                {p}
              </p>
            ))}
          </Runaround>
        </div>
      </section>

      <section className="border-y border-line">
        <ul className="mx-auto grid max-w-7xl divide-y divide-line px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0">
          {story.values.map((v, i) => (
            <li key={v.title} className="py-10 md:px-8 md:first:pl-0 md:last:pr-0">
              <p className="label text-gold">0{i + 1}</p>
              <h2 className="mt-3 font-serif text-3xl">{v.title}</h2>
              <p className="mt-2 text-muted">{v.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-20 sm:px-6">
        <Link href="/shop" className="label rounded-full bg-accent px-7 py-4 text-accent-ink hover:opacity-85">
          Shop the collection
        </Link>
        <Link href="/lookbook" className="label rounded-full border border-line px-7 py-4 hover:border-ink">
          See the lookbook
        </Link>
      </section>
    </>
  );
}
