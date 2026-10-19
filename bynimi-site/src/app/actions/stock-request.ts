"use server";

import { createClient } from "@supabase/supabase-js";
import { isCurrency } from "@/lib/currency";

export type StockRequestState =
  | { status: "idle" }
  | { status: "sent"; kind: "notify" | "preorder" }
  // `fields` echoes what was typed: React clears a form after every
  // submission, and the form puts these back so nothing has to be retyped.
  | { status: "error"; message: string; fields: Record<string, string> };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const field = (form: FormData, name: string, max: number) => String(form.get(name) ?? "").trim().slice(0, max);

/** Pre-order or "notify me" for a sold-out variant (see the stock_requests migration). */
export async function requestStock(_prev: StockRequestState, form: FormData): Promise<StockRequestState> {
  const kind = form.get("kind") === "preorder" ? "preorder" : "notify";
  // Honeypot: hidden from people, tempting to bots.
  if (form.get("company")) return { status: "sent", kind };

  const email = field(form, "email", 254);
  const name = field(form, "name", 120);
  const phone = field(form, "phone", 40);
  const note = field(form, "note", 1000);
  const quantity = Math.min(20, Math.max(1, Math.floor(Number(form.get("quantity")) || 1)));
  const currency = String(form.get("currency") ?? "");

  const fields = { email, name, phone, note, quantity: String(quantity) };
  const fail = (message: string): StockRequestState => ({ status: "error", message, fields });

  if (!EMAIL.test(email)) return fail("That email doesn't look quite right.");
  if (kind === "preorder") {
    if (!name) return fail("Please tell us your name.");
    if (!PHONE.test(phone)) return fail("Please add a WhatsApp number, so Nimi can confirm your pre-order.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return fail("Requests aren't open yet. Please message Nimi on WhatsApp.");

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.from("stock_requests").insert({
    kind,
    product_slug: field(form, "product", 120),
    sku: field(form, "sku", 200),
    variant_label: field(form, "variant", 200) || null,
    email,
    name: name || null,
    phone: phone || null,
    quantity,
    note: note || null,
    currency: isCurrency(currency) ? currency : null,
  });
  if (error) {
    console.error("stock request insert failed", error);
    return fail("We couldn't send that just now. Please try again, or message Nimi on WhatsApp.");
  }
  return { status: "sent", kind };
}
