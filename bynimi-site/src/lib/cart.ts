"use client";

import { useSyncExternalStore } from "react";

// The bag, kept in the browser (localStorage) so it survives reloads and
// stays in step across tabs. Each line keeps a snapshot of what was added
// (name, photo, price) for display; checkout re-prices everything on the
// server, so a stale snapshot can never change what's charged.

export type CartLine = {
  sku: string;
  quantity: number;
  slug: string;
  name: string;
  label: string;
  image: string | null;
  priceNgn: number;
  stock: number;
};

const KEY = "bn-cart-v1";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let lines: CartLine[] | null = null;
let open = false;

function load(): CartLine[] {
  if (lines) return lines;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    lines = Array.isArray(parsed) ? parsed.filter((l) => l?.sku && l.quantity > 0) : [];
  } catch {
    lines = [];
  }
  return lines;
}

function save(next: CartLine[]) {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    lines = null; // another tab changed the bag
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export function useCartOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}

export function setCartOpen(value: boolean) {
  open = value;
  listeners.forEach((l) => l());
}

export function addToCart(line: Omit<CartLine, "quantity">, quantity = 1) {
  const current = load();
  const existing = current.find((l) => l.sku === line.sku);
  const next = existing
    ? current.map((l) => (l.sku === line.sku ? { ...l, ...line, quantity: Math.min(l.quantity + quantity, line.stock) } : l))
    : [...current, { ...line, quantity: Math.min(quantity, line.stock) }];
  save(next);
}

export function setQuantity(sku: string, quantity: number) {
  save(load().flatMap((l) => (l.sku !== sku ? [l] : quantity > 0 ? [{ ...l, quantity: Math.min(quantity, l.stock) }] : [])));
}

/** Apply the server's corrections (sold out, fewer left). */
export function correctCart(fixes: { sku: string; quantity: number }[]) {
  const bySku = new Map(fixes.map((f) => [f.sku, f.quantity]));
  save(
    load().flatMap((l) => {
      if (!bySku.has(l.sku)) return [l];
      const q = bySku.get(l.sku)!;
      return q > 0 ? [{ ...l, quantity: q, stock: q }] : [];
    }),
  );
}

export function clearCart() {
  save([]);
}

export const cartCount = (cart: CartLine[]) => cart.reduce((n, l) => n + l.quantity, 0);
