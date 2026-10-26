// Gift card amounts, codes and references. No server-only imports: the
// purchase form and checkout use these too.

import type { CurrencyCode } from "./currency";

/** Suggested amounts, and the custom amount's limits, per currency. */
export const GIFT_CARD_AMOUNTS: Record<CurrencyCode, { presets: number[]; min: number; max: number }> = {
  NGN: { presets: [20000, 35000, 50000, 100000], min: 5000, max: 1000000 },
  USD: { presets: [25, 50, 75, 100], min: 10, max: 1000 },
  GBP: { presets: [25, 50, 75, 100], min: 10, max: 1000 },
  EUR: { presets: [25, 50, 75, 100], min: 10, max: 1000 },
  CAD: { presets: [25, 50, 75, 100], min: 10, max: 1000 },
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const pick = (bytes: Uint8Array) => [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");

/** What the recipient types at checkout, e.g. NIMI-7K3F-9Q2M-XW4P (60 random bits). */
export function giftCardCode(random: (n: number) => Uint8Array) {
  const s = pick(random(12));
  return `NIMI-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

/** The purchase's payment reference, e.g. GC-7K3F9Q2MXW. */
export function giftCardReference(random: (n: number) => Uint8Array) {
  return "GC-" + pick(random(10));
}

/**
 * Tidies a typed code: any case, spaces or missing dashes, with or without
 * the NIMI prefix. Returns null if it can't be a gift card code.
 */
export function normaliseGiftCardCode(input: string) {
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("NIMI") && s.length === 16) s = s.slice(4);
  if (!/^[A-Z0-9]{12}$/.test(s)) return null;
  return `NIMI-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}
