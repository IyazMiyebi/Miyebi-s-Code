"use client";

import { useActionState, useState } from "react";
import { requestStock, type StockRequestState } from "@/app/actions/stock-request";
import { useCurrency } from "@/components/currency-switcher";
import type { Product, Variant } from "@/lib/product";
import { WhatsAppLink } from "@/components/whatsapp-link";

// What a sold-out variant offers instead of "Add to bag": a pre-order (Nimi
// confirms on WhatsApp and arranges payment) or a note when it's back.
// The parent keys this by SKU, so switching colour starts afresh.

const input =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 placeholder:text-muted focus:border-ink focus:outline-none";

export function SoldOutActions({ product, variant, label }: { product: Product; variant: Variant; label: string }) {
  const [mode, setMode] = useState<"preorder" | "notify" | null>(null);
  const [state, action, pending] = useActionState<StockRequestState, FormData>(requestStock, { status: "idle" });
  const currency = useCurrency();
  const typed = state.status === "error" ? state.fields : {};
  const chat = `Hi Nimi! I'd like to pre-order ${product.name}${label ? ` (${label})` : ""}.`;

  if (state.status === "sent") {
    return (
      <div role="status" className="page-in mt-4 rounded-2xl border border-line bg-surface p-6">
        {state.kind === "preorder" ? (
          <>
            <p className="font-serif text-2xl">Your pre-order request is in.</p>
            <p className="mt-2 text-muted">
              Nimi will message you on WhatsApp to confirm the details and arrange payment, usually within a day.
            </p>
            <WhatsAppLink message={chat} className="label mt-5 inline-block rounded-full bg-accent px-6 py-3.5 text-accent-ink">
              Message Nimi now
            </WhatsAppLink>
          </>
        ) : (
          <>
            <p className="font-serif text-2xl">We&apos;ll let you know.</p>
            <p className="mt-2 text-muted">You&apos;ll get an email as soon as {label || "this piece"} is back.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      {mode === null && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setMode("preorder")}
            className="label w-full rounded-full bg-accent px-8 py-5 text-accent-ink transition-opacity hover:opacity-85"
          >
            Pre-order this piece
          </button>
          <button
            type="button"
            onClick={() => setMode("notify")}
            className="label w-full rounded-full border border-line px-8 py-4 transition-colors hover:border-ink"
          >
            Notify me when it&apos;s back
          </button>
        </div>
      )}

      {mode !== null && (
        <form action={action} className="page-in space-y-3 rounded-2xl border border-line bg-surface/60 p-5">
          <p className="font-serif text-2xl">{mode === "preorder" ? "Pre-order" : "Notify me"}</p>
          <p className="text-sm text-muted">
            {mode === "preorder"
              ? `${product.name}${label ? `, ${label}` : ""}. No payment now: Nimi will confirm on WhatsApp.`
              : "One email when it's back in stock. Nothing else."}
          </p>
          <input type="hidden" name="kind" value={mode} />
          <input type="hidden" name="product" value={product.slug} />
          <input type="hidden" name="sku" value={variant.sku} />
          <input type="hidden" name="variant" value={label} />
          <input type="hidden" name="currency" value={currency} />
          <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

          {mode === "preorder" && (
            <>
              <label className="block">
                <span className="sr-only">Your name</span>
                <input name="name" required autoComplete="name" placeholder="Your name" defaultValue={typed.name} className={input} />
              </label>
              <label className="block">
                <span className="sr-only">WhatsApp number</span>
                <input
                  name="phone"
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="WhatsApp number, e.g. +234 803 000 0000"
                  defaultValue={typed.phone}
                  className={input}
                />
              </label>
            </>
          )}
          <label className="block">
            <span className="sr-only">Email</span>
            <input name="email" required type="email" autoComplete="email" placeholder="Email" defaultValue={typed.email} className={input} />
          </label>
          {mode === "preorder" && (
            <div className="flex gap-3">
              <label className="w-24 shrink-0">
                <span className="sr-only">Quantity</span>
                <input name="quantity" type="number" min={1} max={20} defaultValue={typed.quantity ?? 1} className={input} />
              </label>
              <label className="flex-1">
                <span className="sr-only">Anything else? (optional)</span>
                <input name="note" placeholder="Anything else? (optional)" defaultValue={typed.note} className={input} />
              </label>
            </div>
          )}

          {state.status === "error" && (
            <p role="alert" className="text-sm text-warning">
              {state.message}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="label flex-1 rounded-full bg-accent px-6 py-4 text-accent-ink transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {pending ? "Sending…" : mode === "preorder" ? "Request pre-order" : "Notify me"}
            </button>
            <button type="button" onClick={() => setMode(null)} className="label px-3 py-4 text-muted hover:text-ink">
              Cancel
            </button>
          </div>
          {mode === "preorder" && (
            <p className="text-center text-xs text-muted">
              Prefer to chat?{" "}
              <WhatsAppLink message={chat} className="underline underline-offset-4 hover:text-ink">
                Pre-order on WhatsApp
              </WhatsAppLink>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
