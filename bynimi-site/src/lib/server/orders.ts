import "server-only";
import { quote, type Discount, type Quote } from "@/lib/checkout";
import { formatAmount, type CurrencyCode } from "@/lib/currency";
import { normaliseGiftCardCode } from "@/lib/gift-cards";
import { adminDb } from "./admin-db";
import { nairaPerUnit } from "./fx";
import { notifyOrderPaid } from "./notify";
import { verifyPayment } from "./paystack";

export type CartRequestLine = { sku: string; quantity: number };

export type PricedItem = {
  sku: string;
  productSlug: string;
  name: string;
  variantLabel: string;
  image: string | null;
  quantity: number;
  priceNgn: number;
  stock: number;
};

export type CartProblem = { sku: string; message: string; quantity: number };

export type PricedCart = {
  items: PricedItem[];
  problems: CartProblem[];
  quote: Quote;
  zone: { id: string; name: string; countries: string[]; isPickup: boolean } | null;
  discount: { code: string; applied: boolean; message: string } | null;
  giftCard: { code: string; applied: boolean; message: string } | null;
};

type VariantRow = {
  sku: string;
  options: Record<string, string>;
  price_ngn: number;
  stock: number;
  images: string[];
  products: { slug: string; name: string; option_names: string[]; images: string[]; is_published: boolean } | null;
};

/**
 * Prices a bag from fresh database values (never the browser's numbers):
 * current prices and stock, the delivery zone, any discount code, and the
 * day's exchange rate, and any gift card. Quantities above what's in stock are reduced, with a
 * problem reported for each so the bag can be corrected.
 */
export async function priceCart({
  lines,
  currency,
  zoneId,
  code,
  giftCode = null,
  email,
}: {
  lines: CartRequestLine[];
  currency: CurrencyCode;
  zoneId: string | null;
  code: string | null;
  giftCode?: string | null;
  email: string | null;
}): Promise<PricedCart> {
  const db = adminDb();
  const wanted = new Map<string, number>();
  for (const l of lines.slice(0, 50)) {
    const qty = Math.min(20, Math.max(0, Math.floor(l.quantity)));
    if (l.sku && qty > 0) wanted.set(l.sku, (wanted.get(l.sku) ?? 0) + qty);
  }

  const [variants, zone, currencies] = await Promise.all([
    wanted.size
      ? db
          .from("product_variants")
          .select("sku, options, price_ngn, stock, images, products (slug, name, option_names, images, is_published)")
          .in("sku", [...wanted.keys()])
      : Promise.resolve({ data: [], error: null }),
    zoneId
      ? db.from("shipping_zones").select("id, name, countries, price_ngn, free_orders_left, is_pickup").eq("id", zoneId).eq("is_active", true).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("currencies").select("code, ngn_per_unit"),
  ]);
  if (variants.error) throw variants.error;
  if (zone.error) throw zone.error;

  const items: PricedItem[] = [];
  const problems: CartProblem[] = [];
  const rows = new Map(((variants.data ?? []) as unknown as VariantRow[]).map((v) => [v.sku, v]));
  for (const [sku, qty] of wanted) {
    const v = rows.get(sku);
    if (!v?.products?.is_published) {
      problems.push({ sku, quantity: 0, message: "One item is no longer available and was removed from your bag." });
      continue;
    }
    const name = v.products.name;
    const variantLabel = v.products.option_names.map((n) => v.options[n]).filter(Boolean).join(", ");
    const quantity = Math.min(qty, v.stock);
    if (quantity < qty) {
      problems.push({
        sku,
        quantity,
        message:
          quantity === 0
            ? `${name}${variantLabel ? ` (${variantLabel})` : ""} has just sold out. You can pre-order it from its page.`
            : `Only ${quantity} of ${name}${variantLabel ? ` (${variantLabel})` : ""} left, so we've updated your bag.`,
      });
    }
    if (quantity > 0) {
      items.push({
        sku,
        productSlug: v.products.slug,
        name,
        variantLabel,
        image: v.images[0] ?? v.products.images[0] ?? null,
        quantity,
        priceNgn: v.price_ngn,
        stock: v.stock,
      });
    }
  }

  // Discount code: active, in date, under its use limit, and first orders only
  // when it says so.
  let discount: Discount | null = null;
  let discountInfo: PricedCart["discount"] = null;
  const normalised = code?.trim().toUpperCase() || null;
  if (normalised) {
    const { data: dc } = await db.from("discount_codes").select("*").eq("code", normalised).maybeSingle();
    const now = Date.now();
    let message = "That code isn't valid.";
    let ok = false;
    if (dc?.is_active && (!dc.starts_at || Date.parse(dc.starts_at) <= now) && (!dc.ends_at || Date.parse(dc.ends_at) > now)) {
      if (dc.max_uses && dc.uses >= dc.max_uses) message = "That code has been fully used.";
      else if (dc.first_order_only && email && (await db.rpc("has_paid_order", { customer_email: email })).data) {
        message = "That code is for first orders only.";
      } else {
        ok = true;
        message = dc.kind === "percent" ? `${dc.value}% off your items` : "Discount applied";
        discount = { code: dc.code, kind: dc.kind, value: dc.value };
      }
    }
    discountInfo = { code: normalised, applied: ok, message };
  }

  // Gift card: active, in date, in this order's currency, with money on it.
  let giftCardBalance = 0;
  let giftInfo: PricedCart["giftCard"] = null;
  if (giftCode?.trim()) {
    const normalisedGift = normaliseGiftCardCode(giftCode);
    let message = "We couldn't find that gift card. Please check the code.";
    let ok = false;
    if (normalisedGift) {
      const { data: card } = await db
        .from("gift_cards")
        .select("status, currency, balance, expires_at")
        .eq("code", normalisedGift)
        .maybeSingle();
      if (card?.status === "active") {
        const balance = Number(card.balance);
        if (card.expires_at && Date.parse(card.expires_at) < Date.now()) message = "That gift card has expired.";
        else if (balance <= 0) message = "That gift card has been fully spent.";
        else if (card.currency.trim() !== currency) {
          message = `That gift card is in ${card.currency.trim()}. Switch the currency (top of the page) to ${card.currency.trim()} to use it.`;
        } else {
          ok = true;
          giftCardBalance = balance;
          message = `Balance ${formatAmount(currency, balance)}`;
        }
      }
    }
    giftInfo = { code: normalisedGift ?? giftCode.trim().toUpperCase(), applied: ok, message };
  }

  const fallback = Object.fromEntries((currencies.data ?? []).map((c) => [c.code.trim(), Number(c.ngn_per_unit)]));
  const fxRate = await nairaPerUnit(currency, fallback);
  const z = zone.data;
  return {
    items,
    problems,
    quote: quote({
      currency,
      fxRate,
      lines: items.map((i) => ({ sku: i.sku, priceNgn: i.priceNgn, quantity: i.quantity })),
      zone: z ? { id: z.id, priceNgn: z.price_ngn, freeOrdersLeft: z.free_orders_left } : null,
      discount,
      giftCardBalance,
    }),
    zone: z ? { id: z.id, name: z.name, countries: z.countries, isPickup: z.is_pickup } : null,
    discount: discountInfo,
    giftCard: giftInfo,
  };
}

