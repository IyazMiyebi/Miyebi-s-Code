import { AsciiIntro } from "@/components/effects/ascii-intro";
import { SiteShell } from "@/components/site-shell";
import { store } from "@/lib/store";

export default function NoirLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The home page's first-visit intro lives here, outside the page
          transition: that animates a transform, which would trap a fixed
          overlay inside the page instead of the viewport. It only ever plays
          on a first load of "/" (see src/lib/intro.ts). */}
      <AsciiIntro src={store.home.heroImage} />
      <SiteShell theme="noir">{children}</SiteShell>
    </>
  );
}
