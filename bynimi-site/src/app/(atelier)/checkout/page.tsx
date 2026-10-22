import type { Metadata } from "next";
import { getShippingZones } from "@/lib/catalog";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function Checkout() {
  const zones = await getShippingZones();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="mb-10 font-serif text-6xl">Checkout</h1>
      {zones.length ? (
        <CheckoutForm zones={zones} />
      ) : (
        <p className="text-lg text-muted">Checkout opens very soon. In the meantime, order on WhatsApp.</p>
      )}
    </div>
  );
}
