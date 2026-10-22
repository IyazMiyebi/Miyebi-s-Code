import { AnnouncementBar } from "./announcement-bar";
import { CartDrawer } from "./cart-drawer";
import { Footer } from "./footer";
import { Header } from "./header";

export type Theme = "atelier" | "noir";

export function SiteShell({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <div data-theme={theme} className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="label sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-ink focus:p-3 focus:text-bg"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