export type OrderSummary = {
  reference: string;
  status: string;
  firstName: string;
  email: string;
  currency: CurrencyCode;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  giftCard: number;
  totalNgn: number;
  zoneName: string;
  items: { name: string; variantLabel: string | null; quantity: number; unitPrice: number; image: string | null }[];
};

export async function getOrderSummary(reference: string): Promise<OrderSummary | null> {
  const { data } = await adminDb()
    .from("orders")
    .select("reference, status, name, email, currency, subtotal, shipping, discount, total, gift_card_amount, total_ngn, shipping_zones (name), order_items (name, variant_label, quantity, unit_price, image)")
    .eq("reference", reference)
    .maybeSingle();
  if (!data) return null;
  const d = data as unknown as {
    reference: string; status: string; name: string; email: string; currency: CurrencyCode;
    subtotal: string; shipping: string; discount: string; total: string; gift_card_amount: string; total_ngn: number;
    shipping_zones: { name: string } | null;
    order_items: { name: string; variant_label: string | null; quantity: number; unit_price: string; image: string | null }[];
  };
  return {
    reference: d.reference,
    status: d.status,
    firstName: d.name.split(" ")[0],
    email: d.email,
    currency: d.currency,
    subtotal: Number(d.subtotal),
    shipping: Number(d.shipping),
    discount: Number(d.discount),
    total: Number(d.total),
    giftCard: Number(d.gift_card_amount),
    totalNgn: d.total_ngn,
    zoneName: d.shipping_zones?.name ?? "",
    items: d.order_items.map((i) => ({ name: i.name, variantLabel: i.variant_label, quantity: i.quantity, unitPrice: Number(i.unit_price), image: i.image })),
  };
}

/**
 * Records an order as paid (once) and sends the emails the first time.
 * `paidKobo` is what Paystack took: 0 for an order a gift card paid in full.
 */
export async function recordPayment(reference: string, paidKobo: number, paystackRef: string | null): Promise<"paid" | "already_paid"> {
  const { data, error } = await adminDb().rpc("mark_order_paid", {
    ref: reference,
    paid_kobo: paidKobo,
    paystack_ref: paystackRef,
  });
  if (error) throw error;
  if (data !== "paid") return "already_paid";
  const summary = await getOrderSummary(reference);
  if (summary) await notifyOrderPaid(summary).catch((e) => console.error("order emails failed", e));
  return "paid";
}

/**
 * Checks a payment with Paystack and records it. Used by the return page and
 * the webhook; whichever gets there first records it and sends the emails.
 */
export async function confirmPayment(reference: string): Promise<"paid" | "already_paid" | "unpaid"> {
  // Already recorded (including orders a gift card paid in full, which never
  // went to Paystack): nothing to check.
  const { data: order } = await adminDb().from("orders").select("status").eq("reference", reference).maybeSingle();
  if (order && ["paid", "fulfilled", "refunded"].includes(order.status)) return "already_paid";
  const tx = await verifyPayment(reference);
  if (tx.status !== "success" || tx.currency !== "NGN") return "unpaid";
  return recordPayment(reference, tx.amount, String(tx.id));
}
