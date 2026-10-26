import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { confirmGiftCardPayment, getGiftCardPurchase } from "@/lib/server/gift-cards";
import { GiftCardFace } from "../gift-card-shop";

export const metadata: Metadata = { title: "Gift card", robots: { index: false } };

// Paystack sends the buyer back here with ?reference=GC-…. The payment is
// checked with Paystack directly before the code is shown.
export default function GiftCardComplete({ searchParams }: PageProps<"/gift-cards/complete">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Suspense fallback={<p className="font-serif text-4xl">Confirming your payment…</p>}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: Pick<PageProps<"/gift-cards/complete">, "searchParams">) {
  await connection();
  const { reference } = await searchParams;
  const ref = typeof reference === "string" && /^GC-[A-Z0-9]{8,16}$/.test(reference) ? reference : null;
  if (!ref) return <Problem title="We couldn't find that gift card." />;

  let state: Awaited<ReturnType<typeof confirmGiftCardPayment>> | "error";
  try {
    state = await confirmGiftCardPayment(ref);
  } catch (e) {
    console.error("gift card confirm failed", e);
    state = "error";
  }
  const card = await getGiftCardPurchase(ref).catch(() => null);
  if (!card) return <Problem title="We couldn't find that gift card." />;
  if (state === "unpaid" || state === "error" || card.status !== "active") {
    return (
      <Problem title={state === "error" ? "We're still confirming your payment." : "Your payment didn't go through."} reference={ref}>
        {state === "error"
          ? "If you were charged, your gift card is safe: we'll email it to you shortly."
          : "Nothing was charged. You can try again whenever you like."}
      </Problem>
    );
  }

  const expires = card.expiresAt
    ? new Date(card.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return (
    <div className="page-in">
      <p className="label text-success">Gift card · paid</p>
      <h1 className="mt-3 font-serif text-6xl leading-none">Thank you, {card.buyerName.split(" ")[0]}.</h1>
      <p className="mt-5 text-lg text-muted">
        {card.recipientEmail
          ? `We've emailed the gift card to ${card.recipientName ?? card.recipientEmail}, with your message, and a receipt to ${card.buyerEmail}.`
          : `We've emailed the gift card to ${card.buyerEmail}.`}{" "}
        Here&apos;s the code too, in case you&apos;d like to pass it on yourself.
      </p>
      <GiftCardFace currency={card.currency} amount={card.amount} className="mt-10 w-full max-w-sm" />
      <p className="mt-6 font-mono text-2xl tracking-widest select-all">{card.code}</p>
      {expires && <p className="mt-2 text-sm text-muted">Valid until {expires}. Enter the code at checkout.</p>}
      <Link href="/shop" className="label mt-10 inline-block rounded-full bg-accent px-6 py-3.5 text-accent-ink">
        Visit the shop
      </Link>
    </div>
  );
}

function Problem({ title, reference, children }: { title: string; reference?: string; children?: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-serif text-5xl leading-none">{title}</h1>
      {children && <p className="mt-4 text-lg text-muted">{children}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/gift-cards" className="label rounded-full bg-accent px-6 py-3.5 text-accent-ink">
          Back to gift cards
        </Link>
        <WhatsAppLink
          message={`Hi Nimi! I need help with my gift card${reference ? ` ${reference}` : ""}.`}
          withPage={false}
          className="label rounded-full border border-line px-6 py-3.5 hover:border-ink"
        >
          Message Nimi
        </WhatsAppLink>
      </div>
    </div>
  );
}
