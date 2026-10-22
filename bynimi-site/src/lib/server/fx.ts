import "server-only";
import { cacheLife } from "next/cache";
import type { CurrencyCode } from "@/lib/currency";

// Naira per one unit of each currency, for charging overseas orders in Naira.
// From a free daily rates feed, cached for an hour; if the feed is down, the
// rates saved in the currencies table are used instead.
async function liveRates(): Promise<Record<string, number> | null> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/NGN");
    const data = await res.json();
    if (data.result !== "success") return null;
    const rates: Record<string, number> = {};
    for (const code of ["USD", "GBP", "EUR", "CAD"]) {
      const perNaira = Number(data.rates?.[code]);
      if (perNaira > 0) rates[code] = Math.round((1 / perNaira) * 100) / 100;
    }
    return rates;
  } catch {
    return null;
  }
}

export async function nairaPerUnit(currency: CurrencyCode, fallback: Record<string, number>): Promise<number> {
  if (currency === "NGN") return 1;
  const rate = (await liveRates())?.[currency] ?? fallback[currency];
  if (!rate || rate <= 0) throw new Error(`No exchange rate for ${currency}`);
  return rate;
}
