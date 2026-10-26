import type { Metadata } from "next";
import { BoxGrid } from "@/components/effects/box-grid";
import { DraftTag } from "@/components/info-page";
import { NewsletterForm } from "@/components/newsletter-form";
import { draft, innerCircle } from "@/content/pages";

export const metadata: Metadata = {
  title: "The Inner Circle",
  description: "Early access to new drops and restocks, and rewards for every order. Join the Bags by Nimi Inner Circle.",
};

export default function InnerCircle() {
  return (
    <>
      <BoxGrid className="border-b border-line">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:py-32">
          <p className="label flex flex-wrap items-center justify-center gap-3 text-gold">
            The Inner Circle
            {draft && <DraftTag />}
          </p>
          <h1 className="mt-4 font-serif text-6xl leading-none sm:text-8xl">
            First to know, <em className="text-muted">first to carry.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">{innerCircle.intro}</p>
          <div className="mt-10 flex w-full justify-center">
            <NewsletterForm />
          </div>
        </section>
      </BoxGrid>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-serif text-4xl">What members get</h2>
        <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {innerCircle.perks.map((perk, i) => (
            <li key={perk.title} className="bg-bg p-6">
              <p className="label text-gold">0{i + 1}</p>
              <h3 className="mt-3 font-serif text-2xl">{perk.title}</h3>
              <p className="mt-2 text-sm text-muted">{perk.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
