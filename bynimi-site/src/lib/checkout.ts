// Order pricing. Pure functions shared by the checkout page (to show totals)
// and the server (which re-prices everything from the database before
// charging; the browser's numbers are never trusted).
//
// Items use the regional price rule in currency.ts (₦35,499 / 34.99). Delivery
// fees are real costs set in Naira, so overseas customers see them converted
// at the day's exchange rate. Paystack charges in Naira: a foreign total is
// converted at the same rate and rounded up to the next whole Naira.

import { priceIn, type CurrencyCode } from "./currency";

export type PricedLine = { sku: string; priceNgn: number; quantity: number };
export type Zone = { id: string; priceNgn: number; freeOrdersLeft: number };
export type Discount = { code: string; kind: "percent" | "fixed_ngn"; value: number };

export type Quote = {
  currency: CurrencyCode;
  /** Naira per one unit of `currency` (1 for NGN). */
  fxRate: number;
  lines: { sku: string; quantity: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  shipping: number;
  freeShipping: boolean;
  discount: number;
  total: number;
  /** What Paystack charges, in whole Naira. */
  totalNgn: number;
};

/** Round to the currency's smallest unit: whole Naira, or cents. */
export function roundMoney(currency: CurrencyCode, amount: number) {
  return currency === "NGN" ? Math.round(amount) : Math.round(amount * 100) / 100;
}

/** A Naira amount (delivery fee, fixed discount) shown in another currency. */
export function convertNgn(currency: CurrencyCode, ngn: number, fxRate: number) {
  return currency === "NGN" ? ngn : roundMoney(currency, ngn / fxRate);
}

export function quote({
  currency,
  fxRate,
  lines,
  zone,
  discount,
}: {
  currency: CurrencyCode;
  fxRate: number;
  lines: PricedLine[];
  zone: Zone | null;
  discount: Discount | null;
}): Quote {
  const rate = currency === "NGN" ? 1 : fxRate;
  const priced = lines.map((l) => {
    const unitPrice = priceIn(currency, l.priceNgn);
    return { sku: l.sku, quantity: l.quantity, unitPrice, lineTotal: roundMoney(currency, unitPrice * l.quantity) };
  });
  const subtotal = roundMoney(currency, priced.reduce((sum, l) => sum + l.lineTotal, 0));
  const freeShipping = Boolean(zone && zone.priceNgn > 0 && zone.freeOrdersLeft > 0);
  const shipping = zone && !freeShipping ? convertNgn(currency, zone.priceNgn, rate) : 0;

  let off = 0;
  if (discount?.kind === "percent") off = roundMoney(currency, (subtotal * discount.value) / 100);
  if (discount?.kind === "fixed_ngn") off = convertNgn(currency, discount.value, rate);
  off = Math.min(off, subtotal); // a discount never touches delivery

  const total = roundMoney(currency, subtotal + shipping - off);
  const totalNgn = currency === "NGN" ? total : Math.ceil(total * rate);
  return { currency, fxRate: rate, lines: priced, subtotal, shipping, freeShipping, discount: off, total, totalNgn };
}

/** Short order codes like BN-7K3F9Q, without look-alike characters. */
export function orderReference(random: (n: number) => Uint8Array) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "BN-" + [...random(6)].map((b) => alphabet[b % alphabet.length]).join("");
}
