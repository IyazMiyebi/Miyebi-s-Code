"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cartCount, setCartOpen, setQuantity, useCart, useCartOpen } from "@/lib/cart";
import { Price, PriceTotal } from "./price";

/** "Bag (2)" in the header: opens the drawer. */
export function CartButton() {
  const cart = useCart();
  const count = cartCount(cart);
  return (
    <button type="button" onClick={() => setCartOpen(true)} className="label hover:text-accent" aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}>
      Bag ({count})
    </button>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const open = useCartOpen();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // A modal <dialog>: focus is kept inside, Esc closes it.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Your bag"
      onClose={() => setCartOpen(false)}
      onClick={(e) => e.target === e.currentTarget && setCartOpen(false)}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-md bg-bg p-0 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <p className="font-serif text-3xl">Your bag</p>
        <button type="button" onClick={() => setCartOpen(false)} className="label p-2">
          Close
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="font-serif text-3xl">Your bag is empty.</p>
          <Link href="/shop" onClick={() => setCartOpen(false)} className="label mt-6 rounded-full bg-accent px-6 py-3.5 text-accent-ink">
            Shop the collection
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
            {cart.map((l) => (
              <li key={l.sku} className="flex gap-4 py-5">
                <div className="relative size-24 shrink-0 overflow-hidden bg-surface">
                  {l.image && <Image src={l.image} alt="" fill sizes="96px" className="object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="font-serif text-xl leading-tight">{l.name}</p>
                  {l.label && <p className="text-sm text-muted">{l.label}</p>}
                  <p className="label mt-1">
                    <Price ngn={l.priceNgn} />
                  </p>
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <div className="flex items-center rounded-full border border-line">
                      <button
                        type="button"
                        onClick={() => setQuantity(l.sku, l.quantity - 1)}
                        aria-label={`One fewer ${l.name}`}
                        className="px-3 py-1.5 hover:text-accent"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-sm" aria-live="polite">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(l.sku, l.quantity + 1)}
                        disabled={l.quantity >= l.stock}
                        aria-label={`One more ${l.name}`}
                        className="px-3 py-1.5 hover:text-accent disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <button type="button" onClick={() => setQuantity(l.sku, 0)} className="label text-muted hover:text-ink">
                      Remove
                    </button>
                  </div>
                  {l.quantity >= l.stock && <p className="mt-1 text-xs text-warning">That&apos;s all we have.</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="space-y-3 border-t border-line px-6 py-5">
            <div className="flex items-baseline justify-between">
              <span className="label text-muted">Subtotal</span>
              <PriceTotal className="text-xl" lines={cart.map((l) => ({ ngn: l.priceNgn, quantity: l.quantity }))} />
            </div>
            <p className="text-sm text-muted">Delivery and any discount code are added at checkout.</p>
            <Link
              href="/checkout"
              onClick={() => setCartOpen(false)}
              className="label block rounded-full bg-accent py-5 text-center text-accent-ink transition-opacity hover:opacity-85"
            >
              Checkout
            </Link>
          </div>
        </>
      )}
    </dialog>
  );
}
