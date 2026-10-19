import type { Metadata } from "next";
import { Price } from "@/components/price";
import { ProductCard } from "@/components/product-card";
import { StockBadge } from "@/components/stock-badge";
import { SwatchDots } from "@/components/swatch-dots";
import { Wordmark } from "@/components/wordmark";
import { getProduct, swatches } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false },
};

const TOKENS = [
  ["bg", "Background"],
  ["surface", "Surface"],
  ["ink", "Ink (text)"],
  ["muted", "Muted text"],
  ["line", "Lines"],
  ["accent", "Accent"],
  ["gold", "Gold"],
] as const;

function Palette({ theme }: { theme: "atelier" | "noir" }) {
  return (
    <div data-theme={theme} className="rounded-2xl border border-line p-6 sm:p-8">
      <p className="label text-muted">{theme === "atelier" ? "Atelier: light, for shopping" : "Noir: dark, for the brand pages"}</p>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {TOKENS.map(([token, label]) => (
          <li key={token}>
            <div className="h-16 rounded-lg ring-1 ring-line" style={{ background: `var(--${token})` }} />
            <p className="mt-2 text-sm">{label}</p>
            <p className="label text-muted">--{token}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" className="label rounded-full bg-accent px-7 py-4 text-accent-ink">Primary</button>
        <button type="button" className="label rounded-full border border-line px-7 py-4">Secondary</button>
        <a href="#" className="label border-b border-current pb-1">Text link</a>
      </div>
    </div>
  );
}

export default async function StyleGuide() {
  const [dahlia, liora] = await Promise.all([getProduct("the-dahlia-mini"), getProduct("the-liora")]);

  return (
    <div className="mx-auto max-w-6xl space-y-20 px-4 py-14 sm:px-6">
      <header>
        <p className="label text-muted">Stage 0 · for Nimi to approve</p>
        <h1 className="mt-3 font-serif text-6xl sm:text-8xl">Style guide</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          The building blocks every page is made from. Colours, type and components here are the starting point;
          they&apos;ll be tuned once the logo and photography arrive.
        </p>
      </header>

      <section>
        <h2 className="label mb-6 border-b border-line pb-3 text-muted">Wordmark (placeholder until the logo arrives)</h2>
        <Wordmark className="text-6xl" />
      </section>

      <section className="space-y-6">
        <h2 className="label border-b border-line pb-3 text-muted">Colour, in both themes</h2>
        <Palette theme="atelier" />
        <Palette theme="noir" />
      </section>

      <section>
        <h2 className="label mb-6 border-b border-line pb-3 text-muted">Type</h2>
        <div className="space-y-8">
          <div>
            <p className="label text-muted">Display: Instrument Serif</p>
            <p className="font-serif text-7xl leading-none sm:text-8xl">
              Elegance <em>in</em> simplicity
            </p>
          </div>
          <div>
            <p className="label text-muted">Headings: Instrument Serif</p>
            <p className="font-serif text-5xl">The Suede Velvet Edit</p>
          </div>
          <div>
            <p className="label text-muted">Body: Geist</p>
            <p className="max-w-2xl text-lg">
              Bold minimalism. Timeless form. The Dahlia Mini in suede velvet: softer, deeper, and intentional.
            </p>
          </div>
          <div>
            <p className="label text-muted">Labels and prices: Spline Sans Mono</p>
            <p className="label">
              <Price ngn={35500} /> · Only 2 left · Dispatched same or next day
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="label mb-6 border-b border-line pb-3 text-muted">Badges and swatches</h2>
        <div className="flex flex-wrap items-center gap-4">
          <StockBadge stock={0} />
          <StockBadge stock={2} />
          {dahlia && <SwatchDots swatches={swatches(dahlia)} />}
        </div>
      </section>

      <section>
        <h2 className="label mb-6 border-b border-line pb-3 text-muted">Product cards (hover to see the second photo)</h2>
        <div className="grid grid-cols-2 gap-4 sm:max-w-2xl">
          {dahlia && <ProductCard product={dahlia} />}
          {liora && <ProductCard product={liora} />}
        </div>
      </section>
    </div>
  );
}
