export function StockBadge({ stock, className = "" }: { stock: number; className?: string }) {
  if (stock > 3) return null;
  const text = stock === 0 ? "Sold out" : `Only ${stock} left`;
  return (
    <span
      className={`label rounded-full px-2.5 py-1 ${
        stock === 0 ? "bg-ink text-bg" : "bg-surface/90 text-warning"
      } ${className}`}
    >
      {text}
    </span>
  );
}
