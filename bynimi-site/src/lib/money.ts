const ngn = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** ₦35,500 */
export function formatNgn(amount: number) {
  return ngn.format(amount);
}

/** ₦35,500, or "From ₦35,500" when variants differ in price. */
export function formatRange({ min, max }: { min: number; max: number }) {
  return min === max ? formatNgn(min) : `From ${formatNgn(min)}`;
}
