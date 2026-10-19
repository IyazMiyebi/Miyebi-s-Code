"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

// "Spiral gallery" from the reference reel: photos on one gently rising turn
// of a helix, slowly spinning. Pure CSS 3D: each card is placed once, and
// only the helix's rotation changes per frame, so it's cheap even on older
// phones. Drag or swipe to spin it; it coasts to a stop, then drifts again.

export type SpiralItem = { href: string; src: string; label: string };

const RISE = 12; // px each card climbs on its way round
const DRIFT = 0.06; // degrees per frame when idle

export function SpiralGallery({ items }: { items: SpiralItem[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const helixRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    const helix = helixRef.current;
    if (!stage || !helix) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let angle = 0;
    let velocity = 0;
    let raf = 0;
    let visible = false;
    let drag: { x: number; angle: number; t: number; lastX: number } | null = null;

    const cards = [...helix.children] as HTMLElement[];
    const step = 360 / cards.length;
    // Cards turned away from the viewer fade back, so the helix reads as one
    // continuous ribbon. Opacity only, which the compositor handles cheaply.
    const render = () => {
      helix.style.setProperty("--spin", `${angle}deg`);
      cards.forEach((card, i) => {
        const facing = Math.cos(((angle + i * step) * Math.PI) / 180);
        card.style.opacity = String(0.18 + 0.82 * Math.max(0, facing) ** 0.8);
      });
    };
    render();

    function frame() {
      raf = requestAnimationFrame(frame);
      if (!visible || drag) return;
      if (Math.abs(velocity) > 0.01) {
        angle += velocity;
        velocity *= 0.95;
      } else if (!reduced) {
        angle -= DRIFT;
      } else {
        return;
      }
      render();
    }

    function down(e: PointerEvent) {
      drag = { x: e.clientX, angle, t: performance.now(), lastX: e.clientX };
      dragged.current = false;
      velocity = 0;
    }
    function move(e: PointerEvent) {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) dragged.current = true;
      angle = drag.angle + dx * 0.3;
      const now = performance.now();
      velocity = ((e.clientX - drag.lastX) * 0.3 * 16) / Math.max(now - drag.t, 1);
      drag.t = now;
      drag.lastX = e.clientX;
      render();
    }
    function up() {
      drag = null;
    }

    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(stage);
    stage.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      stage.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const step = 360 / items.length;
  const height = items.length * RISE;

  return (
    <div
      ref={stageRef}
      className="relative h-[480px] cursor-grab touch-pan-y select-none overflow-hidden [perspective:1100px] active:cursor-grabbing sm:h-[600px]"
    >
      <div
        ref={helixRef}
        className="absolute top-1/2 left-1/2 will-change-transform [--radius:270px] [transform-style:preserve-3d] sm:[--radius:430px]"
        style={{
          transform: `translate(-50%, -50%) rotateX(-10deg) rotateY(var(--spin, 0deg))`,
        }}
      >
        {items.map((item, i) => (
          <Link
            key={item.href + item.src}
            href={item.href}
            draggable={false}
            onClick={(e) => dragged.current && e.preventDefault()}
            aria-label={item.label}
            className="absolute -top-[95px] -left-[70px] block h-[190px] w-[140px] overflow-hidden rounded-md bg-surface sm:-top-[125px] sm:-left-[100px] sm:h-[250px] sm:w-[200px]"
            style={{
              transform: `rotateY(${i * step}deg) translateZ(var(--radius)) translateY(${height / 2 - i * RISE}px)`,
            }}
          >
            <Image src={item.src} alt="" fill sizes="200px" draggable={false} className="object-cover" />
          </Link>
        ))}
      </div>
    </div>
  );
}
