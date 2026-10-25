/*
 * "Interactive box grid" effect: a tilted floor of rounded tiles that glow neon pink and
 * violet and lift up where the light falls. The light follows the mouse, a focused
 * element, or (left alone) drifts by itself.
 */
(function () {
  GN.fx = GN.fx || {};

  GN.fx.boxGrid = function (host, opts = {}) {
    const cols = opts.cols || 9, rows = opts.rows || 9;
    host.classList.add("bx");
    host.innerHTML = `<div class="bx__floor">${'<span class="bx__tile"><i></i></span>'.repeat(cols * rows)}</div>`;
    const floor = host.firstElementChild;
    floor.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    const tiles = [...floor.children];

    let centres = [], light = { x: 0, y: 0 }, target = null, lastPointer = -1e9, raf = 0, t0 = performance.now();

    function measure() {
      centres = tiles.map((t) => {
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
    }

    function frame() {
      const box = host.getBoundingClientRect();
      let goal = target;
      if (!goal) {
        // Drift in a slow figure-of-eight when nobody is pointing at anything.
        const t = (performance.now() - t0) / 1000;
        goal = { x: box.left + box.width * (0.5 + 0.3 * Math.sin(t * 0.35)), y: box.top + box.height * (0.5 + 0.22 * Math.sin(t * 0.7)) };
      }
      light.x += (goal.x - light.x) * 0.08;
      light.y += (goal.y - light.y) * 0.08;
      const reach = Math.max(box.width, box.height) * 0.28;
      for (let i = 0; i < tiles.length; i++) {
        const c = centres[i];
        const d = Math.hypot(c.x - light.x, c.y - light.y) / reach;
        const g = Math.max(0, 1 - d * d);
        tiles[i].style.setProperty("--g", g.toFixed(3));
      }
      raf = requestAnimationFrame(frame);
    }

    function onMove(e) {
      lastPointer = performance.now();
      target = { x: e.clientX, y: e.clientY };
      clearTimeout(onMove.t);
      onMove.t = setTimeout(() => { if (performance.now() - lastPointer > 3500) target = null; }, 3600);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(host);
    window.addEventListener("pointermove", onMove, { passive: true });
    const box = host.getBoundingClientRect();
    light = { x: box.left + box.width / 2, y: box.top + box.height / 2 };

    function play() {
      cancelAnimationFrame(raf);
      measure();
      if (GN.motionOK()) frame();
      else tiles.forEach((t) => t.style.setProperty("--g", "0.25"));
    }
    play();

    return {
      play,
      // Point the light at an element (e.g. the focused round card); null to let it drift.
      focus(el) {
        if (!el) { target = null; return; }
        const r = el.getBoundingClientRect();
        target = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      },
      destroy() {
        cancelAnimationFrame(raf);
        clearTimeout(onMove.t);
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
      }
    };
  };
})();
