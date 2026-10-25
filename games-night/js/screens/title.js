/*
 * Title screen: the show's name on a rippling liquid surface.
 */
(function () {
  GN.screens = GN.screens || {};

  const FONTS = [
    'italic 400 100px "Instrument Serif"',
    '900 100px "Archivo"',
    '500 20px "JetBrains Mono"'
  ];

  // Draws text one character at a time so letter spacing works in every browser.
  function spaced(ctx, text, x, y, spacing) {
    const chars = [...text];
    const total = chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
    let cx = x - total / 2;
    ctx.textAlign = "left";
    for (const c of chars) {
      ctx.fillText(c, cx, y);
      cx += ctx.measureText(c).width + spacing;
    }
  }

  function paint(pack) {
    return function (ctx, w, h) {
      const m = Math.min(w, h);

      // Ground: warm black with a low red-orange sun and a faint violet haze.
      ctx.fillStyle = "#0c0809";
      ctx.fillRect(0, 0, w, h);
      let g = ctx.createRadialGradient(w * 0.72, h * 1.02, 0, w * 0.72, h * 1.02, m * 0.95);
      g.addColorStop(0, "rgba(255,122,48,0.95)");
      g.addColorStop(0.28, "rgba(255,74,28,0.75)");
      g.addColorStop(0.6, "rgba(179,18,46,0.35)");
      g.addColorStop(1, "rgba(179,18,46,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      g = ctx.createRadialGradient(w * 0.12, h * 0.05, 0, w * 0.12, h * 0.05, m * 0.8);
      g.addColorStop(0, "rgba(139,92,255,0.32)");
      g.addColorStop(1, "rgba(139,92,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Fine dot screen, like the ASCII-pixel texture in the reference.
      ctx.fillStyle = "rgba(243,235,225,0.05)";
      const step = Math.max(6, Math.round(m / 140));
      for (let y = step / 2; y < h; y += step) {
        for (let x = (y / step) % 2 ? step / 2 : 0; x < w; x += step) ctx.fillRect(x, y, 1.2, 1.2);
      }

      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f3ebe1";

      // GAMES NIGHT: heavy condensed grotesk, sized to fill the width.
      // On a tall screen (a phone) it breaks onto two lines.
      const words = (pack.title || "Games Night").replace(/^ultimate\s+/i, "").toUpperCase();
      const lines = w / h < 1 && words.includes(" ") ? words.split(/\s+/) : [words];
      try { ctx.fontStretch = "condensed"; } catch (e) { /* older browsers */ }
      const setBig = (px) => { ctx.font = `900 ${px}px "Archivo", "Arial Narrow", sans-serif`; };
      let size = h * (lines.length > 1 ? 0.2 : 0.3);
      setBig(size);
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      if (widest > w * 0.9) size *= (w * 0.9) / widest;
      setBig(size);
      ctx.textAlign = "center";
      const lead = size * 0.9;
      const base = h * 0.56 + (lines.length - 1) * lead * 0.5;
      lines.forEach((l, i) => ctx.fillText(l, w / 2, base - (lines.length - 1 - i) * lead));
      try { ctx.fontStretch = "normal"; } catch (e) { /* ignore */ }
      const top = base - (lines.length - 1) * lead - size * 0.72; // cap height of the first line

      // "Ultimate" in italic serif, tucked over the top-left of the caps.
      let above = top;
      if (/^ultimate/i.test(pack.title)) {
        const s = size * (lines.length > 1 ? 0.75 : 0.62);
        const capLeft = w / 2 - ctx.measureText(lines[0]).width / 2; // still in the big font
        ctx.font = `italic 400 ${s}px "Instrument Serif", "Times New Roman", serif`;
        ctx.fillStyle = "#ff4a1c";
        ctx.textAlign = "left";
        ctx.fillText("Ultimate", capLeft + size * 0.05, top + s * 0.18);
        ctx.fillStyle = "#f3ebe1";
        above = top - s * 0.62;
      }

      // Spaced mono lines above and below, shrunk to fit narrow screens.
      ctx.fillStyle = "rgba(243,235,225,0.78)";
      const monoLine = (text, y) => {
        let px = Math.max(11, m * 0.022);
        for (let i = 0; i < 8; i++) {
          ctx.font = `500 ${px}px "JetBrains Mono", ui-monospace, monospace`;
          const wdt = [...text].reduce((a, c) => a + ctx.measureText(c).width, 0) + px * 0.9 * (text.length - 1);
          if (wdt <= w * 0.9 || px <= 9) break;
          px *= Math.max(0.6, (w * 0.9) / wdt);
        }
        spaced(ctx, text, w / 2, y, px * 0.9);
        return px;
      };
      const px = Math.max(11, m * 0.022);
      monoLine((pack.tagline || "").toUpperCase(), above - px * 1.6);
      monoLine((pack.strapline || "").toUpperCase(), base + px * 2.6);
    };
  }

  GN.screens.title = {
    label: "Title",
    mount(root, nav) {
      const pack = GN.store.get().pack;
      root.innerHTML = `
        <canvas class="title__canvas" aria-hidden="true"></canvas>
        <h1 class="sr">${GN.esc(pack.title)}: ${GN.esc(pack.tagline)}. ${GN.esc(pack.strapline)}.</h1>
        <div class="title__foot">
          <p class="title__ask">Are you ready?</p>
          <button class="btn btn--big" type="button" data-autofocus data-start>Start the show
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          <p class="title__hint"><kbd>Space</kbd> next · <kbd>F</kbd> full screen · <kbd>S</kbd> settings</p>
        </div>`;
      root.querySelector("[data-start]").addEventListener("click", () => nav.go("teams"));

      const canvas = root.querySelector("canvas");
      const fx = GN.fx.liquid(canvas, paint(pack));
      let alive = true;
      // Repaint once the fonts are ready, or the title would draw in a fallback face.
      if (document.fonts && document.fonts.load) {
        Promise.all(FONTS.map((f) => document.fonts.load(f))).then(() => alive && fx.repaint()).catch(() => {});
      }
      const unsub = GN.store.subscribe(() => fx.play());
      // A welcome splash in the middle of the title.
      const hello = setTimeout(() => fx.drop(0.5, 0.48), 500);
      return () => { alive = false; clearTimeout(hello); unsub(); fx.destroy(); };
    }
  };
})();
