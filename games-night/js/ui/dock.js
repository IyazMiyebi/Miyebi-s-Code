/*
 * On-screen controls for phones and tablets (no keyboard). A bar along the bottom of the
 * live show: Back, the big Next button (it says what it will do), one quick action that
 * fits the moment (Out, Shuffle, Play again, Pause), and "More" for everything else.
 * Shown on touch screens automatically; Settings can switch it on or off anywhere.
 */
(function () {
  GN.ui = GN.ui || {};
  const G = () => GN.game;
  const S = () => GN.store.get();

  const coarse = window.matchMedia ? matchMedia("(pointer: coarse)") : null;
  GN.touchUI = () => {
    const m = S().settings.touchControls || "auto";
    return m === "on" || (m === "auto" && !!(coarse && coarse.matches));
  };
  // Every screen knows whether it's on a touch screen (no hover hints, no idle hiding).
  const mark = () => document.body.classList.toggle("is-touch", GN.touchUI());
  GN.store.subscribe(mark);
  if (coarse && coarse.addEventListener) coarse.addEventListener("change", mark);
  mark();

  // The one extra action that fits what's on screen right now.
  function quick() {
    const s = S(), sh = s.show, round = G().round(), t = s.timer;
    if (!round || sh.board) return null;
    if (round.kind === "category" && sh.phase === "question" && sh.cat && sh.cat.started && !sh.cat.winner) return { id: "out", label: "✗ Out", cls: "is-danger" };
    if (round.kind === "scramble" && sh.phase === "question") return { id: "shuffle", label: "Shuffle" };
    if (round.kind === "music" && ["question", "reveal"].includes(sh.phase) && G().hasClip()) return { id: "again", label: "Play again" };
    if (sh.phase === "question" && round.kind !== "mini" && round.kind !== "category") {
      if (t.running) return { id: "pause", label: "Pause" };
      if (t.left > 0 && t.left < t.duration && !sh.timesUp) return { id: "pause", label: "Resume" };
    }
    return null;
  }

  // Everything else, in the "More" sheet.
  function more() {
    const s = S(), sh = s.show, round = G().round(), t = s.timer;
    const list = [];
    const timed = round && sh.phase === "question" && !(round.kind === "mini" && G().item() && G().item().mode !== "memory");
    if (timed && (t.running || (t.left > 0 && t.left < t.duration && !sh.timesUp))) list.push(["pause", t.running ? "Pause the timer" : "Resume the timer"]);
    if (timed && round.kind !== "category") list.push(["restart", "Restart the timer"]);
    if (round && sh.phase === "question" && !["mini", "category"].includes(round.kind)) list.push(["reveal", "Reveal the answer now"]);
    if (round && round.kind === "mini" && G().item() && G().item().mode !== "memory" && sh.phase === "question") list.push(["clock", GN.mini.running() ? "Pause the clock" : "Start / resume the clock"]);
    list.push(["board", sh.board ? "Hide the scoreboard" : "Show the scoreboard"]);
    if (s.log.length) list.push(["undo", "Undo the last score"]);
    list.push(["sound", s.settings.sound ? "Turn sound off" : "Turn sound on"]);
    list.push(["exit", "Back to the running order"]);
    list.push(["settings", "Settings"]);
    return list;
  }

  function run(id) {
    const g = G();
    switch (id) {
      case "next": return g.advance();
      case "back": return g.back();
      case "out": return GN.category.out();
      case "shuffle": return g.shuffle();
      case "again": return g.playClip();
      case "pause": return g.togglePause();
      case "restart": return g.restartTimer();
      case "reveal": return g.reveal();
      case "clock": return GN.mini.toggleClock();
      case "board": return g.toggleBoard();
      case "undo": return g.undo();
      case "sound": return GN.store.set((s) => ({ settings: { ...s.settings, sound: !s.settings.sound } }));
      case "exit": return g.exit();
      case "settings": return GN.settings.open();
    }
  }

  GN.ui.dock = function (host) {
    host.innerHTML = `
      <div class="sheet" data-sheet hidden role="menu" aria-label="More controls"></div>
      <div class="dock" role="toolbar" aria-label="Show controls">
        <button type="button" class="dock__btn" data-d="back" aria-label="Back a step">‹</button>
        <button type="button" class="dock__main" data-d="next"><span data-d-label></span><span aria-hidden="true"> ›</span></button>
        <button type="button" class="dock__btn dock__quick" data-d-quick hidden></button>
        <button type="button" class="dock__btn" data-d="more" aria-label="More controls" aria-expanded="false">⋯</button>
      </div>`;
    const sheet = host.querySelector("[data-sheet]");
    const moreBtn = host.querySelector('[data-d="more"]');
    const quickBtn = host.querySelector("[data-d-quick]");

    function closeSheet() { sheet.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); }
    function render() {
      host.hidden = !GN.touchUI();
      if (host.hidden) return;
      host.querySelector("[data-d-label]").textContent = G().nextLabel();
      const q = quick();
      quickBtn.hidden = !q;
      if (q) { quickBtn.textContent = q.label; quickBtn.dataset.d = q.id; quickBtn.className = "dock__btn dock__quick " + (q.cls || ""); }
      if (!sheet.hidden) fillSheet();
    }
    function fillSheet() {
      sheet.innerHTML = more().map(([id, label]) => `<button type="button" role="menuitem" class="sheet__item" data-d="${id}">${label}</button>`).join("");
    }
    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-d]");
      if (!b) return;
      if (b.dataset.d === "more") {
        const open = sheet.hidden;
        if (open) fillSheet();
        sheet.hidden = !open;
        moreBtn.setAttribute("aria-expanded", String(open));
        return;
      }
      closeSheet();
      run(b.dataset.d);
    });
    const outside = (e) => { if (!host.contains(e.target)) closeSheet(); };
    document.addEventListener("pointerdown", outside);
    const unsub = GN.store.subscribe(render);
    if (coarse && coarse.addEventListener) coarse.addEventListener("change", render);
    render();
    return () => { unsub(); document.removeEventListener("pointerdown", outside); if (coarse && coarse.removeEventListener) coarse.removeEventListener("change", render); };
  };
})();
