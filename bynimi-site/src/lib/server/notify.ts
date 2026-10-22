import "server-only";
import { formatAmount } from "@/lib/currency";
import { store } from "@/lib/store";
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
    ${o.currency !== "NGN" ? line("Charged", formatAmount("NGN", o.totalNgn)) : ""}</table>`;
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
