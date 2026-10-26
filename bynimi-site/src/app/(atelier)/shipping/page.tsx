import type { Metadata } from "next";
import { InfoPage, InfoSection } from "@/components/info-page";
import { shipping } from "@/content/pages";
import { getShippingZones, type ShippingZone } from "@/lib/catalog";
import { formatAmount } from "@/lib/currency";

export const metadata: Metadata = {
  title: "Shipping & delivery",
  description: "Delivery fees and times across Lagos, Nigeria and worldwide. Dispatched the same or next day.",
};

function fee(z: ShippingZone) {
  if (z.price_ngn === 0) return "Free";
  if (z.free_orders_left > 0) return `Free (launch offer, usually ${formatAmount("NGN", z.price_ngn)})`;
  return formatAmount("NGN", z.price_ngn);
}

export default async function Shipping() {
  // The same zones and fees checkout uses, so this page can't go out of date.
  const zones = await getShippingZones();
  const nigeria = zones.filter((z) => z.countries.includes("NG"));
  const groups = [
    { title: "Lagos", zones: nigeria.filter((z) => !z.is_pickup && z.id.startsWith("lagos-")) },
    { title: "Pick-up", zones: nigeria.filter((z) => z.is_pickup) },
    { title: "Rest of Nigeria", zones: nigeria.filter((z) => !z.is_pickup && !z.id.startsWith("lagos-")) },
    { title: "International", zones: zones.filter((z) => !z.countries.includes("NG")) },
  ].filter((g) => g.zones.length);

  return (
    <InfoPage title="Shipping & delivery" intro={shipping.intro}>
      <InfoSection title="How long it takes">
        <dl className="divide-y divide-line border-y border-line">
          {shipping.timings.map((t) => (
            <div key={t.where} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
              <dt>{t.where}</dt>
              <dd className="text-muted">{t.when}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>

      <InfoSection title="Delivery fees">
        {groups.length ? (
          <>
            {groups.map((g) => (
              <div key={g.title}>
                <h3 className="label mt-6 mb-2 text-muted">{g.title}</h3>
                <ul className="divide-y divide-line border-y border-line">
                  {g.zones.map((z) => (
                    <li key={z.id} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                      <span className="min-w-0">
                        {z.name}
                        {z.description && <span className="block text-sm text-muted">{z.description}</span>}
                      </span>
                      <span className="shrink-0">{fee(z)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-sm text-muted">
              Fees are set in Naira. Shopping in £, $, € or C$? Checkout shows the fee in your currency at the day&apos;s
              exchange rate.
            </p>
          </>
        ) : (
          <p className="text-muted">Delivery fees are shown at checkout once you choose your area.</p>
        )}
      </InfoSection>

      <InfoSection title="Good to know">
        <ul className="list-disc space-y-2 pl-5 marker:text-gold">
          {shipping.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </InfoSection>
    </InfoPage>
  );
}
