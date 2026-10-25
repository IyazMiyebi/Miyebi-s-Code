/*
 * "Spiral gallery": cards wound round a slowly turning 3D spiral, like the reference.
 * Songs not played yet show a numbered neon card, so no cover gives an answer away.
 * focus(i) turns card i to the front and brings it forward; reveal(i, img) turns it over.
 */
(function () {
  GN.fx = GN.fx || {};

  GN.fx.spiral = function (host, cards) {
    const n = cards.length;
    const STEP = 360 / 4.5;              // degrees between cards: about two turns for ten
    host.classList.add("sp");
    host.innerHTML = `<div class="sp__axis">${cards.map((c, i) => `
      <div class="sp__card${c.art ? " is-shown" : ""}" data-i="${i}" style="--i:${i}">
        <div class="sp__face sp__face--q"><span>${String(i + 1).padStart(2, "0")}</span></div>
        <div class="sp__face sp__face--art">${c.art ? `<img alt="" src="${c.art}">` : ""}</div>
      </div>`).join("")}</div>`;
    const axis = host.firstElementChild;
    const els = [...axis.children];

    let rot = 0, target = null, focus = -1, raf = 0, last = performance.now();
    function layout() {
      const w = host.clientWidth || 400;
      const card = Math.min(w * 0.36, host.clientHeight * 0.32 || w * 0.36);
      const r = card * 1.05;
      const rise = card * 0.32;
      host.style.setProperty("--card", card + "px");
      els.forEach((el, i) => {
        const a = i * STEP;
        const lift = i === focus ? 1 : 0;
        el.style.transform = `rotateY(${a}deg) translateZ(${r + lift * card * 0.45}px) translateY(${(i - (n - 1) / 2) * rise}px) scale(${1 + lift * 0.35})`;
        el.classList.toggle("is-focus", i === focus);
      });
      return rise;
    }
    let rise = layout();

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (target == null) rot += dt * 9; // drift
      else {
        let d = target - rot;
        d = ((d + 540) % 360) - 180;
        rot += d * Math.min(1, dt * 4);
      }
      // Keep the focused card (or the middle of the spiral) at eye level.
      axis.style.transform = `translateY(${-(focus >= 0 ? focus - (n - 1) / 2 : 0) * rise}px) rotateY(${-rot}deg)`;
      raf = requestAnimationFrame(frame);
    }
    const ro = new ResizeObserver(() => { rise = layout(); });
    ro.observe(host);
    if (GN.motionOK()) raf = requestAnimationFrame(frame);
    else axis.style.transform = "rotateY(0deg)";

    return {
      focus(i) {
        focus = i;
        target = i == null || i < 0 ? null : i * STEP;
        rise = layout();
        if (!GN.motionOK()) {
          rot = target || 0;
          axis.style.transform = `translateY(${-(focus >= 0 ? focus - (n - 1) / 2 : 0) * rise}px) rotateY(${-rot}deg)`;
        }
      },
      reveal(i, art, instant) {
        const el = els[i];
        if (!el || !art) return;
        if (instant) { el.classList.add("no-anim"); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("no-anim"))); }
        el.querySelector(".sp__face--art").innerHTML = `<img alt="" src="${art}">`;
        el.classList.add("is-shown");
      },
      destroy() { cancelAnimationFrame(raf); ro.disconnect(); }
    };
  };
})();
