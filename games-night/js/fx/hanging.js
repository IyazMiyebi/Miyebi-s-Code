/*
 * "Hanging card" effect: an element hangs on a string and swings like a pendulum.
 * Grab it and throw it; call nudge() to make it bounce (used when a team scores).
 */
(function () {
  GN.fx = GN.fx || {};

  const live = new Set();
  let raf = 0;

  function tick() {
    raf = 0;
    const dt = 1 / 60;
    for (const h of live) {
      if (h.dragging) continue;
      const acc = -(9.8 / h.length) * Math.sin(h.angle) - 1.6 * h.vel;
      h.vel += acc * dt;
      h.angle += h.vel * dt;
      if (Math.abs(h.angle) < 0.0005 && Math.abs(h.vel) < 0.0005) {
        h.angle = h.vel = 0;
        live.delete(h);
      }
      h.apply();
    }
    if (live.size) raf = requestAnimationFrame(tick);
  }
  function wake(h) {
    live.add(h);
    if (!raf) raf = requestAnimationFrame(tick);
  }

  // `el` rotates around its top-centre point (where the string is pinned).
  GN.fx.hang = function (el, opts = {}) {
    const h = {
      angle: opts.startAngle || 0,
      vel: 0,
      length: opts.length || 1.4, // metres of make-believe string: longer swings slower
      dragging: false,
      apply() { el.style.transform = `rotate(${h.angle}rad)`; }
    };
    el.style.transformOrigin = "50% 0";
    h.apply();

    let last = null, pin = null;
    function onDown(e) {
      if (!GN.motionOK() || e.button > 0) return;
      // Measure the pin (top-centre) with the rotation switched off for a moment.
      el.style.transform = "none";
      const r = el.getBoundingClientRect();
      pin = { x: r.left + r.width / 2, y: r.top };
      h.apply();
      h.dragging = true;
      last = { a: h.angle, t: performance.now() };
      el.setPointerCapture(e.pointerId);
      el.classList.add("is-grabbed");
    }
    function onMove(e) {
      if (!h.dragging) return;
      const a = Math.max(-1.2, Math.min(1.2, Math.atan2(pin.x - e.clientX, e.clientY - pin.y)));
      const t = performance.now();
      const dt = Math.max(1, t - last.t) / 1000;
      h.vel = (a - last.a) / dt;
      h.angle = a;
      last = { a, t };
      h.apply();
    }
    function onUp() {
      if (!h.dragging) return;
      h.dragging = false;
      h.vel = Math.max(-8, Math.min(8, h.vel));
      el.classList.remove("is-grabbed");
      wake(h);
    }
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);

    const api = {
      nudge(strength = 1.2) {
        if (!GN.motionOK()) return;
        h.vel += (Math.random() < 0.5 ? -1 : 1) * strength;
        wake(h);
      },
      destroy() { live.delete(h); }
    };
    if (opts.startAngle && GN.motionOK()) wake(h);
    else { h.angle = 0; h.apply(); }
    return api;
  };
})();
