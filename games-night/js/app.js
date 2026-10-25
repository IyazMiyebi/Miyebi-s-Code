/*
 * The show runner: moves between screens, handles keyboard shortcuts and the host bar.
 *
 * Keys: Space / → / Page Down = next · ← / Page Up = back · F = full screen
 *       M = sound on/off · S = settings · H = host controls · Esc = close settings
 * During a round the play screen adds its own keys (see js/screens/play.js).
 * (Page Up/Down means a cheap presentation clicker works as a remote.)
 *
 * Opening the page with #host on the end shows the host controls instead (js/host.js).
 */
(function () {
  if (GN.role === "host") { GN.host.start(); return; }

  const ORDER = ["title", "teams", "rules", "order", "play"];
  const stage = document.getElementById("stage");
  const steps = document.getElementById("steps");
  let current = null; // { id, el, cleanup }

  function go(id, force) {
    if (!GN.screens[id] || (current && current.id === id && !force)) return;
    // The live show needs a round: start with the first one not played yet.
    if (id === "play" && GN.store.get().show.round == null) { GN.game.startRound(GN.game.firstUnplayed()); return; }
    const calm = !GN.motionOK();
    const el = document.createElement("section");
    el.className = "screen screen--" + id + " is-entering";
    el.setAttribute("aria-label", GN.screens[id].label);
    stage.appendChild(el);
    const old = current;
    current = { id, el, cleanup: () => {} };
    current.cleanup = GN.screens[id].mount(el, { go, next, back }) || (() => {});
    if (GN.store.get().screen !== id) GN.store.set({ screen: id });
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

  // The host window (or the play screen) changes state.screen: follow it.
  GN.store.subscribe((s) => { if (current && s.screen !== current.id && GN.screens[s.screen]) go(s.screen); });

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
  }
  btnSound.addEventListener("click", toggleSound);
  GN.store.subscribe(syncSound);

  function toggleFull() {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    } catch (e) { /* not available on this device */ }
  }
  document.getElementById("btn-full").addEventListener("click", toggleFull);
  document.getElementById("btn-settings").addEventListener("click", () => GN.settings.open());

  // Host controls open in their own window, to keep on the laptop while the TV shows the game.
  function openHost() {
    let w = null;
    try { w = window.open(location.pathname + location.search + "#host", "gn-host", "width=1200,height=860"); } catch (e) { /* blocked */ }
    if (!w) GN.ui.toast("Your browser blocked the new window. Open this page again in a new tab and add #host to the end of the address.");
  }
  document.getElementById("btn-host").addEventListener("click", openHost);

  /* Keyboard */
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (GN.settings.isOpen()) return;
    const t = e.target;
    if (t.matches("input, textarea, select, [contenteditable]")) return;
    // Space and Enter on a focused button press that button instead.
    if ((e.key === " " || e.key === "Enter") && t.matches("button, a, summary, [role=button]")) return;
    const screen = current && GN.screens[current.id];
    if (screen && screen.onKey && screen.onKey(e)) { e.preventDefault(); return; }
    switch (e.key) {
      case " ": case "ArrowRight": case "PageDown": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": e.preventDefault(); back(); break;
      case "f": case "F": toggleFull(); break;
      case "m": case "M": toggleSound(); break;
      case "h": case "H": openHost(); break;
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
