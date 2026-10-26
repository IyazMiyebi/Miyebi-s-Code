"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { roundMoney } from "@/lib/checkout";
import { formatAmount, isCurrency } from "@/lib/currency";
import { GIFT_CARD_AMOUNTS, giftCardCode, giftCardReference } from "@/lib/gift-cards";
import { adminDb } from "@/lib/server/admin-db";
import { nairaPerUnit } from "@/lib/server/fx";
import { findGiftCard } from "@/lib/server/gift-cards";
import { initializePayment } from "@/lib/server/paystack";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const text = (form: FormData, name: string, max: number) => String(form.get(name) ?? "").trim().slice(0, max);

export type BuyGiftCardState =
  | { status: "idle" }
  | { status: "redirect"; url: string }
  | { status: "error"; message: string; fields: Record<string, string> };

/**
 * Creates a pending gift card and returns the Paystack page to pay on. The
 * card only becomes spendable once Paystack confirms the payment.
 */
export async function buyGiftCard(_: BuyGiftCardState, form: FormData): Promise<BuyGiftCardState> {
  const fields = {
    currency: text(form, "currency", 3),
    amount: text(form, "amount", 12),
    buyerName: text(form, "buyerName", 120),
    buyerEmail: text(form, "buyerEmail", 254),
    recipientName: text(form, "recipientName", 120),
    recipientEmail: text(form, "recipientEmail", 254),
    message: text(form, "message", 500),
  };
  const fail = (message: string): BuyGiftCardState => ({ status: "error", message, fields });

  const currency = isCurrency(fields.currency) ? fields.currency : "NGN";
  const limits = GIFT_CARD_AMOUNTS[currency];
  const amount = roundMoney(currency, Number(fields.amount.replace(/,/g, "")));
  if (!Number.isFinite(amount) || amount < limits.min || amount > limits.max) {
    return fail(`Please choose an amount between ${formatAmount(currency, limits.min)} and ${formatAmount(currency, limits.max)}.`);
  }
  if (!fields.buyerName) return fail("Please add your name.");
  if (!EMAIL.test(fields.buyerEmail)) return fail("Please check your email address.");
  if (fields.recipientEmail && !EMAIL.test(fields.recipientEmail)) return fail("Please check the recipient's email address.");

  let fxRate: number;
  try {
    const { data } = await adminDb().from("currencies").select("code, ngn_per_unit");
    const fallback = Object.fromEntries((data ?? []).map((c) => [c.code.trim(), Number(c.ngn_per_unit)]));
    fxRate = await nairaPerUnit(currency, fallback);
  } catch (e) {
    console.error("gift card rate failed", e);
    return fail("Gift cards are unavailable just now. Please try again in a moment.");
  }
  const amountNgn = currency === "NGN" ? amount : Math.ceil(amount * fxRate);

  // Random reference and code; on the rare clash, try again.
  let reference = "";
  for (let attempt = 0; attempt < 3 && !reference; attempt++) {
    const candidate = giftCardReference((n) => randomBytes(n));
    const { error } = await adminDb()
      .from("gift_cards")
      .insert({
        reference: candidate,
        code: giftCardCode((n) => randomBytes(n)),
        currency,
        amount,
        balance: amount,
        fx_rate: fxRate,
        amount_ngn: amountNgn,
        buyer_name: fields.buyerName,
        buyer_email: fields.buyerEmail,
        recipient_name: fields.recipientName || null,
        recipient_email: fields.recipientEmail || null,
        message: fields.message || null,
      });
    if (!error) reference = candidate;
    else if (error.code !== "23505") {
      console.error("gift card insert failed", error);
      return fail("We couldn't start your gift card just now. Please try again.");
    }
  }
  if (!reference) return fail("We couldn't start your gift card just now. Please try again.");

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  try {
    const url = await initializePayment({
      email: fields.buyerEmail,
      amountKobo: amountNgn * 100,
      reference,
      callbackUrl: `${origin}/gift-cards/complete?reference=${reference}`,
      metadata: { gift_card_reference: reference, currency_shown: currency, amount_shown: amount },
    });
    return { status: "redirect", url };
  } catch (e) {
    console.error("Paystack initialize failed (gift card)", e);
    return fail("We couldn't reach the payment page. Please try again.");
  }
}

export type BalanceState =
  | { status: "idle" }
  | { status: "found"; code: string; balance: string; expires: string }
  | { status: "error"; message: string; code: string };

export async function checkGiftCardBalance(_: BalanceState, form: FormData): Promise<BalanceState> {
  const code = text(form, "code", 40);
  try {
    const card = await findGiftCard(code);
    if (!card) return { status: "error", message: "We couldn't find that gift card. Please check the code.", code };
    const expired = card.expiresAt && Date.parse(card.expiresAt) < Date.now();
    return {
      status: "found",
      code: card.code,
      balance: formatAmount(card.currency, card.balance),
      expires: expired
        ? "Expired"
        : card.expiresAt
          ? `Valid until ${new Date(card.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
          : "",
    };
  } catch (e) {
    console.error("balance check failed", e);
    return { status: "error", message: "We couldn't check that just now. Please try again.", code };
  }
}
