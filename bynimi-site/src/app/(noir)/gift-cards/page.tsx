import type { Metadata } from "next";
import { DraftTag } from "@/components/info-page";
import { draft, giftCards } from "@/content/pages";
import { BalanceCheck, GiftCardShop } from "./gift-card-shop";

export const metadata: Metadata = {
  title: "Gift cards",
  description: "A Bags by Nimi gift card, emailed with your message and spendable on anything in the shop.",
};

export default function GiftCards() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 md:pt-20">
        <p className="label text-gold">Gift cards</p>
        <h1 className="mt-4 max-w-4xl font-serif text-[clamp(3.25rem,9vw,8rem)] leading-[0.9] tracking-tight">
          Let them <em className="text-muted">choose.</em>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">{giftCards.intro}</p>
      </section>

      <section aria-label="Buy a gift card" className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6">
        <GiftCardShop />
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 border-t border-line px-4 py-16 sm:px-6 md:grid-cols-2">
        <BalanceCheck />
        <div>
          <h2 className="label flex flex-wrap items-center gap-3 text-muted">
            Good to know
            {draft && <DraftTag />}
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-muted marker:text-gold">
            {giftCards.terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
