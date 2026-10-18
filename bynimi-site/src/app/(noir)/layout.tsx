import { SiteShell } from "@/components/site-shell";

export default function NoirLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell theme="noir">{children}</SiteShell>;
}
