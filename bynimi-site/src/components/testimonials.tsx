import { store } from "@/lib/store";

// A slow marquee of customer words. Pauses on hover; stops under reduced
// motion (then it simply scrolls sideways).
export function Testimonials() {
  const items = store.testimonials;
  return (
    <section aria-labelledby="testimonials-heading" className="py-20">
      <div className="mx-auto mb-10 max-w-7xl px-4 sm:px-6">
        <p className="label text-gold">Kind words</p>
        <h2 id="testimonials-heading" className="mt-3 font-serif text-5xl sm:text-6xl">
          Carried, and loved
        </h2>
      </div>
      <div className="group overflow-x-auto motion-safe:overflow-hidden">
        <div className="flex w-max motion-safe:animate-[marquee_60s_linear_infinite] motion-safe:group-hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-4 pr-4">
              {items.map((t) => (
                <li key={t.name}>
                  <figure className="flex h-full w-72 flex-col justify-between gap-8 rounded-2xl border border-line bg-surface p-7 sm:w-80">
                    <blockquote className="font-serif text-2xl leading-snug">“{t.quote}”</blockquote>
                    <figcaption className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="label grid size-9 place-items-center rounded-full bg-gold/15 text-gold"
                      >
                        {t.name[0]}
                      </span>
                      <span className="label text-muted">{t.name}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
