"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { quoteCheckout, startCheckout, type CheckoutQuote } from "@/app/actions/checkout";
import { useCurrency } from "@/components/currency-switcher";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { correctCart, useCart } from "@/lib/cart";
import { convertNgn } from "@/lib/checkout";
import { formatAmount, type CurrencyCode } from "@/lib/currency";
import type { ShippingZone } from "@/lib/product";

const COUNTRY_NAMES: Record<string, string> = {
  NG: "Nigeria",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  FR: "France",
  DE: "Germany",
  IT: "Italy",
  IE: "Ireland",
  ZA: "South Africa",
  AU: "Australia",
};

const DEFAULT_COUNTRY: Record<CurrencyCode, string> = { NGN: "NG", GBP: "GB", USD: "US", EUR: "FR", CAD: "CA" };

const input =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 placeholder:text-muted focus:border-ink focus:outline-none";

export function CheckoutForm({ zones }: { zones: ShippingZone[] }) {
  const cart = useCart();
  const currency = useCurrency();
  const countries = useMemo(() => [...new Set(zones.flatMap((z) => z.countries))], [zones]);

  const [country, setCountry] = useState<string | null>(null);
  const chosenCountry = country ?? (countries.includes(DEFAULT_COUNTRY[currency]) ? DEFAULT_COUNTRY[currency] : "NG");
  const countryZones = zones.filter((z) => z.countries.includes(chosenCountry));
  const [zoneId, setZoneId] = useState<string | null>(null);
  const zone = countryZones.find((z) => z.id === zoneId) ?? null;

  const [contact, setContact] = useState({ email: "", name: "", phone: "" });
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "", postcode: "" });
  const [note, setNote] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [giftInput, setGiftInput] = useState("");
  const [giftCode, setGiftCode] = useState<string | null>(null);

  const [result, setResult] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, startPaying] = useTransition();

  const lines = useMemo(() => cart.map((l) => ({ sku: l.sku, quantity: l.quantity })), [cart]);
  const cartKey = JSON.stringify(lines);
  const emailForQuote = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email) ? contact.email : null;

  // Re-price on the server whenever something that affects the total changes.
  useEffect(() => {
    if (!lines.length) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await quoteCheckout({ lines, currency, zoneId: zone?.id ?? null, code, giftCode, email: emailForQuote });
      if (cancelled) return;
      if ("error" in r) {
        setQuoteError(r.error);
        return;
      }
      setQuoteError(null);
      setResult(r);
      if (r.problems.length) {
        setNotices(r.problems.map((p) => p.message));
        correctCart(r.problems);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cartKey stands in for `lines`
  }, [cartKey, currency, zone?.id, code, giftCode, emailForQuote]);

  if (!cart.length) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <p className="font-serif text-4xl">Your bag is empty.</p>
        {notices.map((n) => (
          <p key={n} className="mt-3 text-warning">
            {n}
          </p>
        ))}
        <Link href="/shop" className="label mt-8 rounded-full bg-accent px-6 py-3.5 text-accent-ink">
          Shop the collection
        </Link>
      </div>
    );
  }

  const q = result?.quote;
  const money = (amount: number) => formatAmount(q?.currency ?? currency, amount);
  const zoneFee = (z: ShippingZone) => {
    if (z.price_ngn === 0) return "Free";
    if (z.free_orders_left > 0) return "Free (launch offer)";
    if (currency === "NGN") return formatAmount("NGN", z.price_ngn);
    return q && q.currency === currency ? `≈ ${formatAmount(currency, convertNgn(currency, z.price_ngn, q.fxRate))}` : "…";
  };
  const ready = Boolean(q && zone && !quoteError);

  function pay(e: React.FormEvent) {
    e.preventDefault();
    setPayError(null);
    startPaying(async () => {
      const r = await startCheckout({
        lines,
        currency,
        zoneId: zone?.id ?? null,
        code,
        giftCode,
        email: contact.email,
        name: contact.name,
        phone: contact.phone,
        address: { ...address, country: chosenCountry },
        note,
      });
      if ("url" in r) {
        window.location.assign(r.url); // Paystack's secure payment page (or the confirmation)
        return;
      }
      setPayError(r.error);
      if (r.problems?.length) {
        setNotices(r.problems.map((p) => p.message));
        correctCart(r.problems);
      }
    });
  }

  return (
    <form onSubmit={pay} className="grid gap-12 lg:grid-cols-[1fr_400px]">
      <div className="space-y-10">
        {notices.length > 0 && (
          <div role="alert" className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
            {notices.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
        )}

        <Section title="Contact">
          <input required type="email" autoComplete="email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={input} />
          <input required autoComplete="name" placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className={input} />
          <input required type="tel" autoComplete="tel" placeholder="Phone (WhatsApp), e.g. +234 803 000 0000" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={input} />
        </Section>

        <Section title="Delivery">
          <label className="block">
            <span className="label mb-2 block text-muted">Country</span>
            <select
              value={chosenCountry}
              onChange={(e) => {
                setCountry(e.target.value);
                setZoneId(null);
              }}
              className={input}
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {COUNTRY_NAMES[c] ?? c}
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-muted">
            Somewhere else?{" "}
            <WhatsAppLink message="Hi Nimi! Do you deliver to my country?" className="underline underline-offset-4 hover:text-ink">
              Ask Nimi on WhatsApp
            </WhatsAppLink>
          </p>

          <fieldset>
            <legend className="label mb-2 text-muted">{chosenCountry === "NG" ? "Area or pick-up" : "Delivery option"}</legend>
            <ul className="space-y-2">
              {countryZones.map((z) => (
                <li key={z.id}>
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 has-checked:border-ink has-checked:bg-surface">
                    <input type="radio" name="zone" required checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="mt-1 size-4 accent-[var(--accent)]" />
                    <span className="flex-1">
                      <span className="flex justify-between gap-3">
                        <span>{z.name}</span>
                        <span className="shrink-0 text-sm">{zoneFee(z)}</span>
                      </span>
                      {z.description && <span className="mt-0.5 block text-sm text-muted">{z.description}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          {zone && !zone.is_pickup && (
            <div className="space-y-3">
              <input required autoComplete="address-line1" placeholder="Address" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} className={input} />
              <input autoComplete="address-line2" placeholder="Apartment, landmark (optional)" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} className={input} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input required autoComplete="address-level2" placeholder="City / town" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className={input} />
                {chosenCountry === "NG" ? (
                  <input autoComplete="address-level1" placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className={input} />
                ) : (
                  <input required autoComplete="postal-code" placeholder="Postcode" value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value })} className={input} />
                )}
              </div>
            </div>
          )}
          <textarea placeholder="Note for Nimi (optional): gift message, delivery instructions…" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className={input} />
        </Section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="font-serif text-3xl">Your order</p>
          <ul className="mt-5 space-y-4">
            {cart.map((l) => {
              const priced = q?.lines.find((x) => x.sku === l.sku);
              return (
                <li key={l.sku} className="flex gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-bg">
                    {l.image && <Image src={l.image} alt="" fill sizes="64px" className="object-cover" />}
                    <span className="absolute top-0 right-0 grid size-5 place-items-center rounded-bl-md bg-ink text-xs text-bg">{l.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{l.name}</p>
                    {l.label && <p className="text-muted">{l.label}</p>}
                  </div>
                  <p className="text-sm">{priced ? money(priced.lineTotal) : "…"}</p>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Discount code</span>
              <input placeholder="Discount code" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} className={`${input} uppercase`} />
            </label>
            <button
              type="button"
              onClick={() => setCode(codeInput.trim() || null)}
              aria-label="Apply discount code"
              className="label rounded-xl border border-line px-4 hover:border-ink"
            >
              Apply
            </button>
          </div>
          {result?.discount && (
            <p className={`mt-2 text-sm ${result.discount.applied ? "text-success" : "text-warning"}`}>
              {result.discount.code}: {result.discount.message}
              {result.discount.applied && (
                <button
                  type="button"
                  onClick={() => {
                    setCode(null);
                    setCodeInput("");
                  }}
                  className="ml-2 underline"
                >
                  Remove
                </button>
              )}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Gift card code</span>
              <input placeholder="Gift card (NIMI-…)" value={giftInput} onChange={(e) => setGiftInput(e.target.value.toUpperCase())} className={`${input} uppercase`} />
            </label>
            <button
              type="button"
              onClick={() => setGiftCode(giftInput.trim() || null)}
              aria-label="Apply gift card"
              className="label rounded-xl border border-line px-4 hover:border-ink"
            >
              Apply
            </button>
          </div>
          {result?.giftCard && (
            <p className={`mt-2 text-sm ${result.giftCard.applied ? "text-success" : "text-warning"}`}>
              {result.giftCard.code}: {result.giftCard.message}
              {result.giftCard.applied && (
                <button
                  type="button"
                  onClick={() => {
                    setGiftCode(null);
                    setGiftInput("");
                  }}
                  className="ml-2 underline"
                >
                  Remove
                </button>
              )}
            </p>
          )}

          <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <Row label="Subtotal" value={q ? money(q.subtotal) : "…"} />
            <Row label="Delivery" value={!zone ? "Choose an option" : q ? (q.shipping ? money(q.shipping) : "Free") : "…"} />
            {q && q.discount > 0 && <Row label="Discount" value={`−${money(q.discount)}`} />}
            <div className="flex items-baseline justify-between border-t border-line pt-3 text-lg">
              <dt>Total</dt>
              <dd className="font-medium">{q ? money(q.total) : "…"}</dd>
            </div>
            {q && q.giftCard > 0 && (
              <>
                <Row label="Gift card" value={`−${money(q.giftCard)}`} />
                <div className="flex items-baseline justify-between text-lg">
                  <dt>To pay</dt>
                  <dd className="font-medium">{money(q.due)}</dd>
                </div>
              </>
            )}
            {q && q.currency !== "NGN" && q.due > 0 && (
              <p className="text-xs text-muted">
                Paystack charges in Naira: {formatAmount("NGN", q.totalNgn)}, at today&apos;s rate of{" "}
                {formatAmount("NGN", q.fxRate)} per {formatAmount(q.currency, 1).replace(/[\d.,]+$/, "")}1. Your bank converts it
                back, so your statement may differ slightly.
              </p>
            )}
          </dl>

          {(payError || quoteError) && (
            <p role="alert" className="mt-4 text-sm text-warning">
              {payError ?? quoteError}
            </p>
          )}

          <button
            type="submit"
            disabled={!ready || paying}
            className="label mt-6 w-full rounded-full bg-accent py-5 text-accent-ink transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {!q || !zone
              ? "Choose delivery to continue"
              : q.due === 0
                ? paying
                  ? "Placing your order…"
                  : "Place order, paid by gift card"
                : paying
                  ? "Taking you to Paystack…"
                  : `Pay ${money(q.due)}`}
          </button>
          <p className="mt-3 text-center text-xs text-muted">Secure payment by Paystack: card, bank transfer or USSD.</p>
        </div>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-3xl">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
