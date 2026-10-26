import Link from "next/link";
import { helpNav } from "@/content/pages";
import { nav, store } from "@/lib/store";
import { Wordmark } from "./wordmark";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="space-y-4 sm:col-span-2 md:col-span-1">
          <Wordmark className="text-4xl" />
          <p className="max-w-sm text-muted">{store.description}</p>
        </div>

        <nav aria-label="Footer">
          <h2 className="label mb-4 text-muted">Explore</h2>
          <ul className="space-y-2">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help">
          <h2 className="label mb-4 text-muted">Help</h2>
          <ul className="space-y-2">
            {helpNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="label mb-4 text-muted">Say hello</h2>
          <ul className="space-y-2">
            <li>
              <a href={store.social.whatsapp} className="hover:text-accent">WhatsApp</a>
            </li>
            <li>
              <a href={store.social.instagram} className="hover:text-accent">Instagram</a>
            </li>
            <li>
              <a href={store.social.tiktok} className="hover:text-accent">TikTok</a>
            </li>
            <li>
              <a href={`mailto:${store.email}`} className="hover:text-accent">{store.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="label mx-auto flex max-w-7xl flex-wrap justify-between gap-2 border-t border-line px-4 py-6 text-muted sm:px-6">
        <span>© {store.name}</span>
        <span>{store.location}</span>
      </div>
    </footer>
  );
}
