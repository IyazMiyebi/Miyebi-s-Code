"use client";

import { useEffect, useRef } from "react";

// "Interactive box grid" from the reference reel: a field of tiles that lift
// and glow under the cursor. Drawn on a 2D canvas behind its children.
// With a mouse it only redraws while tiles are moving. Without one (phones),
// a ghost cursor drifts slowly across instead, at 30fps.

const TILE = 44;
const RADIUS = 190;
const LIFT = 9;

export function BoxGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const css = getComputedStyle(wrap);
    const line = css.getPropertyValue("--line").trim() || "#2e2420";
    const gold = css.getPropertyValue("--gold").trim() || "#c9a46a";
    const crimson = "#7a1e2c";

    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;
    let lift = new Float32Array(0);
    let raf = 0;
    let visible = false;
    let pointer: { x: number; y: number } | null = null;
    let lastPointer = -Infinity;
    let lastDraw = 0;
    let moving = true;
    const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function resize() {
      if (!canvas || !ctx || !wrap) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / TILE) + 1;
      rows = Math.ceil(height / TILE) + 1;
      lift = new Float32Array(cols * rows);
      draw();
    }

    function target(now: number) {
      if (pointer && now - lastPointer < 2500) return pointer;
      if (reduced || hasMouse) return null;
      // Ghost cursor: a slow figure-of-eight across the section.
      const t = now / 4200;
      return { x: width * (0.5 + 0.38 * Math.sin(t)), y: height * (0.5 + 0.3 * Math.sin(t * 2)) };
    }

    function draw(now = performance.now()) {
      if (!ctx) return;
      const p = target(now);
      moving = false;
      ctx.clearRect(0, 0, width, height);
      const offsetX = (width % TILE) / 2 - TILE / 2;
      const offsetY = (height % TILE) / 2 - TILE / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const x = offsetX + c * TILE;
          const y = offsetY + r * TILE;
          let goal = 0;
          if (p) {
            const d = Math.hypot(x + TILE / 2 - p.x, y + TILE / 2 - p.y);
            goal = d < RADIUS ? (1 - d / RADIUS) ** 2 : 0;
          }
          const delta = (goal - lift[i]) * 0.12;
          lift[i] += delta;
          if (Math.abs(delta) > 0.001) moving = true;
          const l = lift[i];

          // Resting tile: hairline square with a small diamond, like a
          // monogrammed lining.
          ctx.strokeStyle = line;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
          const cx = x + TILE / 2;
          const cy = y + TILE / 2;
          ctx.fillStyle = line;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 3);
          ctx.lineTo(cx + 3, cy);
          ctx.lineTo(cx, cy + 3);
          ctx.lineTo(cx - 3, cy);
          ctx.fill();

          if (l > 0.02) {
            const dy = -l * LIFT;
            ctx.globalAlpha = l * 0.55;
            ctx.fillStyle = "#000";
            ctx.fillRect(x + 3, y + 3, TILE - 2, TILE - 2);
            ctx.globalAlpha = Math.min(1, l * 1.2);
            const grad = ctx.createLinearGradient(x, y + dy, x + TILE, y + TILE + dy);
            grad.addColorStop(0, gold);
            grad.addColorStop(1, crimson);
            ctx.fillStyle = grad;
            ctx.fillRect(x + 1, y + 1 + dy, TILE - 2, TILE - 2);
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const ghost = !hasMouse && !reduced;
      if (ghost && now - lastDraw < 33) return; // 30fps is plenty for the drift
      if (!ghost && !moving && !pointer) return;
      lastDraw = now;
      draw(now);
    }

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" || !wrap) return;
      const rect = wrap.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      lastPointer = performance.now();
      moving = true;
    }
    const onLeave = () => {
      pointer = null;
      moving = true; // let the tiles settle back down
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(wrap);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 size-full" />
      <div className="relative">{children}</div>
    </div>
  );
}
