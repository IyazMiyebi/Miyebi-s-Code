"use server";

import { randomBytes } from "node:crypto";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { orderReference, type Quote } from "@/lib/checkout";
import { CATALOG_TAG } from "@/lib/catalog";
import { isCurrency, type CurrencyCode } from "@/lib/currency";
import { adminDb } from "@/lib/server/admin-db";
import { priceCart, recordPayment, type CartProblem, type CartRequestLine, type PricedCart } from "@/lib/server/orders";
import { initializePayment } from "@/lib/server/paystack";

export type CheckoutQuote = {
  quote: Quote;
  problems: CartProblem[];
  zone: PricedCart["zone"];
  discount: PricedCart["discount"];
  giftCard: PricedCart["giftCard"];
};

type QuoteInput = {
  lines: CartRequestLine[];
  currency: string;
  zoneId: string | null;
  code: string | null;
  giftCode?: string | null;
  email: string | null;
};

const currencyOf = (c: string): CurrencyCode => (isCurrency(c) ? c : "NGN");

/** Live totals for the checkout page as the customer fills it in. */
export async function quoteCheckout(input: QuoteInput): Promise<CheckoutQuote | { error: string }> {
  try {
    const priced = await priceCart({ ...input, currency: currencyOf(input.currency) });
    return { quote: priced.quote, problems: priced.problems, zone: priced.zone, discount: priced.discount, giftCard: priced.giftCard };
  } catch (e) {
    console.error("quote failed", e);
    return { error: "We couldn't work out your total just now. Please refresh and try again." };
  }
}

export type CheckoutDetails = QuoteInput & {
  name: string;
  phone: string;
  address: { line1: string; line2?: string; city: string; state?: string; postcode?: string; country: string };
  note?: string;
};

export type StartCheckoutResult =
  | { url: string }
  | { error: string; problems?: CartProblem[] };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const clean = (s: string | undefined, max: number) => (s ?? "").trim().slice(0, max);

/**
 * Re-prices the bag, reserves the stock (and any gift card amount) as a
 * pending order, and returns the Paystack page to pay on, or straight to the
 * confirmation when a gift card covers everything. Nothing the browser sends
 * about prices is used.
 */
export async function startCheckout(d: CheckoutDetails): Promise<StartCheckoutResult> {
  const email = clean(d.email ?? "", 254);
  const name = clean(d.name, 120);
  const phone = clean(d.phone, 40);
  const address = {
    line1: clean(d.address?.line1, 200),
    line2: clean(d.address?.line2, 200),
    city: clean(d.address?.city, 100),
    state: clean(d.address?.state, 100),
    postcode: clean(d.address?.postcode, 20),
    country: clean(d.address?.country, 2).toUpperCase(),
  };
  if (!EMAIL.test(email)) return { error: "Please check your email address." };
  if (!name) return { error: "Please add your name." };
  if (!PHONE.test(phone)) return { error: "Please add a phone number we can reach you on (WhatsApp is best)." };
  if (!d.zoneId) return { error: "Please choose a delivery option." };

  let priced: PricedCart;
  try {
    priced = await priceCart({ ...d, email, currency: currencyOf(d.currency) });
  } catch (e) {
    console.error("pricing failed", e);
    return { error: "Checkout is unavailable just now. Please try again in a moment." };
  }
  if (!priced.zone) return { error: "Please choose a delivery option." };
  if (!priced.zone.countries.includes(address.country)) return { error: "That delivery option doesn't go to the country you chose." };
  if (!priced.zone.isPickup && (!address.line1 || !address.city)) return { error: "Please add your delivery address." };
  if (priced.problems.length) return { error: "Some things in your bag have changed.", problems: priced.problems };
  if (!priced.items.length) return { error: "Your bag is empty." };
  if (d.code && !priced.discount?.applied) return { error: priced.discount?.message ?? "That code isn't valid." };
  if (d.giftCode && !priced.giftCard?.applied) return { error: priced.giftCard?.message ?? "That gift card can't be used." };

  const q = priced.quote;
  const db = adminDb();
  const items = priced.items.map((i, n) => ({
    sku: i.sku,
    product_slug: i.productSlug,
    name: i.name,
    variant_label: i.variantLabel || null,
    image: i.image,
    quantity: i.quantity,
    unit_price_ngn: i.priceNgn,
    unit_price: q.lines[n].unitPrice,
  }));

  // Reserve the stock. References are random; on the rare clash, try again.
  let reference = "";
  for (let attempt = 0; attempt < 3 && !reference; attempt++) {
    const candidate = orderReference((n) => randomBytes(n));
    const { error } = await db.rpc("create_order", {
      o: {
        reference: candidate,
        email,
        name,
        phone,
        address,
        shipping_zone_id: priced.zone.id,
        note: clean(d.note, 1000),
        discount_code: priced.discount?.applied ? priced.discount.code : null,
        free_shipping: q.freeShipping,
        currency: q.currency,
        subtotal: q.subtotal,
        shipping: q.shipping,
        discount: q.discount,
        total: q.total,
        fx_rate: q.fxRate,
        total_ngn: q.totalNgn,
        gift_card_code: q.giftCard > 0 ? priced.giftCard?.code : null,
        gift_card_amount: q.giftCard,
      },
      items,
    });
    if (!error) reference = candidate;
    else if (error.message.startsWith("out_of_stock")) {
      return { error: "Someone just bought the last one of something in your bag. Please review it and try again." };
    } else if (error.message.startsWith("gift_card")) {
      return { error: "Your gift card's balance has just changed. Please apply it again." };
    } else if (error.code !== "23505") {
      console.error("create_order failed", error);
      return { error: "We couldn't place your order just now. Please try again." };
    }
  }
  if (!reference) return { error: "We couldn't place your order just now. Please try again." };
  updateTag(CATALOG_TAG); // stock changed

  // Paid in full by gift card: no Paystack, straight to the confirmation.
  if (q.totalNgn === 0) {
    try {
      await recordPayment(reference, 0, null);
    } catch (e) {
      console.error("gift card order failed", e);
      return { error: "We couldn't place your order just now. Please try again." };
    }
    return { url: `/checkout/complete?reference=${reference}` };
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  try {
    const url = await initializePayment({
      email,
      amountKobo: q.totalNgn * 100,
      reference,
      callbackUrl: `${origin}/checkout/complete?reference=${reference}`,
      metadata: { order_reference: reference, currency_shown: q.currency, total_shown: q.total, gift_card_shown: q.giftCard },
    });
    return { url };
  } catch (e) {
    console.error("Paystack initialize failed", e);
    // Give the reserved stock straight back.
    await db.from("orders").update({ expires_at: new Date().toISOString() }).eq("reference", reference);
    await db.rpc("release_expired_orders");
    return { error: "We couldn't reach the payment page. Please try again." };
  }
}
