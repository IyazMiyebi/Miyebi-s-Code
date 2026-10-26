"use client";

import { useEffect, useRef } from "react";

// "Hanging card" from the reference reel: cards dangling from a rail on
// strings that swing, can be grabbed and thrown, and sway when the cursor
// brushes past. Each string is a short chain of points (Verlet integration);
// the card hangs from the last point and turns with the string. The cards
// are real buttons (tap or Enter selects one), so it all works without the
// physics too. The simulation sleeps once everything is still, pauses off
// screen, and is skipped entirely with reduced motion.

export type HangingItem = { id: string; label: string };

const SEGMENTS = 7;
const GRAVITY = 0.45;
const DAMPING = 0.985;
const ITERATIONS = 10;

type Point = { x: number; y: number; px: number; py: number };
type Rope = { ax: number; ay: number; length: number; points: Point[]; angle: number };

export function HangingCards<T extends HangingItem>({
  items,
  renderCard,
  onSelect,
  columns = (w: number) => (w < 640 ? 2 : w < 1024 ? 3 : items.length),
  className = "",
}: {
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  onSelect: (item: T) => void;
  /** How many cards hang from each rail, for a given width. */
  columns?: (width: number) => number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragged = useRef(false);
  const itemsRef = useRef(items);
  const onSelectRef = useRef(onSelect);
  const columnsRef = useRef(columns);
  useEffect(() => {
    itemsRef.current = items;
    onSelectRef.current = onSelect;
    columnsRef.current = columns;
  });

  const count = items.length;
  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ropes: Rope[] = [];
    let rails: { y: number; x0: number; x1: number }[] = [];
    let raf = 0;
    let visible = false;
    type Drag = {
      index: number;
      id: number;
      /** Where the card's top is being held, and how fast it's moving. */
      x: number;
      y: number;
      vx: number;
      vy: number;
      /** Where the pointer went down, and where on the card it grabbed. */
      startX: number;
      startY: number;
      offX: number;
      offY: number;
    };
    let drag: Drag | null = null;
    let lastPointer: { x: number; y: number } | null = null;

    function layout() {
      if (!wrap) return;
      const width = wrap.clientWidth;
      const cols = Math.max(1, Math.min(count, columnsRef.current(width)));
      const rowsCount = Math.ceil(count / cols);
      const cardH = Math.max(...cardRefs.current.map((c) => c?.offsetHeight ?? 0), 120);
      // Staggered string lengths, so the cards don't line up like a shelf.
      const ropeLength = (i: number) => 70 + ((i * 47) % 80);
      const maxRope = Math.max(...Array.from({ length: count }, (_, i) => ropeLength(i)));
      const rowH = 24 + maxRope + cardH + 48;
      wrap.style.height = `${rowsCount * rowH}px`;
      rails = [];
      const old = ropes;
      ropes = Array.from({ length: count }, (_, i) => {
        const row = Math.floor(i / cols);
        const inRow = Math.min(cols, count - row * cols);
        const col = i % cols;
        const slot = width / cols;
        const ax = (width - inRow * slot) / 2 + slot * (col + 0.5);
        const ay = row * rowH + 24;
        const length = ropeLength(i);
        if (col === 0) rails.push({ y: ay, x0: (width - inRow * slot) / 2 + 12, x1: (width + inRow * slot) / 2 - 12 });
        const seg = length / SEGMENTS;
        // On the first layout, start each card a little to one side, so they
        // swing gently into place when the page opens.
        const kick = old.length || reduced ? 0 : (i % 2 ? 1 : -1) * (30 + ((i * 13) % 30));
        const points = Array.from({ length: SEGMENTS + 1 }, (_, k) => {
          const x = ax + (kick * k) / SEGMENTS;
          const y = ay + seg * k;
          return { x, y, px: x, py: y };
        });
        return { ax, ay, length, points, angle: 0 };
      });
      render();
      wrap.dataset.ready = "";
    }

    function step() {
      for (let r = 0; r < ropes.length; r++) {
        const rope = ropes[r];
        const pts = rope.points;
        for (let k = 1; k < pts.length; k++) {
          const p = pts[k];
          const vx = (p.x - p.px) * DAMPING;
          const vy = (p.y - p.py) * DAMPING;
          p.px = p.x;
          p.py = p.y;
          p.x += vx;
          p.y += vy + GRAVITY;
        }
        const seg = rope.length / SEGMENTS;
        const end = pts[pts.length - 1];
        if (drag?.index === r) {
          // Held: the card follows the pointer, but the string can't stretch
          // much beyond its length.
          const dx = drag.x - rope.ax;
          const dy = drag.y - rope.ay;
          const d = Math.hypot(dx, dy);
          const max = rope.length * 1.15;
          const k = d > max ? max / d : 1;
          end.x = rope.ax + dx * k;
          end.y = rope.ay + dy * k;
        }
        for (let it = 0; it < ITERATIONS; it++) {
          pts[0].x = rope.ax;
          pts[0].y = rope.ay;
          for (let k = 0; k < pts.length - 1; k++) {
            const a = pts[k];
            const b = pts[k + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.0001;
            const diff = (d - seg) / d;
            const aFixed = k === 0;
            const bFixed = drag?.index === r && k + 1 === pts.length - 1;
            if (aFixed && bFixed) continue;
            const wa = aFixed ? 0 : bFixed ? 1 : 0.5;
            const wb = bFixed ? 0 : aFixed ? 1 : 0.5;
            a.x += dx * diff * wa;
            a.y += dy * diff * wa;
            b.x -= dx * diff * wb;
            b.y -= dy * diff * wb;
          }
        }
        if (drag?.index === r) {
          end.px = end.x - drag.vx;
          end.py = end.y - drag.vy;
        }
      }
    }

    function render() {
      if (!svg) return;
      let d = "";
      for (const rail of rails) d += `M${rail.x0} ${rail.y}H${rail.x1}`;
      const railPath = svg.querySelector<SVGPathElement>("[data-rail]");
      railPath?.setAttribute("d", d);
      const strings = svg.querySelector<SVGPathElement>("[data-strings]");
      let s = "";
      ropes.forEach((rope, i) => {
        const pts = rope.points;
        s += `M${pts[0].x} ${pts[0].y}`;
        for (let k = 1; k < pts.length; k++) s += `L${pts[k].x.toFixed(1)} ${pts[k].y.toFixed(1)}`;
        const a = pts[pts.length - 2];
        const b = pts[pts.length - 1];
        // The card turns with the end of its string, smoothed a little.
        const target = Math.atan2(b.x - a.x, b.y - a.y);
        rope.angle += (target - rope.angle) * 0.35;
        const card = cardRefs.current[i];
        if (card) {
          card.style.transform = `translate(${b.x - card.offsetWidth / 2}px, ${b.y}px) rotate(${(-rope.angle * 180) / Math.PI}deg)`;
        }
      });
      strings?.setAttribute("d", s);
    }

    function energy() {
      let e = 0;
      for (const rope of ropes) for (const p of rope.points) e += Math.abs(p.x - p.px) + Math.abs(p.y - p.py);
      return e;
    }

    function frame() {
      raf = 0;
      if (!visible) return;
      step();
      render();
      if (drag || energy() > 0.05) raf = requestAnimationFrame(frame);
    }
    const wake = () => {
      if (!reduced && !raf && visible) raf = requestAnimationFrame(frame);
    };

    function local(e: PointerEvent) {
      const rect = wrap!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onDown(e: PointerEvent) {
      if (reduced || (e.pointerType === "mouse" && e.button !== 0)) return;
      const index = cardRefs.current.findIndex((c) => c?.contains(e.target as Node));
      if (index < 0) return;
      const p = local(e);
      dragged.current = false;
      // Hold from where it was grabbed, not by snapping the card's top to the finger.
      const end = ropes[index].points[SEGMENTS];
      drag = { index, id: e.pointerId, x: end.x, y: end.y, vx: 0, vy: 0, startX: p.x, startY: p.y, offX: p.x - end.x, offY: p.y - end.y };
      cardRefs.current[index]?.setPointerCapture(e.pointerId);
      wake();
    }

    function onMove(e: PointerEvent) {
      const p = local(e);
      if (drag && e.pointerId === drag.id) {
        const x = p.x - drag.offX;
        const y = p.y - drag.offY;
        drag.vx = x - drag.x;
        drag.vy = y - drag.y;
        drag.x = x;
        drag.y = y;
        if (Math.hypot(p.x - drag.startX, p.y - drag.startY) > 6) dragged.current = true;
        e.preventDefault();
        return;
      }
      // A cursor brushing past sets the cards swaying.
      if (e.pointerType === "mouse" && lastPointer && !reduced) {
        const vx = p.x - lastPointer.x;
        const vy = p.y - lastPointer.y;
        cardRefs.current.forEach((card, i) => {
          const end = ropes[i]?.points[SEGMENTS];
          if (!card || !end) return;
          const cx = end.x;
          const cy = end.y + card.offsetHeight / 2;
          if (Math.abs(p.x - cx) < card.offsetWidth / 2 && Math.abs(p.y - cy) < card.offsetHeight / 2) {
            end.px -= vx * 0.25;
            end.py -= vy * 0.1;
            wake();
          }
        });
      }
      lastPointer = p;
    }

    function onUp(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.id) return;
      const end = ropes[drag.index].points[SEGMENTS];
      // Let go with the throw's speed (capped, so it can't fly off).
      const vx = Math.max(-24, Math.min(24, drag.vx));
      const vy = Math.max(-24, Math.min(24, drag.vy));
      drag = null;
      end.px = end.x - vx;
      end.py = end.y - vy;
      wake();
    }

    layout();
    const ro = new ResizeObserver(() => layout());
    ro.observe(wrap);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    io.observe(wrap);
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("pointerleave", () => (lastPointer = null));
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
    };
  }, [count]);

  return (
    // Cards stay hidden until the first layout has hung them on their strings.
    <div ref={wrapRef} className={`group/hang relative ${className}`} style={{ height: 420 }}>
      <svg ref={svgRef} aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <path data-rail stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path data-strings stroke="var(--gold)" strokeOpacity="0.8" strokeWidth="1.25" fill="none" />
      </svg>
      {items.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
          type="button"
          aria-label={item.label}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            onSelectRef.current(itemsRef.current[i]);
          }}
          className="absolute top-0 left-0 origin-top cursor-grab touch-none text-left opacity-0 transition-opacity duration-500 select-none group-data-ready/hang:opacity-100 active:cursor-grabbing"
        >
          {renderCard(item)}
        </button>
      ))}
    </div>
  );
}
