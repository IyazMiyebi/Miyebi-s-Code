"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { buyGiftCard, checkGiftCardBalance, type BalanceState, type BuyGiftCardState } from "@/app/actions/gift-cards";
import { useCurrency } from "@/components/currency-switcher";
import { HangingCards } from "@/components/effects/hanging-cards";
import { Wordmark } from "@/components/wordmark";
import { formatAmount, type CurrencyCode } from "@/lib/currency";
import { GIFT_CARD_AMOUNTS } from "@/lib/gift-cards";

const input =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 placeholder:text-muted focus:border-ink focus:outline-none";

export function GiftCardFace({ currency, amount, className = "" }: { currency: CurrencyCode; amount: number | null; className?: string }) {
  return (
    <span
      className={`relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-2xl p-5 text-[#f2eadf] shadow-2xl ring-1 ring-white/10 ${className}`}
      style={{ background: "radial-gradient(120% 140% at 0% 0%, #7a1e2c 0%, #2a0f14 55%, #120809 100%)" }}
    >
      {/* The hole it hangs from. */}
      <span aria-hidden className="absolute top-2.5 left-1/2 size-3 -translate-x-1/2 rounded-full bg-bg ring-1 ring-[#c9a46a]/60" />
      <span className="label pt-3 text-[#c9a46a]">Gift card</span>
      <span>
        <span className="block font-serif text-4xl leading-none sm:text-5xl">{amount ? formatAmount(currency, amount) : "…"}</span>
        <Wordmark className="mt-3 block text-lg text-[#f2eadf]/80" />
      </span>
    </span>
  );
}

export function GiftCardShop() {
  const currency = useCurrency();
  const limits = GIFT_CARD_AMOUNTS[currency];
  const [choice, setChoice] = useState<number | "custom">(1);
  const [custom, setCustom] = useState("");
  const amount = choice === "custom" ? Number(custom.replace(/,/g, "")) || null : limits.presets[choice];
  const [state, action, pending] = useActionState<BuyGiftCardState, FormData>(buyGiftCard, { status: "idle" });
  const fields = state.status === "error" ? state.fields : null;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "redirect") window.location.assign(state.url); // Paystack's secure payment page
  }, [state]);

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[1fr_440px]">
      <HangingCards
        items={[{ id: "gift-card", label: "Gift card: choose an amount" }]}
        onSelect={() => formRef.current?.querySelector<HTMLInputElement>("input[name=choice]:checked")?.focus()}
        renderCard={() => <GiftCardFace currency={currency} amount={amount} className="w-72 sm:w-96" />}
      />

      <form ref={formRef} action={action} className="space-y-8 rounded-2xl border border-line bg-surface p-6">
        <input type="hidden" name="currency" value={currency} />
        <input type="hidden" name="amount" value={amount ?? ""} />
        <fieldset>
          <legend className="label mb-3 text-muted">Amount</legend>
          <div className="grid grid-cols-2 gap-2">
            {limits.presets.map((p, i) => (
              <label key={p} className="cursor-pointer rounded-xl border border-line px-4 py-3 text-center has-checked:border-ink has-checked:bg-bg has-focus-visible:ring-2 has-focus-visible:ring-accent">
                <input type="radio" name="choice" checked={choice === i} onChange={() => setChoice(i)} className="sr-only" />
                {formatAmount(currency, p)}
              </label>
            ))}
            <label className="col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 has-checked:border-ink has-checked:bg-bg has-focus-visible:ring-2 has-focus-visible:ring-accent">
              <input type="radio" name="choice" checked={choice === "custom"} onChange={() => setChoice("custom")} className="sr-only" />
              <span className="shrink-0">Other amount</span>
              <input
                inputMode="decimal"
                placeholder={`From ${formatAmount(currency, limits.min)}`}
                aria-label="Your amount"
                value={custom}
                onFocus={() => setChoice("custom")}
                onChange={(e) => setCustom(e.target.value.replace(/[^\d.,]/g, ""))}
                className="min-w-0 flex-1 bg-transparent text-right placeholder:text-muted focus:outline-none"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="label mb-3 text-muted">Who it&apos;s for (optional)</legend>
          <input name="recipientName" placeholder="Their name" defaultValue={fields?.recipientName} maxLength={120} className={input} />
          <input name="recipientEmail" type="email" placeholder="Their email, to send it to them" defaultValue={fields?.recipientEmail} className={input} />
          <textarea name="message" placeholder="A message to go with it" defaultValue={fields?.message} rows={3} maxLength={500} className={input} />
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="label mb-3 text-muted">From</legend>
          <input name="buyerName" required autoComplete="name" placeholder="Your name" defaultValue={fields?.buyerName} maxLength={120} className={input} />
          <input name="buyerEmail" required type="email" autoComplete="email" placeholder="Your email, for the receipt" defaultValue={fields?.buyerEmail} className={input} />
        </fieldset>

        {state.status === "error" && (
          <p role="alert" className="text-sm text-warning">
            {state.message}
          </p>
        )}
        <div>
          <button
            type="submit"
            disabled={pending || state.status === "redirect" || !amount}
            className="label w-full rounded-full bg-accent py-5 text-accent-ink transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {pending || state.status === "redirect" ? "Taking you to Paystack…" : `Buy a ${amount ? formatAmount(currency, amount) : ""} gift card`}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Secure payment by Paystack.
            {currency !== "NGN" && " Charged in Naira at today's rate."}
          </p>
        </div>
      </form>
    </div>
  );
}

export function BalanceCheck() {
  const [state, action, pending] = useActionState<BalanceState, FormData>(checkGiftCardBalance, { status: "idle" });
  return (
    <form action={action} className="max-w-md">
      <label htmlFor="balance-code" className="label mb-3 block text-muted">
        Check a balance
      </label>
      <div className="flex gap-2">
        <input
          id="balance-code"
          name="code"
          required
          placeholder="NIMI-XXXX-XXXX-XXXX"
          defaultValue={state.status === "error" ? state.code : undefined}
          className={`${input} uppercase`}
        />
        <button type="submit" disabled={pending} className="label rounded-xl border border-line px-5 hover:border-ink disabled:opacity-50">
          Check
        </button>
      </div>
      <p role="status" className="mt-3 min-h-6 text-sm">
        {state.status === "found" && (
          <>
            <span className="text-success">{state.code}: {state.balance} left.</span>{" "}
            <span className="text-muted">{state.expires}</span>
          </>
        )}
        {state.status === "error" && <span className="text-warning">{state.message}</span>}
      </p>
    </form>
  );
}
