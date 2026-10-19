"use client";

import { useState } from "react";
import type { Product, Variant } from "@/lib/product";
import { Price } from "@/components/price";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { bestVariant, variantQuery } from "@/lib/variant-link";
import { ProductGallery } from "./product-gallery";
import { SoldOutActions } from "./sold-out-actions";

const SWATCH_OPTIONS = new Set(["Colour", "Metal"]);

function matches(v: Variant, selection: Record<string, string>, names: string[]) {
  return names.every((n) => selection[n] === undefined || v.options[n] === selection[n]);
}

/** Values for option `index`, given what's picked for the options before it. */
function valuesFor(product: Product, selection: Record<string, string>, index: number) {
  const before = product.option_names.slice(0, index);
  const seen = new Map<string, { swatch: string | null; inStock: boolean }>();
  for (const v of product.variants) {
    if (!matches(v, selection, before)) continue;
    const value = v.options[product.option_names[index]];
    const prev = seen.get(value);
    seen.set(value, { swatch: v.swatch, inStock: (prev?.inStock ?? false) || v.stock > 0 });
  }
  return [...seen].map(([value, info]) => ({ value, ...info }));
}

function initialVariant(product: Product) {
  return product.variants.find((v) => v.stock > 0) ?? product.variants[0];
}

export function VariantPicker({
  product,
  initialOptions = {},
}: {
  product: Product;
  /** Options chosen by the link that opened the page, e.g. ?finish=suede-velvet. */
  initialOptions?: Record<string, string>;
}) {
  const names = product.option_names;
  const [selection, setSelection] = useState<Record<string, string>>(() => ({
    ...(bestVariant(product, initialOptions) ?? initialVariant(product)).options,
  }));

  const variant = product.variants.find((v) => matches(v, selection, names)) ?? initialVariant(product);

  function choose(index: number, value: string) {
    const next: Record<string, string> = { ...selection, [names[index]]: value };
    // If the later options no longer form a real variant, move them to the
    // best match: in stock first, then anything.
    if (!product.variants.some((v) => matches(v, next, names))) {
      const fixed = Object.fromEntries(names.slice(0, index + 1).map((n) => [n, next[n]]));
      const candidates = product.variants.filter((v) => matches(v, fixed, names));
      const best = candidates.find((v) => v.stock > 0) ?? candidates[0];
      Object.assign(next, best.options);
    }
    setSelection(next);
    // Keep the address bar on the chosen bag, so the link can be shared.
    window.history.replaceState(null, "", `?${variantQuery(next)}`);
  }

  const images = variant.images.length ? variant.images : product.images;
  const soldOut = variant.stock === 0;
  const label = names.map((n) => variant.options[n]).join(", ");

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
      <ProductGallery
        key={variant.sku}
        images={images}
        alt={`${product.name}${label ? `, ${label}` : ""}`}
        note={!variant.has_photo && names.length > 0 ? `Photo of ${Object.values(variant.options).at(-1)} coming soon` : undefined}
      />

      <div className="min-w-0">
        <h1 className="font-serif text-5xl leading-none sm:text-6xl">{product.name}</h1>
        <p className="mt-4 flex items-baseline gap-3 text-xl">
          <Price ngn={variant.price_ngn} />
          {variant.compare_at_ngn && (
            <s className="text-base text-muted">
              <Price ngn={variant.compare_at_ngn} />
            </s>
          )}
        </p>

        {names.map((name, i) => {
          const values = valuesFor(product, selection, i);
          if (values.length < 2 && names.length === 1) return null;
          const swatch = SWATCH_OPTIONS.has(name);
          return (
            <fieldset key={name} className="mt-8">
              <legend className="label mb-3 text-muted">
                {name}: <span className="text-ink">{selection[name]}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {values.map(({ value, swatch: hex, inStock }) => {
                  const selected = selection[name] === value;
                  const common = `relative transition ${inStock ? "" : "opacity-45"}`;
                  return swatch ? (
                    <button
                      key={value}
                      type="button"
                      title={`${value}${inStock ? "" : " (sold out)"}`}
                      aria-label={`${value}${inStock ? "" : ", sold out"}`}
                      aria-pressed={selected}
                      onClick={() => choose(i, value)}
                      className={`${common} size-9 rounded-full ring-1 ring-line ring-offset-2 ring-offset-bg aria-pressed:ring-2 aria-pressed:ring-ink`}
                      style={{ background: hex ?? undefined }}
                    >
                      {!inStock && (
                        <span aria-hidden className="absolute top-1/2 left-1/2 h-px w-[130%] -translate-1/2 -rotate-45 bg-ink" />
                      )}
                    </button>
                  ) : (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => choose(i, value)}
                      className={`${common} rounded-full border border-line px-4 py-2 text-sm hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg ${inStock ? "" : "line-through"}`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <p className={`label mt-8 ${soldOut ? "text-muted" : variant.stock <= 3 ? "text-warning" : "text-success"}`}>
          {soldOut ? "Sold out: available to pre-order" : variant.stock <= 3 ? `Only ${variant.stock} left` : "In stock, ready to dispatch"}
        </p>

        {soldOut ? (
          <SoldOutActions key={variant.sku} product={product} variant={variant} label={label} />
        ) : (
          <>
            {/* Bag and checkout arrive in Stage 3. */}
            <button
              type="button"
              disabled
              className="label mt-4 w-full rounded-full bg-accent px-8 py-5 text-accent-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add to bag
            </button>
            <p className="mt-2 text-center text-xs text-muted">Checkout opens in a later preview.</p>
          </>
        )}
        <p className="mt-4 text-center text-sm text-muted">
          Questions?{" "}
          <WhatsAppLink
            message={`Hi Nimi! A question about ${product.name}${label ? ` (${label})` : ""}:`}
            className="underline underline-offset-4 hover:text-ink"
          >
            Chat with Nimi on WhatsApp
          </WhatsAppLink>
        </p>

        {product.description && <p className="mt-10 text-lg leading-relaxed">{product.description}</p>}
        <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
          {product.dimensions && (
            <div className="flex justify-between py-3">
              <dt className="text-muted">Measurements</dt>
              <dd>{product.dimensions}</dd>
            </div>
          )}
          <div className="flex justify-between py-3">
            <dt className="text-muted">Dispatch</dt>
            <dd>Same or next day</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-muted">SKU</dt>
            <dd className="font-mono text-xs">{variant.sku}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
