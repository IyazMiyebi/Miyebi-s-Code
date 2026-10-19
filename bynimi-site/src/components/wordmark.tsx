// Text wordmark until Nimi's logo files arrive.
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-2xl leading-none tracking-tight ${className}`}>
      Bags <span className="italic text-muted">by</span> Nimi
    </span>
  );
}
