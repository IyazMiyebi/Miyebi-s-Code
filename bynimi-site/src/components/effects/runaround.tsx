"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// "Runaround text wrap" from the reference reel: a gently swaying bag floats
// down the page as you scroll, and the text reflows around it. It's a real
// CSS float with a circular shape-outside, pushed down by an invisible spacer
// float; changing the spacer's height moves the bag and the browser rewraps
// the lines. On phones (and with reduced motion) the bag stays put and the
// text simply wraps around it.

export function Runaround({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const spacer = spacerRef.current;
    const bag = bagRef.current;
    if (!wrap || !spacer || !bag) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)");
    let raf = 0;
    let offset = 0;

    function update() {
      raf = 0;
      if (!wrap || !spacer || !bag) return;
      if (still.matches) {
        if (offset !== 0) spacer.style.height = `${(offset = 0)}px`;
        return;
      }
      const rect = wrap.getBoundingClientRect();
      const size = bag.offsetHeight;
      // Where the text ends (not the wrapper, which the float itself can stretch).
      const last = wrap.lastElementChild as HTMLElement | null;
      const textEnd = last ? last.offsetTop + last.offsetHeight : rect.height;
      // Keep the bag near the middle of the screen, inside the text.
      const goal = Math.max(0, Math.min(window.innerHeight / 2 - size / 2 - rect.top, textEnd - size));
      const next = Math.round(offset + (goal - offset) * 0.18);
      if (next !== offset) spacer.style.height = `${(offset = next)}px`;
      // A gentle sway as you scroll, never upside down.
      bag.style.setProperty("--turn", `${(Math.sin(window.scrollY / 260) * 14).toFixed(1)}deg`);
      if (Math.abs(goal - offset) > 1) raf = requestAnimationFrame(update);
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    still.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      still.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative flow-root">
      <div ref={spacerRef} aria-hidden className="float-right w-0" />
      <div
        ref={bagRef}
        className="relative float-right clear-right ml-6 mb-4 size-36 sm:size-48 md:ml-10 md:size-72"
        style={{ shapeOutside: "circle(50%)", shapeMargin: "0.75rem" }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full bg-[#f9f7f8] ring-1 ring-line transition-transform duration-500 ease-out [transform:rotate(var(--turn,0deg))]">
          <Image src={src} alt={alt} fill sizes="(min-width: 768px) 288px, 192px" className="object-contain p-[8%]" />
        </div>
      </div>
      {children}
    </div>
  );
}
