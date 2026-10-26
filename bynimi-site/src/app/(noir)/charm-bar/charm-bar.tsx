"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HangingCards } from "@/components/effects/hanging-cards";
import { Price } from "@/components/price";
import { StockBadge } from "@/components/stock-badge";
import { addToCart, setCartOpen, useCart } from "@/lib/cart";
import { leadVariant, type Product, type Variant } from "@/lib/product";
import { variantHref } from "@/lib/variant-link";

type Charm = { id: string; label: string; product: Product };

const variantLabel = (p: Product, v: Variant) => p.option_names.map((n) => v.options[n]).join(", ");

export function CharmBar({ products }: { products: Product[] }) {
  // The colour each charm is showing; tapping a charm opens its picker.
  const [chosen, setChosen] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.slug, leadVariant(p)?.sku ?? ""])),
  );
  const [open, setOpen] = useState<string | null>(null);
  const items: Charm[] = products.map((p) => ({ id: p.slug, label: `${p.name}: choose and add to bag`, product: p }));
  const variantOf = (p: Product) => p.variants.find((v) => v.sku === chosen[p.slug]) ?? p.variants[0];

  return (
    <>
      <HangingCards
        items={items}
        onSelect={(c) => setOpen(c.id)}
        renderCard={({ product }) => {
          const v = variantOf(product);
          return (
            <span className="block w-32 rounded-xl bg-surface p-2 shadow-2xl ring-1 ring-line sm:w-40 lg:w-44">
              <span className="relative block aspect-[930/1163] overflow-hidden rounded-lg bg-bg">
                <Image
                  src={v.images[0] ?? product.images[0]}
                  alt=""
                  fill
                  sizes="176px"
                  draggable={false}
                  className="pointer-events-none object-cover"
                />
              </span>
              <span className="mt-2 block truncate px-1 text-sm">{product.name}</span>
              <Price ngn={v.price_ngn} className="label block px-1 pb-1 text-muted" />
            </span>
          );
        }}
      />
      {open && (
        <ChooserPanel
          product={products.find((p) => p.slug === open)!}
          sku={chosen[open]}
          onPick={(sku) => setChosen((c) => ({ ...c, [open]: sku }))}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function ChooserPanel({
  product,
  sku,
  onPick,
  onClose,
}: {
  product: Product;
  sku: string;
  onPick: (sku: string) => void;
  onClose: () => void;
}) {
  const cart = useCart();
  const variant = product.variants.find((v) => v.sku === sku) ?? product.variants[0];
  const inBag = cart.find((l) => l.sku === variant.sku)?.quantity ?? 0;
  const label = variantLabel(product, variant);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-label={product.name}
      className="page-in fixed inset-x-3 bottom-3 z-30 max-h-[80svh] overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-serif text-3xl leading-none">{product.name}</p>
          <Price ngn={variant.price_ngn} className="label mt-2 block text-muted" />
        </div>
        <button type="button" onClick={onClose} className="label -mt-1 -mr-1 p-2 text-muted hover:text-ink">
          Close
        </button>
      </div>
      {product.description && <p className="mt-3 text-sm text-muted">{product.description}</p>}

      {product.variants.length > 1 && (
        <fieldset className="mt-5">
          <legend className="label mb-2 text-muted">{product.option_names.join(" & ")}</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <label
                key={v.sku}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-checked:border-ink ${
                  v.stock === 0 ? "border-line text-muted line-through" : "border-line"
                }`}
              >
                <input type="radio" name="charm-variant" checked={v.sku === variant.sku} onChange={() => onPick(v.sku)} className="sr-only" />
                {v.swatch && <span className="size-3 rounded-full ring-1 ring-line" style={{ background: v.swatch }} />}
                {variantLabel(product, v)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-5 flex items-center gap-3">
        <StockBadge stock={variant.stock} />
      </div>
      <button
        type="button"
        disabled={variant.stock === 0 || inBag >= variant.stock}
        onClick={() => {
          addToCart({
            sku: variant.sku,
            slug: product.slug,
            name: product.name,
            label,
            image: variant.images[0] ?? product.images[0] ?? null,
            priceNgn: variant.price_ngn,
            stock: variant.stock,
          });
          onClose();
          setCartOpen(true);
        }}
        className="label mt-3 w-full rounded-full bg-accent px-6 py-4 text-accent-ink transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {variant.stock === 0 ? "Sold out" : inBag >= variant.stock ? `All ${variant.stock} are in your bag` : "Add to bag"}
      </button>
      <Link href={variantHref(product.slug, variant.options)} className="label mt-4 block text-center text-muted underline-offset-4 hover:text-ink hover:underline">
        {variant.stock === 0 ? "Pre-order or get notified" : "Full details"}
      </Link>
    </div>
  );
}
