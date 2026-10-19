"use client";

import { useEffect } from "react";

// Used by each route group's template.tsx, which remounts on every
// navigation, so the rise-in animation replays per page.
//
// The very first page of a visit renders without it: starting invisible
// would only delay the first paint (and the Largest Contentful Paint).
// `animate` flips after the first client mount; the server never flips it,
// so server and client agree on the initial markup.
let animate = false;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const className = animate ? "page-in" : undefined;
  useEffect(() => {
    animate = true;
  }, []);
  return <div className={className}>{children}</div>;
}
