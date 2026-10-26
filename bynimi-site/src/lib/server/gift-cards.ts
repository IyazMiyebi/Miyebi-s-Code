import "server-only";
import type { CurrencyCode } from "@/lib/currency";
import { normaliseGiftCardCode } from "@/lib/gift-cards";
import { adminDb } from "./admin-db";
import { notifyGiftCardPaid } from "./notify";
import { verifyPayment } from "./paystack";

export type GiftCard = {
  reference: string;
  code: string;
  status: "pending" | "active" | "void";
  currency: CurrencyCode;
  amount: number;
  balance: number;
  amountNgn: number;
  buyerName: string;
  buyerEmail: string;
  recipientName: string | null;
  recipientEmail: string | null;
  message: string | null;
  expiresAt: string | null;
};

const FIELDS =
  "reference, code, status, currency, amount, balance, amount_ngn, buyer_name, buyer_email, recipient_name, recipient_email, message, expires_at";

type Row = {
  reference: string; code: string; status: GiftCard["status"]; currency: string; amount: string; balance: string;
  amount_ngn: number; buyer_name: string; buyer_email: string; recipient_name: string | null;
  recipient_email: string | null; message: string | null; expires_at: string | null;
};

const fromRow = (r: Row): GiftCard => ({
  reference: r.reference,
  code: r.code,
  status: r.status,
  currency: r.currency.trim() as CurrencyCode,
  amount: Number(r.amount),
  balance: Number(r.balance),
  amountNgn: r.amount_ngn,
  buyerName: r.buyer_name,
  buyerEmail: r.buyer_email,
  recipientName: r.recipient_name,
  recipientEmail: r.recipient_email,
  message: r.message,
  expiresAt: r.expires_at,
});

export async function getGiftCardPurchase(reference: string) {
  const { data } = await adminDb().from("gift_cards").select(FIELDS).eq("reference", reference).maybeSingle();
  return data ? fromRow(data as Row) : null;
}

/** Balance lookup by code, for the "check your balance" form. Active cards only. */
export async function findGiftCard(code: string) {
  const normalised = normaliseGiftCardCode(code);
  if (!normalised) return null;
  const { data } = await adminDb().from("gift_cards").select(FIELDS).eq("code", normalised).eq("status", "active").maybeSingle();
  return data ? fromRow(data as Row) : null;
}

/**
 * Checks a gift card purchase with Paystack and activates the card. Like
 * confirmPayment for orders: the return page and the webhook both call it,
 * and the emails go out once.
 */
export async function confirmGiftCardPayment(reference: string): Promise<"paid" | "already_paid" | "unpaid"> {
  // Only the status, and not via getGiftCardPurchase: Next.js reuses identical
  // reads within one page render, so that would hand the confirmation page
  // this pre-payment copy of the card.
  const { data: existing } = await adminDb().from("gift_cards").select("status").eq("reference", reference).maybeSingle();
  if (existing && existing.status !== "pending") return "already_paid";
  const tx = await verifyPayment(reference);
  if (tx.status !== "success" || tx.currency !== "NGN") return "unpaid";
  const { data, error } = await adminDb().rpc("mark_gift_card_paid", {
    ref: reference,
    paid_kobo: tx.amount,
    paystack_ref: String(tx.id),
  });
  if (error) throw error;
  if (data !== "paid") return "already_paid";
  const card = await getGiftCardPurchase(reference);
  if (card) await notifyGiftCardPaid(card).catch((e) => console.error("gift card emails failed", e));
  return "paid";
}
