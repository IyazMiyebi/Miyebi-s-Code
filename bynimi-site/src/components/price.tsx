import { CURRENCIES, formatAmount, formatPrice, priceIn } from "@/lib/currency";

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

/**
 * The total of several lines in every currency. Each line is converted with
 * the regional rule first and then added up, exactly as checkout does, so the
 * bag and the checkout always agree.
 */
export function PriceTotal({ lines, className = "" }: { lines: { ngn: number; quantity: number }[]; className?: string }) {
  return (
    <span className={className}>
      {CURRENCIES.map((c) => {
        const sum = lines.reduce((t, l) => t + priceIn(c.code, l.ngn) * l.quantity, 0);
        return (
          <span key={c.code} data-cur={c.code}>
            {formatAmount(c.code, c.code === "NGN" ? Math.round(sum) : Math.round(sum * 100) / 100)}
          </span>
        );
      })}
    </span>
  );
}
