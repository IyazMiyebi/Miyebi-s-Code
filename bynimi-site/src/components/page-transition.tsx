// Used by each route group's template.tsx, which remounts on every
// navigation, so the rise-in animation replays per page.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
