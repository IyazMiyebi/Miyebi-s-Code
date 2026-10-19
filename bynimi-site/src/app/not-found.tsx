import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function NotFound() {
  return (
    <SiteShell theme="noir">
      <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <p className="label text-gold">404</p>
        <h1 className="mt-4 font-serif text-6xl leading-none sm:text-8xl">This bag has wandered off.</h1>
        <p className="mt-6 text-lg text-muted">The page you&apos;re looking for isn&apos;t here, but plenty of others are.</p>
        <Link href="/shop" className="label mt-10 rounded-full bg-accent px-7 py-4 text-accent-ink">
          Back to the shop
        </Link>
      </section>
    </SiteShell>
  );
}
