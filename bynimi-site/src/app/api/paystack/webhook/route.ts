import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { confirmGiftCardPayment } from "@/lib/server/gift-cards";
import { confirmPayment } from "@/lib/server/orders";
import { isValidSignature } from "@/lib/server/paystack";

// Paystack calls this when a payment succeeds, even if the customer closed
// the tab before returning to the site. Set it in Paystack: Settings →
// API Keys & Webhooks → Webhook URL = https://<site>/api/paystack/webhook
export async function POST(request: Request) {
  const raw = await request.text();
  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw) as { event: string; data?: { reference?: string } };
  const reference = event.data?.reference;
  if (event.event === "charge.success" && reference) {
    try {
      // Re-checks with Paystack rather than trusting the event body.
      if (reference.startsWith("BN-")) {
        await confirmPayment(reference);
        revalidateTag(CATALOG_TAG, { expire: 0 });
      } else if (reference.startsWith("GC-")) {
        await confirmGiftCardPayment(reference);
      }
    } catch (e) {
      console.error("webhook confirm failed", e);
      return new Response("Retry later", { status: 500 }); // Paystack retries
    }
  }
  return new Response("ok");
}
