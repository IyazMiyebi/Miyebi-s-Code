const MAX = 6;

export function SwatchDots({
  swatches,
  className = "",
}: {
  swatches: { name: string; hex: string }[];
  className?: string;
}) {
  const shown = swatches.slice(0, MAX);
  const more = swatches.length - shown.length;
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-label={`${swatches.length} colours`}>
      {shown.map((s) => (
        <span
          key={s.name}
          title={s.name}
          className="size-3 rounded-full ring-1 ring-line"
          style={{ background: s.hex }}
        />
      ))}
      {more > 0 && <span className="label text-muted">+{more}</span>}
    </div>
  );
}
