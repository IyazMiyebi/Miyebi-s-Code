"use client";

import { useEffect, useRef } from "react";
import { ASCII_SCRAMBLE, asciiCells } from "./ascii";
import { optimisedSrc } from "./water-ripple";

// "ASCII pixels" as a page header: a photo drawn in characters that types
// itself in from the top when it comes into view, and stirs under the cursor
// or finger. Drawn once onto an offscreen layer; only the stirred patch is
// redrawn per frame, and only while something is moving.

const CELL_ASPECT = 1.5;
const RADIUS = 90;
const REVEAL_MS = 1100;

export function AsciiPortrait({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css = getComputedStyle(wrap);
    const gold = css.getPropertyValue("--gold").trim() || "#c9a46a";
    const ink = css.getPropertyValue("--ink").trim() || "#f2eadf";

    let image: HTMLImageElement | null = null;
    let width = 0;
    let height = 0;
    let cell = 9;
    let cols = 0;
    let rows = 0;
    let glyphs: string[] = [];
    let layer: HTMLCanvasElement | null = null;
    let raf = 0;
    let revealStart = 0;
    let revealed = reduced;
    let visible = false;
    let pointer: { x: number; y: number } | null = null;
    let lastMove = 0;

    function build() {
      if (!image || !wrap || !canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = width < 640 ? 7 : 9;
      cols = Math.floor(width / cell);
      rows = Math.floor(height / (cell * CELL_ASPECT));
      const cells = asciiCells(image, cols, rows, CELL_ASPECT);
      glyphs = cells.glyphs;

      // Brighter characters are also more opaque, so the photo reads clearly.
      layer = document.createElement("canvas");
      layer.width = canvas.width;
      layer.height = canvas.height;
      const lctx = layer.getContext("2d")!;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.font = `${cell * 1.2}px ui-monospace, monospace`;
      lctx.textBaseline = "top";
      lctx.fillStyle = gold;
      for (let i = 0; i < glyphs.length; i++) {
        if (glyphs[i] === " ") continue;
        lctx.globalAlpha = 0.35 + 0.65 * cells.lums[i];
        lctx.fillText(glyphs[i], (i % cols) * cell, Math.floor(i / cols) * cell * CELL_ASPECT);
      }
      draw(performance.now());
    }

    function draw(now: number) {
      if (!ctx || !layer) return;
      ctx.clearRect(0, 0, width, height);
      const rowH = cell * CELL_ASPECT;
      let shown = height;
      if (!revealed) {
        const t = revealStart ? Math.min(1, (now - revealStart) / REVEAL_MS) : 0;
        shown = Math.floor(t * rows) * rowH;
        if (t >= 1) revealed = true;
      }
      if (shown > 0) {
        ctx.drawImage(layer, 0, 0, layer.width, (layer.height * shown) / height, 0, 0, width, shown);
      }
      ctx.font = `${cell * 1.2}px ui-monospace, monospace`;
      ctx.textBaseline = "top";
      // The typing edge: one row of scrambling characters.
      if (!revealed && shown < height) {
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.7;
        const r = Math.round(shown / rowH);
        for (let c = 0; c < cols; c++) {
          if (glyphs[r * cols + c] === " " || Math.random() < 0.4) continue;
          ctx.fillText(ASCII_SCRAMBLE[(Math.random() * ASCII_SCRAMBLE.length) | 0], c * cell, shown);
        }
      }
      // Stirred patch under the pointer: characters flicker to light.
      if (pointer && revealed) {
        const c0 = Math.max(0, Math.floor((pointer.x - RADIUS) / cell));
        const c1 = Math.min(cols - 1, Math.ceil((pointer.x + RADIUS) / cell));
        const r0 = Math.max(0, Math.floor((pointer.y - RADIUS) / rowH));
        const r1 = Math.min(rows - 1, Math.ceil((pointer.y + RADIUS) / rowH));
        ctx.fillStyle = ink;
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const d = Math.hypot(c * cell + cell / 2 - pointer.x, r * rowH + rowH / 2 - pointer.y);
            if (d > RADIUS) continue;
            const k = 1 - d / RADIUS;
            if (Math.random() > k * 0.9) continue;
            ctx.globalAlpha = k;
            ctx.clearRect(c * cell, r * rowH, cell, rowH);
            ctx.fillText(ASCII_SCRAMBLE[(Math.random() * ASCII_SCRAMBLE.length) | 0], c * cell, r * rowH);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    let lastFrame = 0;
    function frame(now: number) {
      raf = 0;
      if (!visible) return;
      const stirring = pointer && now - lastMove < 700;
      if (revealed && !stirring) {
        pointer = null;
        draw(now); // one clean frame to settle
        return;
      }
      if (now - lastFrame >= 33) {
        lastFrame = now;
        draw(now);
      }
      raf = requestAnimationFrame(frame);
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    function onMove(e: PointerEvent) {
      if (reduced || !wrap) return;
      const rect = wrap.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      lastMove = performance.now();
      wake();
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !revealStart && layer) revealStart = performance.now();
      if (visible) wake();
    });
    const ro = new ResizeObserver(() => build());

    const img = new Image();
    img.onload = () => {
      image = img;
      build();
      ro.observe(wrap);
      io.observe(wrap);
    };
    img.src = optimisedSrc(src, 384);
    wrap.addEventListener("pointermove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
    };
  }, [src]);

  return (
    <div ref={wrapRef} role="img" aria-label={alt} className={`relative overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}
