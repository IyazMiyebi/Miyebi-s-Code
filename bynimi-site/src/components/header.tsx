"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav } from "@/lib/store";
import { CurrencySwitcher } from "./currency-switcher";
import { Wordmark } from "./wordmark";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // The mobile menu sits outside <header>: the header's backdrop blur would
  // otherwise trap the fixed-position menu inside the header's own box.
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <button
            type="button"
            className="label -ml-2 p-2 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
  
          <Link href="/" aria-label="Bags by Nimi, home" className="md:mr-auto">
            <Wordmark />
          </Link>
  
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-7">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                    className="label text-muted transition-colors hover:text-ink aria-[current=page]:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
  
          <div className="flex items-center gap-5 md:ml-6">
            <CurrencySwitcher className="hidden md:inline-flex" />
            {/* The bag (cart) arrives in Stage 3. */}
            <span className="label" aria-label="Bag, 0 items">
              Bag (0)
            </span>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 z-30 bg-bg md:hidden"
      >
        <ul className="page-in flex flex-col gap-2 px-6 pt-10">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-serif text-5xl leading-tight"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 px-6">
          <CurrencySwitcher />
        </div>
      </div>
    </>
  );
}
