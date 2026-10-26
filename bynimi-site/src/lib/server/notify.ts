import "server-only";
import { formatAmount } from "@/lib/currency";
import { store } from "@/lib/store";
import type { GiftCard } from "./gift-cards";
import type { OrderSummary } from "./orders";

// Order emails through Resend (https://resend.com). Without RESEND_API_KEY
// they're logged instead, so checkout never fails because email is down.
// Until bynimiie.com is verified in Resend, only the account's own address
// can receive mail; the customer email starts working after that.

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email skipped: no RESEND_API_KEY] to=${to} subject=${subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Bags by Nimi <onboarding@resend.dev>", to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

function itemsTable(o: OrderSummary) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${escape(i.name)}${i.variantLabel ? ` <span style="color:#6e625a">(${escape(i.variantLabel)})</span>` : ""} × ${i.quantity}</td>` +
        `<td style="padding:6px 0;text-align:right">${formatAmount(o.currency, i.unitPrice * i.quantity)}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:bold" : "color:#6e625a"}">${label}</td><td style="padding:4px 0;text-align:right;${bold ? "font-weight:bold" : ""}">${value}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
    ${line("Delivery", o.shipping ? formatAmount(o.currency, o.shipping) : "Free")}
    ${o.discount ? line("Discount", "−" + formatAmount(o.currency, o.discount)) : ""}
    ${line("Total", formatAmount(o.currency, o.total), true)}
    ${o.giftCard ? line("Paid by gift card", formatAmount(o.currency, o.giftCard)) : ""}
    ${o.currency !== "NGN" && o.totalNgn ? line("Charged", formatAmount("NGN", o.totalNgn)) : ""}</table>`;
}

const wrap = (body: string) =>
  `<div style="font-family:Georgia,serif;max-width:520px;margin:auto;color:#1c1714;line-height:1.5">${body}</div>`;

export async function notifyOrderPaid(o: OrderSummary) {
  await Promise.all([
    send(
      o.email,
      `Your Bags by Nimi order ${o.reference}`,
      wrap(`<h1 style="font-weight:normal">Thank you, ${escape(o.firstName)}.</h1>
        <p>Your order <b>${o.reference}</b> is confirmed. Orders are dispatched the same or next day; Nimi will be in touch on WhatsApp about delivery (${escape(o.zoneName)}).</p>
        ${itemsTable(o)}
        <p style="color:#6e625a">Questions? Reply to this email or message us on WhatsApp: ${store.phone}.</p>`),
    ),
    send(
      process.env.ORDER_NOTIFY_EMAIL ?? store.email,
      `New order ${o.reference}: ${formatAmount(o.currency, o.total)}`,
      wrap(`<h1 style="font-weight:normal">New order ${o.reference}</h1>
        <p>${escape(o.firstName)} (${escape(o.email)}) · ${escape(o.zoneName)}</p>
        ${itemsTable(o)}
        <p>Full details, address and phone are in Supabase: Table Editor → orders.</p>`),
    ),
  ]);
}

export async function notifyGiftCardPaid(g: GiftCard) {
  const amount = formatAmount(g.currency, g.amount);
  const expires = g.expiresAt ? new Date(g.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  const card = `<div style="background:#2a0f14;color:#f2eadf;border-radius:16px;padding:28px;margin:24px 0">
      <p style="margin:0;color:#c9a46a;letter-spacing:2px;font-size:12px">BAGS BY NIMI · GIFT CARD</p>
      <p style="margin:12px 0 0;font-size:36px">${amount}</p>
      <p style="margin:16px 0 0;font-family:monospace;font-size:20px;letter-spacing:2px">${g.code}</p>
      ${expires ? `<p style="margin:8px 0 0;font-size:13px;color:#a39385">Valid until ${expires}</p>` : ""}
    </div>`;
  const to = g.recipientEmail ?? g.buyerEmail;
  const forName = g.recipientName ?? g.buyerName;
  await Promise.all([
    send(
      to,
      g.recipientEmail ? `${g.buyerName} sent you a Bags by Nimi gift card` : "Your Bags by Nimi gift card",
      wrap(`<h1 style="font-weight:normal">Hello ${escape(forName.split(" ")[0])},</h1>
        <p>${g.recipientEmail ? `${escape(g.buyerName)} has sent you a gift card to spend at Bags by Nimi.` : "Here's your gift card."}</p>
        ${g.message ? `<blockquote style="border-left:2px solid #c9a46a;margin:0;padding-left:16px;font-style:italic">${escape(g.message)}</blockquote>` : ""}
        ${card}
        <p>Spend it at <a href="${store.url}">${store.url.replace("https://", "")}</a>: enter the code at checkout. Anything left over stays on the card for next time.</p>`),
    ),
    // A receipt for the buyer, when the card went to someone else.
    g.recipientEmail &&
      send(
        g.buyerEmail,
        `Your gift card for ${g.recipientName ?? g.recipientEmail} is on its way`,
        wrap(`<h1 style="font-weight:normal">Thank you, ${escape(g.buyerName.split(" ")[0])}.</h1>
          <p>We've emailed a ${amount} gift card to ${escape(g.recipientName ?? "")} (${escape(g.recipientEmail)}). The code, in case you'd like to pass it on yourself:</p>
          ${card}`),
      ),
    send(
      process.env.ORDER_NOTIFY_EMAIL ?? store.email,
      `Gift card sold: ${amount}`,
      wrap(`<h1 style="font-weight:normal">Gift card sold: ${amount}</h1>
        <p>Bought by ${escape(g.buyerName)} (${escape(g.buyerEmail)})${g.recipientEmail ? ` for ${escape(g.recipientName ?? "")} (${escape(g.recipientEmail)})` : ""}.</p>
        <p>Details are in Supabase: Table Editor → gift_cards (${g.reference}).</p>`),
    ),
  ]);
}
