"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { draft, helpNav } from "@/content/pages";

// Shared layout for the help pages: title, a "Draft" tag while the words are
// placeholders (src/content/pages.ts), and the help menu alongside.
export function InfoPage({
  eyebrow = "Help",
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 md:grid-cols-[220px_1fr] md:py-20">
      <nav aria-label="Help" className="order-2 md:order-1">
        <h2 className="label mb-4 text-muted">Help</h2>
        <ul className="space-y-2 md:sticky md:top-24">
          {helpNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className="text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="order-1 max-w-2xl min-w-0 md:order-2">
        <p className="label flex flex-wrap items-center gap-3 text-gold">
          {eyebrow}
          {draft && <DraftTag />}
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-none sm:text-7xl">{title}</h1>
        {intro && <p className="mt-6 text-lg text-muted">{intro}</p>}
        <div className="mt-12 space-y-12">{children}</div>
      </article>
    </div>
  );
}

export function DraftTag() {
  return (
    <span
      title="Placeholder text written for the build. Nimi to edit."
      className="label rounded-full border border-dashed border-warning px-2.5 py-1 text-warning"
    >
      Draft, for Nimi to edit
    </span>
  );
}

export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-3xl">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed">{children}</div>
    </section>
  );
}
