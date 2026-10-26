"use client";

import { useEffect, useRef, useState } from "react";
import { Wordmark } from "../wordmark";
import { INTRO_KEY } from "@/lib/intro";
import { ASCII_SCRAMBLE, asciiCells } from "./ascii";
import { optimisedSrc } from "./water-ripple";

// "ASCII pixels" from the reference reel, as a first-visit intro: the hero
// photo is redrawn in characters that scramble and settle, then the overlay
// fades away. Shown once per browser session, on the home page only.
//
// src/lib/intro.ts has the inline <head> script that sets
// <html data-intro-seen> before first paint when the intro shouldn't show,
// so returning visitors never see a flash of it. A CSS animation also hides
// it after a few seconds in case this script never runs.

const DURATION = 1300;

function markSeen() {
  try {
    sessionStorage.setItem(INTRO_KEY, "1");
  } catch {}
  document.documentElement.dataset.introSeen = "";
}

export function AsciiIntro({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Already hidden by CSS; nothing to animate.
    if (document.documentElement.dataset.introSeen !== undefined) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    let raf = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      setLeaving(true);
      setTimeout(() => {
        markSeen();
        setGone(true);
      }, 600);
    };
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    // If the photo is slow to arrive, don't hold the visitor up.
    const timeout = setTimeout(finish, 1100);

    const image = new Image();
    image.onload = () => {
      if (finished || !canvas || !ctx) return;
      clearTimeout(timeout);

      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cell = width < 640 ? 9 : 11;
      const cols = Math.floor(width / cell);
      const rows = Math.floor(height / (cell * 1.4));

      const { glyphs } = asciiCells(image, cols, rows, 1.4);
      const reveal = glyphs.map(() => Math.random() * DURATION * 0.7);

      const gold = getComputedStyle(canvas).getPropertyValue("--gold").trim() || "#c9a46a";
      const font = `${cell * 1.15}px ui-monospace, monospace`;

      // Each character is drawn once, onto an offscreen layer, at the moment
      // it settles; a frame is that layer plus a handful of scrambling
      // characters. Far cheaper than redrawing thousands of glyphs per frame.
      const settledLayer = document.createElement("canvas");
      settledLayer.width = canvas.width;
      settledLayer.height = canvas.height;
      const lctx = settledLayer.getContext("2d")!;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const c of [ctx, lctx]) {
        c.font = font;
        c.textBaseline = "top";
        c.fillStyle = gold;
      }
      lctx.globalAlpha = 0.85;
      const order = [...reveal.keys()].sort((a, b) => reveal[a] - reveal[b]);
      let next = 0;
      const start = performance.now();

      const frame = (now: number) => {
        const t = now - start;
        while (next < order.length && reveal[order[next]] <= t) {
          const i = order[next++];
          if (glyphs[i] !== " ") lctx.fillText(glyphs[i], (i % cols) * cell, Math.floor(i / cols) * cell * 1.4);
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(settledLayer, 0, 0, width, height);
        ctx.globalAlpha = 0.35;
        const pending = order.length - next;
        for (let k = 0; k < Math.min(160, pending); k++) {
          const i = order[next + ((Math.random() * pending) | 0)];
          ctx.fillText(ASCII_SCRAMBLE[(Math.random() * ASCII_SCRAMBLE.length) | 0], (i % cols) * cell, Math.floor(i / cols) * cell * 1.4);
        }
        ctx.globalAlpha = 1;
        if (t < DURATION) raf = requestAnimationFrame(frame);
        else finish();
      };
      raf = requestAnimationFrame(frame);
    };
    image.src = optimisedSrc(src, 384);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [src]);

  if (gone) return null;
  return (
    <div
      aria-hidden
      data-theme="noir"
      className={`ascii-intro fixed inset-0 z-50 grid place-items-center bg-bg transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <Wordmark className="relative rounded-full bg-bg/70 px-6 py-3 text-5xl backdrop-blur-sm sm:text-7xl" />
    </div>
  );
}
