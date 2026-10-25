/*
 * The show runner: moves between screens, handles keyboard shortcuts and the host bar.
 *
 * Keys: Space / → / Page Down = next · ← / Page Up = back · F = full screen
 *       M = sound on/off · S = settings · Esc = close settings
 * (Page Up/Down means a cheap presentation clicker works as a remote.)
 */
(function () {
  const ORDER = ["title", "teams", "rules", "order"];
  const stage = document.getElementById("stage");
  const steps = document.getElementById("steps");
  let current = null; // { id, el, cleanup }

  function go(id, force) {
    if (!GN.screens[id] || (current && current.id === id && !force)) return;
    const calm = !GN.motionOK();
    const el = document.createElement("section");
    el.className = "screen screen--" + id + " is-entering";
    el.setAttribute("aria-label", GN.screens[id].label);
    stage.appendChild(el);
    const cleanup = GN.screens[id].mount(el, { go, next, back }) || (() => {});

    const old = current;
    current = { id, el, cleanup };
    GN.store.set({ screen: id });
    renderSteps();

    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-entering")));
    if (old) {
      old.el.classList.add("is-leaving");
      old.el.setAttribute("aria-hidden", "true");
      old.el.inert = true;
      setTimeout(() => { old.cleanup(); old.el.remove(); }, calm ? 200 : 700);
    }
    const focusTarget = el.querySelector("[data-autofocus]");
    if (focusTarget) setTimeout(() => focusTarget.focus({ preventScroll: true }), calm ? 0 : 450);
  }

  function next() { const i = ORDER.indexOf(current.id); if (i > -1 && i < ORDER.length - 1) go(ORDER[i + 1]); }
  function back() { const i = ORDER.indexOf(current.id); if (i > 0) go(ORDER[i - 1]); }

  function renderSteps() {
    steps.innerHTML = ORDER.map((id, i) => {
      const on = current && current.id === id;
      return `<button type="button" class="steps__item${on ? " is-on" : ""}" data-go="${id}" ${on ? 'aria-current="step"' : ""}>
        <span class="steps__n">${String(i + 1).padStart(2, "0")}</span><span class="steps__label">${GN.screens[id].label}</span></button>`;
    }).join("");
  }
  steps.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (b) go(b.dataset.go);
  });

  // New points or timers from the settings panel: redraw the screen we're on.
  document.addEventListener("gn:settings-closed", () => { if (current && current.id !== "title") go(current.id, true); });

  /* Host bar */
  const btnSound = document.getElementById("btn-sound");
  function syncSound() {
    const on = GN.store.get().settings.sound;
    btnSound.setAttribute("aria-pressed", String(on));
    btnSound.title = on ? "Sound is on (M)" : "Sound is off (M)";
  }
  function toggleSound() {
    const s = GN.store.get().settings;
    GN.store.set({ settings: { ...s, sound: !s.sound } });
    syncSound();
  }
  btnSound.addEventListener("click", toggleSound);

  function toggleFull() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) { /* not available on this device */ }
  }
  document.getElementById("btn-full").addEventListener("click", toggleFull);
  document.getElementById("btn-settings").addEventListener("click", () => GN.settings.open());

  /* Keyboard */
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (GN.settings.isOpen()) return;
    const t = e.target;
    const typing = t.matches("input, textarea, select, [contenteditable]");
    if (typing) return;
    const onControl = t.matches("button, a, summary, [role=button]");
    switch (e.key) {
      case " ":
        if (onControl) return;
        e.preventDefault(); next(); break;
      case "ArrowRight": case "PageDown": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": e.preventDefault(); back(); break;
      case "f": case "F": toggleFull(); break;
      case "m": case "M": toggleSound(); break;
      case "s": case "S": e.preventDefault(); GN.settings.open(); break;
    }
  });

  /* Hide the host bar and progress when the mouse is still, so the TV stays clean. */
  let idleTimer = 0;
  function wake() {
    document.body.classList.remove("is-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => document.body.classList.add("is-idle"), 3000);
  }
  ["pointermove", "pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
  wake();

  /* Motion setting changes take effect straight away. */
  function syncMotion() { document.documentElement.classList.toggle("calm", !GN.motionOK()); }
  GN.store.subscribe(syncMotion);
  if (window.matchMedia) matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", syncMotion);
  syncMotion();
  syncSound();

  /* Works offline: after the first visit the browser keeps a copy of every file. */
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
      try { navigator.serviceWorker.register("sw.js").catch(() => {}); } catch (e) { /* not allowed here */ }
    });
  }

  const start = GN.store.get().screen;
  go(GN.screens[start] ? start : "title");
})();
