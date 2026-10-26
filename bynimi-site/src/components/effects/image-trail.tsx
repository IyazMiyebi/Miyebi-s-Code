"use client";

import { useEffect, useRef } from "react";
import { optimisedSrc } from "./water-ripple";

// "Smooth image trail" from the reference reel: photos spill out behind the
// cursor (or a dragging finger), each one popping in and drifting away. A
// small pool of <img> elements is reused, animated with the Web Animations
// API, so nothing is created per move. On phones a gentle ghost trail draws
// itself while nobody is touching; with reduced motion there is no trail.

const POOL = 10;
const GAP_MOUSE = 90;
const GAP_TOUCH = 70;

export function ImageTrail({ images, className = "", children }: { images: string[]; className?: string; children?: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !images.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const srcs = images.map((src) => optimisedSrc(src, 384));
    let loaded = false;
    let next = 0;
    let photo = 0;
    let z = 1;
    let last: { x: number; y: number } | null = null;
    let lastTouch = -Infinity;
    let visible = false;
    let ghostTimer = 0;
    let ghostT = Math.random() * 10;

    // Fetch the photos once, the first time the section is on screen.
    function preload() {
      if (loaded) return;
      loaded = true;
      poolRef.current.forEach((img, i) => img && (img.src = srcs[i % srcs.length]));
      srcs.slice(POOL).forEach((s) => (new Image().src = s));
    }

    function spawn(x: number, y: number, dx: number, dy: number) {
      const img = poolRef.current[next];
      if (!img) return;
      next = (next + 1) % POOL;
      img.src = srcs[photo];
      photo = (photo + 1) % srcs.length;
      img.style.left = `${x}px`;
      img.style.top = `${y}px`;
      img.style.zIndex = String(z++);
      const tilt = Math.max(-12, Math.min(12, dx * 0.15));
      img.getAnimations().forEach((a) => a.cancel());
      img.animate(
        [
          { opacity: 0, transform: `translate(-50%, -50%) scale(0.4) rotate(${tilt}deg)` },
          { opacity: 1, transform: `translate(-50%, -50%) scale(1) rotate(${tilt / 2}deg)`, offset: 0.18 },
          {
            opacity: 0,
            transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${60 + dy * 0.6}px)) scale(0.85) rotate(0deg)`,
          },
        ],
        { duration: 1400, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
      );
    }

    function onMove(e: PointerEvent) {
      if (!wrap) return;
      preload();
      if (e.pointerType !== "mouse") lastTouch = performance.now();
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (!last) {
        last = { x, y };
        return;
      }
      const dx = x - last.x;
      const dy = y - last.y;
      if (Math.hypot(dx, dy) < (e.pointerType === "mouse" ? GAP_MOUSE : GAP_TOUCH)) return;
      spawn(x, y, dx, dy);
      last = { x, y };
    }
    const onLeave = () => (last = null);

    // Ghost trail for touch screens: a slow loop across the section.
    function ghost() {
      if (!wrap || !visible || hasMouse || performance.now() - lastTouch < 3000) return;
      preload();
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const prev = { x: w * (0.5 + 0.36 * Math.sin(ghostT)), y: h * (0.5 + 0.28 * Math.sin(ghostT * 1.7)) };
      ghostT += 0.35;
      const x = w * (0.5 + 0.36 * Math.sin(ghostT));
      const y = h * (0.5 + 0.28 * Math.sin(ghostT * 1.7));
      spawn(x, y, x - prev.x, y - prev.y);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !hasMouse) preload();
    });
    io.observe(wrap);
    if (!hasMouse) ghostTimer = window.setInterval(ghost, 260);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    wrap.addEventListener("pointerup", onLeave);
    return () => {
      io.disconnect();
      clearInterval(ghostTimer);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      wrap.removeEventListener("pointerup", onLeave);
    };
  }, [images]);

  return (
    <div ref={wrapRef} className={`relative touch-pan-y overflow-hidden select-none ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: POOL }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- pooled, src set by the effect
          <img
            key={i}
            ref={(el) => {
              poolRef.current[i] = el;
            }}
            alt=""
            draggable={false}
            className="absolute w-36 rounded-md object-cover opacity-0 shadow-2xl sm:w-48 md:w-56"
            style={{ aspectRatio: "930 / 1163" }}
          />
        ))}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
