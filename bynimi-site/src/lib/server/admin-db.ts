import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase with the secret (service role) key: bypasses row level security,
// so it's for trusted server code only (orders, payments). Never import this
// from a client component; "server-only" makes that a build error.
export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Checkout isn't configured: set SUPABASE_SECRET_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}
