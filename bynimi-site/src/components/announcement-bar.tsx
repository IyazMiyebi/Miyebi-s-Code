import { store } from "@/lib/store";

// A slow, endless marquee. The list is rendered twice so the loop is seamless;
// the second copy is hidden from screen readers.
export function AnnouncementBar() {
  const items = store.announcements;
  return (
    <div className="overflow-hidden border-b border-line bg-ink text-bg">
      <div className="flex w-max animate-[marquee_40s_linear_infinite] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0">
            {items.map((text) => (
              <li key={text} className="label flex items-center gap-10 px-5 py-2">
                {text}
                <span aria-hidden className="text-gold">✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
