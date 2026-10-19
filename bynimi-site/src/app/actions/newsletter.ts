"use server";

import { createClient } from "@supabase/supabase-js";

export type NewsletterState =
  | { status: "idle" }
  | { status: "joined"; email: string }
  | { status: "error"; message: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function joinNewsletter(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const email = String(form.get("email") ?? "").trim();
  // Hidden field real people never fill in; bots usually do.
  if (form.get("company")) return { status: "joined", email };
  if (email.length > 254 || !EMAIL.test(email)) {
    return { status: "error", message: "That email doesn't look quite right." };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { status: "error", message: "Sign-ups aren't open yet. Please try again soon." };
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.from("newsletter_subscribers").insert({ email, source: "home" });

  // 23505 = already on the list. Treat it as success rather than revealing
  // who's subscribed.
  if (error && error.code !== "23505") {
    console.error("newsletter insert failed", error);
    return { status: "error", message: "We couldn't add you just now. Please try again." };
  }
  return { status: "joined", email };
}
