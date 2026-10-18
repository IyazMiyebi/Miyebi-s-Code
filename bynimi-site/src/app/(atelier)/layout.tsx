import { SiteShell } from "@/components/site-shell";

export default function AtelierLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell theme="atelier">{children}</SiteShell>;
}
