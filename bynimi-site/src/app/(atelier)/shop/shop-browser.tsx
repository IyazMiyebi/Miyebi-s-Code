"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Price } from "@/components/price";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/product";
import {
  activeFilterCount,
  applyFilters,
  facetOptions,
  filtersFromParams,
  filtersToParams,
  SORTS,
  type FacetOption,
  type ShopFilters,
  type SortSlug,
} from "@/lib/shop-filter";

// The shop's filters, search and sort. Filter state lives here and is mirrored
// into the address bar (so a filtered view can be shared or bookmarked).
// Whenever the address and the state disagree (back/forward, a link to
// /shop?…, or Next.js reviving this page after it sat hidden in the
// background), the address wins. That's always safe: the address is only ever
// a copy of the filters.

type Props = { products: Product[]; urlQuery: string };

/** Animate the grid reshuffle where the browser supports view transitions. */
function transition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    doc.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}

export function ShopBrowser({ products, urlQuery }: Props) {
  const [filters, setFilters] = useState<ShopFilters>(() => filtersFromParams(new URLSearchParams(urlQuery)));
  const [seenQuery, setSeenQuery] = useState(urlQuery);
  const [search, setSearch] = useState(filters.q);
  const [drawer, setDrawer] = useState(false);

  if (urlQuery !== seenQuery) {
    setSeenQuery(urlQuery);
    const fromUrl = filtersFromParams(new URLSearchParams(urlQuery));
    if (filtersToParams(fromUrl).toString() !== filtersToParams(filters).toString()) {
      setFilters(fromUrl);
      if (fromUrl.q !== filters.q) setSearch(fromUrl.q);
    }
  }

  function update(next: ShopFilters) {
    const query = filtersToParams(next).toString();
    // No reshuffle animation behind the phone's filter panel: the animated
    // cards would be drawn on top of it.
    if (drawer) setFilters(next);
    else transition(() => setFilters(next));
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  // Search as you type, settling after a short pause.
  useEffect(() => {
    if (search.trim() === filters.q) return;
    const t = setTimeout(() => update({ ...filters, q: search.trim() }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should restart the timer
  }, [search]);

  useEffect(() => {
    if (!drawer) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  const results = useMemo(() => applyFilters(products, filters), [products, filters]);
  const facets = useMemo(() => facetOptions(products, filters), [products, filters]);
  const active = activeFilterCount(filters);
  const cleared: ShopFilters = { ...filters, types: [], finishes: [], colours: [], max: null, inStock: false };

  const toggle = <K extends "types" | "finishes" | "colours">(key: K, value: ShopFilters[K][number]) => {
    const current = filters[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ ...filters, [key]: next });
  };

  const panel = (
    <FilterPanel
      filters={filters}
      facets={facets}
      onToggle={toggle}
      onMax={(max) => update({ ...filters, max })}
      onStock={(inStock) => update({ ...filters, inStock })}
    />
  );

  const chips = [
    ...facets.types.filter((o) => filters.types.includes(o.value as never)).map((o) => ({ label: o.label, off: () => toggle("types", o.value as never) })),
    ...facets.finishes.filter((o) => filters.finishes.includes(o.value)).map((o) => ({ label: o.label, off: () => toggle("finishes", o.value) })),
    ...facets.colours.filter((o) => filters.colours.includes(o.value as never)).map((o) => ({ label: o.label, off: () => toggle("colours", o.value as never) })),
    ...(filters.inStock ? [{ label: "In stock", off: () => update({ ...filters, inStock: false }) }] : []),
  ];

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
      <aside aria-label="Filters" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        {panel}
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-60">
            <span className="sr-only">Search the shop</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bags, colours, finishes…"
              className="w-full rounded-full border border-line bg-surface px-5 py-3 placeholder:text-muted focus:border-ink focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="label rounded-full border border-line px-5 py-3.5 hover:border-ink lg:hidden"
          >
            Filter{active ? ` (${active})` : ""}
          </button>
          <label className="label flex items-center gap-2 text-muted">
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select
              value={filters.sort}
              onChange={(e) => update({ ...filters, sort: e.target.value as SortSlug })}
              className="cursor-pointer rounded-full border border-line bg-surface px-4 py-3.5 text-ink focus:border-ink focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex min-h-8 flex-wrap items-center gap-2">
          <p role="status" className="label mr-2 text-muted">
            {results.length} {results.length === 1 ? "piece" : "pieces"}
          </p>
          {filters.max && (
            <Chip onRemove={() => update({ ...filters, max: null })}>
              Up to <Price ngn={filters.max} />
            </Chip>
          )}
          {chips.map((c) => (
            <Chip key={c.label} onRemove={c.off}>
              {c.label}
            </Chip>
          ))}
          {active > 0 && (
            <button type="button" onClick={() => update(cleared)} className="label ml-1 underline underline-offset-4 hover:text-accent">
              Clear all
            </button>
          )}
        </div>

        {results.length ? (
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3">
            {results.map(({ product, variants }, i) => (
              <li key={product.slug} style={{ viewTransitionName: `card-${product.slug}` }}>
                <ProductCard product={product} variants={variants} priority={i < 3} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="font-serif text-4xl">Nothing matches, yet.</p>
            <p className="mt-3 max-w-sm text-muted">
              Try fewer filters, or ask Nimi on WhatsApp: many pieces can be made to order.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                update({ ...cleared, q: "" });
              }}
              className="label mt-6 rounded-full bg-accent px-6 py-3.5 text-accent-ink"
            >
              Clear filters and search
            </button>
          </div>
        )}
      </div>

      {drawer && (
        <div role="dialog" aria-modal aria-label="Filters" className="fixed inset-0 z-50 flex flex-col bg-bg lg:hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <p className="font-serif text-3xl">Filter</p>
            <button type="button" onClick={() => setDrawer(false)} className="label p-2">
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">{panel}</div>
          <div className="flex gap-3 border-t border-line p-4">
            {active > 0 && (
              <button type="button" onClick={() => update(cleared)} className="label rounded-full border border-line px-5 py-4">
                Clear
              </button>
            )}
            <button type="button" onClick={() => setDrawer(false)} className="label flex-1 rounded-full bg-accent py-4 text-accent-ink">
              Show {results.length} {results.length === 1 ? "piece" : "pieces"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="label inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-bg hover:opacity-85"
    >
      {children}
      <span aria-hidden>×</span>
      <span className="sr-only">(remove)</span>
    </button>
  );
}

function FilterPanel({
  filters,
  facets,
  onToggle,
  onMax,
  onStock,
}: {
  filters: ShopFilters;
  facets: ReturnType<typeof facetOptions>;
  onToggle: <K extends "types" | "finishes" | "colours">(key: K, value: ShopFilters[K][number]) => void;
  onMax: (max: number | null) => void;
  onStock: (on: boolean) => void;
}) {
  return (
    <div className="space-y-8">
      <Group title="Type">
        <Checks options={facets.types} selected={filters.types} onToggle={(v) => onToggle("types", v as never)} />
      </Group>

      <Group title="Colour">
        <ul className="flex flex-wrap gap-2">
          {facets.colours.map((o) => {
            const on = filters.colours.includes(o.value as never);
            return (
              <li key={o.value}>
                <button
                  type="button"
                  aria-pressed={on}
                  title={`${o.label} (${o.count})`}
                  onClick={() => onToggle("colours", o.value as never)}
                  className="flex items-center gap-2 rounded-full border border-line py-1.5 pr-3 pl-1.5 text-sm hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
                >
                  <span className="size-5 rounded-full ring-1 ring-line" style={{ background: o.hex }} />
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      </Group>

      {facets.finishes.length > 0 && (
        <Group title="Finish">
          <Checks options={facets.finishes} selected={filters.finishes} onToggle={(v) => onToggle("finishes", v)} />
        </Group>
      )}

      <Group title="Price">
        <ul className="space-y-2">
          {[null, ...facets.prices].map((o) => {
            const value = o ? Number(o.value) : null;
            return (
              <li key={o?.value ?? "any"}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="price"
                    checked={filters.max === value}
                    onChange={() => onMax(value)}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span>{value ? <>Up to <Price ngn={value} /></> : "Any price"}</span>
                  {o && <span className="ml-auto text-xs text-muted">{o.count}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </Group>

      <Group title="Availability">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => onStock(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          <span>In stock, ready to dispatch</span>
          <span className="ml-auto text-xs text-muted">{facets.inStock}</span>
        </label>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="label mb-3 text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

function Checks({ options, selected, onToggle }: { options: FacetOption[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <ul className="space-y-2">
      {options.map((o) => (
        <li key={o.value}>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={() => onToggle(o.value)}
              className="size-4 accent-[var(--accent)]"
            />
            <span>{o.label}</span>
            <span className="ml-auto text-xs text-muted">{o.count}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
