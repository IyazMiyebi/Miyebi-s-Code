import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Paystack's hosted payment page: card, bank transfer and USSD.
// https://paystack.com/docs/api/transaction/
// PAYSTACK_API_URL only exists so tests can point this at a stand-in.

const api = () => process.env.PAYSTACK_API_URL ?? "https://api.paystack.co";

function secret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Checkout isn't configured: set PAYSTACK_SECRET_KEY");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(api() + path, {
    ...init,
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.status) throw new Error(`Paystack ${path}: ${res.status} ${body?.message ?? ""}`);
  return body.data as T;
}

/** Start a payment; returns the Paystack page to send the customer to. */
export async function initializePayment(p: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  const data = await call<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: p.email,
      amount: p.amountKobo,
      currency: "NGN",
      reference: p.reference,
      callback_url: p.callbackUrl,
      metadata: p.metadata,
    }),
  });
  return data.authorization_url;
}

export type PaystackTransaction = { status: string; reference: string; amount: number; currency: string; id: number };

/** Ask Paystack directly whether a payment went through (never trust the redirect alone). */
export function verifyPayment(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Webhooks are signed with HMAC-SHA512 of the raw body, keyed with the secret key. */
export function isValidSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
