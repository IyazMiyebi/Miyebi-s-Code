"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Product photos: hover to zoom (mouse), tap or click to open a full-screen
// viewer that swipes between photos and lets phones pinch-zoom.
// The parent keys this by variant, so changing colour starts at photo one.

export function ProductGallery({ images, alt, note }: { images: string[]; alt: string; note?: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const main = images[Math.min(index, images.length - 1)];

  function open() {
    dialogRef.current?.showModal();
    // Jump the viewer to the photo that was showing.
    requestAnimationFrame(() => {
      const strip = stripRef.current;
      if (strip) strip.scrollTo({ left: strip.clientWidth * index, behavior: "instant" });
    });
  }

  function step(delta: number) {
    const strip = stripRef.current;
    if (!strip) return;
    const next = Math.max(0, Math.min(images.length - 1, Math.round(strip.scrollLeft / strip.clientWidth) + delta));
    strip.scrollTo({ left: strip.clientWidth * next, behavior: "smooth" });
  }

  // Arrow keys move between photos while the viewer is open (Esc is built in).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    dialog.addEventListener("keydown", onKey);
    return () => dialog.removeEventListener("keydown", onKey);
  });

  return (
    <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        onClick={open}
        onMouseMove={(e) => {
          if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        aria-label={`Open full-screen photos of ${alt}`}
        className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden bg-surface"
      >
        {main && (
          <Image
            key={main}
            src={main}
            alt={alt}
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover transition-transform duration-300 ease-out"
            style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        )}
        {note && (
          <span className="label absolute inset-x-3 bottom-3 rounded-full bg-surface/90 px-4 py-2 text-center">{note}</span>
        )}
      </button>

      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className="relative block size-20 overflow-hidden bg-surface opacity-60 ring-ink transition-opacity hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-1"
              >
                <Image src={src} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        aria-label={`Photos of ${alt}`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
        onClick={(e) => e.target === e.currentTarget && dialogRef.current?.close()}
      >
        <div
          ref={stripRef}
          className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none]"
        >
          {images.map((src, i) => (
            <div key={src} className="relative h-full w-screen shrink-0 snap-center touch-pinch-zoom">
              <Image src={src} alt={`${alt}, photo ${i + 1} of ${images.length}`} fill sizes="100vw" className="object-contain" />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="label absolute top-4 right-4 rounded-full bg-white/15 px-4 py-2.5 backdrop-blur hover:bg-white/25"
        >
          Close
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-4 hidden size-12 -translate-y-1/2 rounded-full bg-white/15 text-xl backdrop-blur hover:bg-white/25 sm:block"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute top-1/2 right-4 hidden size-12 -translate-y-1/2 rounded-full bg-white/15 text-xl backdrop-blur hover:bg-white/25 sm:block"
            >
              ›
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}
