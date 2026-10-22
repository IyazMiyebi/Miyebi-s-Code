// Regional prices. Each product has one price in Naira; every currency's
// price comes from it by a fixed rule (agreed with Nimi, 19 Oct 2026):
//
//   Nigeria:     ₦35,500 -> ₦35,499       (one naira under a round price)
//   Everywhere:  ₦35,500 -> 34.99         (thousands of naira, rounded down,
//                                          less one cent; same number in
//                                          $, £, € and C$)
//
// The visitor's currency comes from their country (src/proxy.ts) and can be
// changed in the header. It's stored in a cookie that the inline script below
// reads before first paint, so pages stay prerendered and prices never flash.
//
// Shared by server and client code, so no React or Node imports here.

export const CURRENCIES = [
  { code: "NGN", symbol: "₦", label: "Naira" },
  { code: "USD", symbol: "$", label: "US dollar" },
  { code: "GBP", symbol: "£", label: "Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "CAD", symbol: "C$", label: "Canadian dollar" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const CURRENCY_COOKIE = "bn-currency";
export const DEFAULT_CURRENCY: CurrencyCode = "NGN";

const EURO_COUNTRIES = new Set(
  "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK AD MC SM VA ME XK".split(" "),
);

/** ISO country code (from Vercel's geo header) to the currency we price in. */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  const c = country?.toUpperCase() ?? "";
  switch (c) {
    case "":
    case "NG":
      return "NGN";
    case "GB":
    case "GG":
    case "JE":
    case "IM":
      return "GBP";
    case "CA":
      return "CAD";
    default:
      return EURO_COUNTRIES.has(c) ? "EUR" : "USD";
  }
}

export function isCurrency(code: string | undefined): code is CurrencyCode {
  return CURRENCIES.some((c) => c.code === code);
}

/** The price to show (and later charge) in `code`, from the Naira price. */
export function priceIn(code: CurrencyCode, ngn: number): number {
  if (ngn <= 0) return 0;
  if (code === "NGN") return ngn % 100 === 0 ? ngn - 1 : ngn;
  return Math.max(0.99, Math.floor(ngn / 1000) - 0.01);
}

const whole = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₦35,499 · $34.99 · C$34.99 */
export function formatPrice(code: CurrencyCode, ngn: number) {
  const symbol = CURRENCIES.find((c) => c.code === code)!.symbol;
  const amount = priceIn(code, ngn);
  return `${symbol}${code === "NGN" ? whole.format(amount) : cents.format(amount)}`;
}

/** An amount already in `code` (e.g. an order total): ₦38,949 · £57.43 */
export function formatAmount(code: CurrencyCode, amount: number) {
  const symbol = CURRENCIES.find((c) => c.code === code)!.symbol;
  return `${symbol}${code === "NGN" ? whole.format(amount) : cents.format(amount)}`;
}

/** Inline <head> script: show the saved currency's prices before first paint. */
export const currencyGuard = `try{var m=document.cookie.match(/(?:^|; )${CURRENCY_COOKIE}=([A-Z]{3})/);if(m)document.documentElement.dataset.currency=m[1]}catch(e){}`;
