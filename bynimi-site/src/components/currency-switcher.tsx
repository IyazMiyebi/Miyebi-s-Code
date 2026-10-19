"use client";

import { useSyncExternalStore } from "react";
import { CURRENCIES, CURRENCY_COOKIE, DEFAULT_CURRENCY, isCurrency, type CurrencyCode } from "@/lib/currency";

// The current currency lives on <html data-currency>, set before paint by
// currencyGuard. Changing it here flips every price on the page at once (CSS
// does the showing and hiding) and saves the choice for next time.

const listeners = new Set<() => void>();

function read(): CurrencyCode {
  const value = document.documentElement.dataset.currency;
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}

function choose(code: CurrencyCode) {
  document.documentElement.dataset.currency = code;
  document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function CurrencySwitcher({ className = "" }: { className?: string }) {
  const current = useSyncExternalStore(subscribe, read, () => DEFAULT_CURRENCY);
  return (
    <label className={`label relative inline-flex items-center ${className}`}>
      <span className="sr-only">Currency</span>
      <select
        value={current}
        onChange={(e) => isCurrency(e.target.value) && choose(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-4 text-muted transition-colors hover:text-ink focus:text-ink"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code} className="bg-bg text-ink">
            {c.symbol} {c.code}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-0 text-[0.6rem]">
        ▾
      </span>
    </label>
  );
}
