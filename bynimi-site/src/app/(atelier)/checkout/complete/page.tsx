import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatAmount } from "@/lib/currency";
import { confirmPayment, getOrderSummary } from "@/lib/server/orders";
import { ClearCart } from "./clear-cart";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

// Paystack sends the customer back here with ?reference=BN-…. The payment is
// checked with Paystack directly before anything is shown as paid.
export default function Complete({ searchParams }: PageProps<"/checkout/complete">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Suspense fallback={<p className="font-serif text-4xl">Confirming your payment…</p>}>
        <Result searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Result({ searchParams }: Pick<PageProps<"/checkout/complete">, "searchParams">) {
  // Payment checks only ever run for a real visitor's request, never while
  // Next.js prerenders or prefetches the page.
  await connection();
  const { reference } = await searchParams;
  const ref = typeof reference === "string" && /^BN-[A-Z0-9]{6,12}$/.test(reference) ? reference : null;
  if (!ref) return <Problem title="We couldn't find that order." />;

  let state: Awaited<ReturnType<typeof confirmPayment>> | "error";
  try {
    state = await confirmPayment(ref);
  } catch (e) {
    console.error("confirm on return failed", e);
    state = "error";
  }
  const order = await getOrderSummary(ref).catch(() => null);
  if (!order) return <Problem title="We couldn't find that order." />;

  if (state === "unpaid" || state === "error") {
    return (
      <Problem
        title={state === "error" ? "We're still confirming your payment." : "Your payment didn't go through."}
        reference={ref}
      >
        {state === "error"
          ? "If you were charged, your order is safe: we'll confirm it by email shortly."
          : "Nothing was charged. Your bag is still saved, so you can try again."}
      </Problem>
    );
  }

  const money = (n: number) => formatAmount(order.currency, n);
  return (
    <div className="page-in">
      <ClearCart />
      <p className="label text-success">Order {order.reference} · paid</p>
      <h1 className="mt-3 font-serif text-6xl leading-none">Thank you, {order.firstName}.</h1>
      <p className="mt-5 text-lg text-muted">
        Your order is confirmed and on its way to Nimi. Orders are dispatched the same or next day, and we&apos;ll be in
        touch on WhatsApp about delivery ({order.zoneName}). A receipt is on its way to {order.email}.
      </p>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {order.items.map((i, n) => (
          <li key={n} className="flex items-center gap-4 py-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface">
              {i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-cover" />}
            </div>
            <div className="flex-1">
              <p>{i.name}</p>
              <p className="text-sm text-muted">
                {i.variantLabel ? `${i.variantLabel} · ` : ""}× {i.quantity}
              </p>
            </div>
            <p>{money(i.unitPrice * i.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{order.shipping ? money(order.shipping) : "Free"}</dd></div>
        {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−{money(order.discount)}</dd></div>}
        <div className="flex justify-between text-lg"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        {order.giftCard > 0 && <div className="flex justify-between"><dt className="text-muted">Paid by gift card</dt><dd>{money(order.giftCard)}</dd></div>}
        {order.currency !== "NGN" && order.totalNgn > 0 && <div className="flex justify-between text-muted"><dt>Charged</dt><dd>{formatAmount("NGN", order.totalNgn)}</dd></div>}
      </dl>
      <Link href="/shop" className="label mt-10 inline-block rounded-full bg-accent px-6 py-3.5 text-accent-ink">
        Keep shopping
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
        <Link href="/checkout" className="label rounded-full bg-accent px-6 py-3.5 text-accent-ink">
          Back to checkout
        </Link>
        <WhatsAppLink
          message={`Hi Nimi! I need help with my order${reference ? ` ${reference}` : ""}.`}
          className="label rounded-full border border-line px-6 py-3.5 hover:border-ink"
        >
          Message Nimi
        </WhatsAppLink>
      </div>
    </div>
  );
}
