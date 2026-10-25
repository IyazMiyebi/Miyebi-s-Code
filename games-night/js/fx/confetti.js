/*
 * Confetti for the finale, in the winning team's colour (plus a few others).
 * Bursts from both bottom corners, then rains gently for a while.
 */
(function () {
  GN.fx = GN.fx || {};

  GN.fx.confetti = function (canvas, colours) {
    const ctx = canvas.getContext("2d");
    let parts = [], raf = 0, w = 0, h = 0, dpr = 1, until = 0;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    function piece(x, y, vx, vy) {
      return {
        x, y, vx, vy,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        s: 6 + Math.random() * 8, c: colours[(Math.random() * colours.length) | 0],
        shape: Math.random() < 0.7 ? "rect" : "dot", flip: Math.random() * 6
      };
    }
    function burst(n = 160) {
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0;
        parts.push(piece(left ? 0 : w, h * 0.95, (left ? 1 : -1) * (4 + Math.random() * 9), -(10 + Math.random() * 12)));
      }
    }
    function rain(n) { for (let i = 0; i < n; i++) parts.push(piece(Math.random() * w, -20, (Math.random() - 0.5) * 2, 1 + Math.random() * 2)); }

    function frame(now) {
      ctx.clearRect(0, 0, w, h);
      if (now < until && Math.random() < 0.5) rain(2);
      parts = parts.filter((p) => p.y < h + 40);
      for (const p of parts) {
        p.vy += 0.25; p.vx *= 0.99; p.vy = Math.min(p.vy, 6);
        p.x += p.vx; p.y += p.vy; p.r += p.vr; p.flip += 0.15;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.scale(1, Math.cos(p.flip));
        ctx.fillStyle = p.c;
        if (p.shape === "rect") ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        else { ctx.beginPath(); ctx.arc(0, 0, p.s / 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (parts.length || now < until) raf = requestAnimationFrame(frame);
      else raf = 0;
    }

    return {
      // A big burst, then rain for `seconds`.
      fire(seconds = 7) {
        if (!GN.motionOK()) {
          // Still, scattered confetti instead of movement.
          ctx.clearRect(0, 0, w, h);
          for (let i = 0; i < 120; i++) {
            const p = piece(Math.random() * w, Math.random() * h, 0, 0);
            ctx.fillStyle = p.c;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
          }
          return;
        }
        burst();
        until = performance.now() + seconds * 1000;
        if (!raf) raf = requestAnimationFrame(frame);
      },
      destroy() { cancelAnimationFrame(raf); ro.disconnect(); }
    };
  };
})();
