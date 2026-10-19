import { CURRENCIES, formatPrice } from "@/lib/currency";

// A price in every currency at once; CSS shows the visitor's (see
// "Regional prices" in globals.css). No hooks, so it works in server and
// client components alike and the markup is identical on both.
export function Price({ ngn, from = false, className = "" }: { ngn: number; from?: boolean; className?: string }) {
  return (
    <span className={className}>
      {from && "From "}
      {CURRENCIES.map((c) => (
        <span key={c.code} data-cur={c.code}>
          {formatPrice(c.code, ngn)}
        </span>
      ))}
    </span>
  );
}
