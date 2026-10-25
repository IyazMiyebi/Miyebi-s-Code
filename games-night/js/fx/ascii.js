/*
 * "ASCII pixels": a word drawn out of text characters, like the flower in the reference.
 * asciiField paints big text as a grid of characters that settle out of random noise.
 * decode makes a line of real text resolve from scrambled characters, left to right.
 */
(function () {
  GN.fx = GN.fx || {};

  const RAMP = " .:-=+*#%@";
  const NOISE = "!<>-_\\/[]{}=+*^?#%@$&01";
  const pick = (s) => s[(Math.random() * s.length) | 0];

  GN.fx.asciiField = function (canvas, opts) {
    const ctx = canvas.getContext("2d");
    const src = document.createElement("canvas");
    const sctx = src.getContext("2d", { willReadFrequently: true });
    let cells = [], cols = 0, rows = 0, cell = 0, raf = 0, born = 0, alive = true;
    const color = opts.color || "#f3ebe1";
    const accent = opts.accent || "#ff3fd0";
    const form = opts.formMs || 1400;

    function layout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = opts.cell || Math.max(9, Math.round(Math.min(w, h) / 70));
      cols = Math.ceil(w / (cell * 0.62));
      rows = Math.ceil(h / cell);
      // Paint the text small, one pixel per character cell, then read the brightness back.
      src.width = cols; src.height = rows;
      sctx.clearRect(0, 0, cols, rows);
      sctx.fillStyle = "#fff";
      sctx.textAlign = "center";
      sctx.textBaseline = "middle";
      const lines = String(opts.text).split("\n");
      sctx.font = `${opts.weight || 900} 100px ${opts.font || '"Archivo", sans-serif'}`;
      const widest = Math.max(1, ...lines.map((l) => sctx.measureText(l).width));
      // One pixel here becomes one character cell, which is 0.62 as wide as it is tall,
      // so the text is squashed vertically by 0.62 to come out the right shape.
      const fill = opts.fill || 0.85;
      const k = Math.min((cols * 0.92) / widest, (rows * fill) / (100 * 0.62 * 1.05 * lines.length));
      sctx.save();
      sctx.translate(cols / 2, rows / 2);
      sctx.scale(k, k * 0.62);
      lines.forEach((l, i) => sctx.fillText(l, 0, (i - (lines.length - 1) / 2) * 105));
      sctx.restore();
      const px = sctx.getImageData(0, 0, cols, rows).data;
      cells = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const v = px[(y * cols + x) * 4 + 3] / 255;
          cells.push({ x, y, v, ch: v > 0.08 ? RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(v * (RAMP.length - 1)))] : "", delay: Math.random() * form * 0.7 + (x / cols) * form * 0.3 });
        }
      }
      ctx.font = `500 ${cell}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";
    }

    function draw(now) {
      if (!alive) return;
      const t = now - born;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const cw = cell * 0.62;
      for (const c of cells) {
        const formed = t >= c.delay;
        let ch, a, col = color;
        if (c.ch && formed) {
          ch = Math.random() < 0.004 ? pick(NOISE) : c.ch;
          a = Math.min(1, (t - c.delay) / 300) * (0.35 + c.v * 0.65);
          if (t - c.delay < 160) col = accent;
        } else if (!formed && (c.ch || Math.random() < 0.05)) {
          ch = pick(NOISE);
          a = c.ch ? 0.35 : 0.12;
          col = accent;
        } else if (Math.random() < 0.0015) {
          ch = pick(NOISE); a = 0.12;
        } else continue;
        ctx.globalAlpha = a * (opts.alpha == null ? 1 : opts.alpha);
        ctx.fillStyle = col;
        ctx.fillText(ch, c.x * cw, c.y * cell);
      }
      ctx.globalAlpha = 1;
      if (GN.motionOK()) raf = requestAnimationFrame(draw);
    }

    function start() {
      cancelAnimationFrame(raf);
      layout();
      born = performance.now() - (GN.motionOK() ? 0 : form * 2);
      raf = requestAnimationFrame(draw);
    }
    const ro = new ResizeObserver(() => start());
    ro.observe(canvas);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && start());

    return {
      destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); }
    };
  };

  // Resolve `text` into `el` from scrambled characters. Returns a cancel function.
  GN.fx.decode = function (el, text, ms = 900) {
    el.textContent = "";
    if (!GN.motionOK()) { el.textContent = text; return () => {}; }
    const chars = [...text];
    const spans = chars.map((c) => {
      const s = document.createElement("span");
      s.className = "dc";
      s.textContent = c === " " ? " " : pick(NOISE);
      el.appendChild(s);
      return s;
    });
    el.setAttribute("aria-label", text);
    const at = chars.map((_, i) => (i / chars.length) * ms * 0.7 + Math.random() * ms * 0.3);
    const t0 = performance.now();
    let raf = 0, last = 0;
    function step(now) {
      const t = now - t0;
      const flip = now - last > 45;
      if (flip) last = now;
      let done = true;
      spans.forEach((s, i) => {
        if (t >= at[i]) {
          if (s.className !== "") { s.textContent = chars[i]; s.className = ""; }
        } else {
          done = false;
          if (flip && chars[i] !== " ") s.textContent = pick(NOISE);
        }
      });
      if (done) { el.textContent = text; el.removeAttribute("aria-label"); }
      else raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); el.textContent = text; };
  };
})();
