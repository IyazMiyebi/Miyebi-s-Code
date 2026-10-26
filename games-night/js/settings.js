/*
 * Settings panel: points, timers, sound, motion and a full reset. Saves as you type.
 */
(function () {
  const dlg = document.getElementById("settings");

  const POINTS = [
    ["musicBoth", "Music: title and artist"],
    ["musicOne", "Music: only one right"],
    ["scramble", "Nauseous: per word"],
    ["brain", "Brain Games: per question"],
    ["mini", "Mini Games: per win"],
    ["categoryAnswer", "Category Bank: per answer"],
    ["categoryBonus", "Category Bank: last team standing"]
  ];
  const TIMERS = [
    ["musicClipSeconds", "Music: clip length"],
    ["musicSeconds", "Music: time to answer"],
    ["scrambleSeconds", "Nauseous: per word"],
    ["brainSeconds", "Brain Games: per question"],
    ["categoryTurnSeconds", "Category Bank: per turn"],
    ["memoryShowSeconds", "Memory Tray: looking"],
    ["memoryWriteSeconds", "Memory Tray: writing"]
  ];

  // Games with their own points and timer (True or False…) get rows too.
  function fields(pack = GN.store.get().pack) {
    const extra = pack.rounds.filter((r) => r.kind === "quiz" && r.rulesKey && r.rulesKey !== "brain");
    const each = (r) => (r.turns ? "per turn" : "per " + GN.lineup.noun(r, 1));
    return {
      POINTS: [...POINTS, ...extra.map((r) => [r.rulesKey, `${r.name}: ${each(r)}`])],
      TIMERS: [...TIMERS, ...extra.map((r) => [r.rulesKey + "Seconds", `${r.name}: ${each(r)}`])]
    };
  }

  function numberRow([key, label], value, unit) {
    return `<label class="set-row"><span>${label}</span>
      <span class="set-num"><input id="set-${key}" type="number" inputmode="numeric" min="0" max="999" step="1" value="${value}" data-rule="${key}"><small>${unit}</small></span></label>`;
  }

  function render() {
    const { rules, settings } = GN.store.get();
    const F = fields();
    dlg.innerHTML = `
      <form method="dialog" class="settings__inner">
        <header class="settings__head">
          <h2 id="settings-title" class="settings__title">Settings</h2>
          <button class="bar__btn" value="close" title="Close (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg><span class="sr">Close</span></button>
        </header>
        <p class="settings__saved">Changes save straight away.</p>
        <div class="settings__cols">
          <section><h3 class="settings__h">Points</h3>${F.POINTS.map((p) => numberRow(p, rules[p[0]] ?? 0, "pts")).join("")}</section>
          <section><h3 class="settings__h">Timers</h3>${F.TIMERS.map((p) => numberRow(p, rules[p[0]] ?? 0, "sec")).join("")}</section>
          <section>
            <h3 class="settings__h">Show</h3>
            <label class="set-row"><span>Sound effects</span>
              <input id="set-sound" class="toggle" type="checkbox" ${settings.sound ? "checked" : ""} data-setting="sound"></label>
            <fieldset class="set-row set-row--stack"><legend>Animation</legend>
              <div class="seg">
                ${[["auto", "Match this device"], ["full", "Full"], ["reduce", "Reduced"]].map(([v, l]) =>
                  `<label><input type="radio" name="motion" value="${v}" ${settings.motion === v ? "checked" : ""} data-setting="motion"><span>${l}</span></label>`).join("")}
              </div>
            </fieldset>
            <fieldset class="set-row set-row--stack"><legend>On-screen controls (Next, Back, Out…)</legend>
              <div class="seg">
                ${[["auto", "Touch screens"], ["on", "Always"], ["off", "Never"]].map(([v, l]) =>
                  `<label><input type="radio" name="touchControls" value="${v}" ${(settings.touchControls || "auto") === v ? "checked" : ""} data-setting="touchControls"><span>${l}</span></label>`).join("")}
              </div>
            </fieldset>
            <h3 class="settings__h">Questions</h3>
            <div class="set-reset"><button type="button" class="btn btn--ghost btn--small" data-edit-open>Edit questions and packs</button>
              <a class="btn btn--ghost btn--small" href="cheatsheet.html" target="_blank" rel="noopener">Host cheat sheet (printable)</a></div>
            <p class="settings__version">Ultimate Games Night · version ${GN.VERSION}</p>
            <h3 class="settings__h">Game</h3>
            <div class="set-reset" data-reset-wrap>
              <button type="button" class="btn btn--ghost btn--small" data-reset>Start a new game…</button>
            </div>
            ${GN.role === "remote" ? "" : `<h3 class="settings__h">Phone remote</h3><div class="set-remote" data-remote-panel></div>`}
          </section>
        </div>
      </form>`;
  }

  dlg.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.rule) {
      const n = Math.max(0, Math.min(999, Math.round(Number(t.value))));
      if (Number.isFinite(n) && t.value !== "") GN.store.set((s) => ({ rules: { ...s.rules, [t.dataset.rule]: n } }));
    }
  });
  dlg.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.setting === "sound") GN.store.set((s) => ({ settings: { ...s.settings, sound: t.checked } }));
    if (t.dataset.setting === "motion") GN.store.set((s) => ({ settings: { ...s.settings, motion: t.value } }));
    if (t.dataset.setting === "touchControls") GN.store.set((s) => ({ settings: { ...s.settings, touchControls: t.value } }));
    if (t.dataset.rule && t.value === "") t.value = GN.store.get().rules[t.dataset.rule];
  });
  dlg.addEventListener("click", (e) => {
    const wrap = dlg.querySelector("[data-reset-wrap]");
    if (e.target.closest("[data-reset]")) {
      wrap.innerHTML = `<p class="set-reset__q">Clear the teams and scores and put every setting back?</p>
        <div class="set-reset__btns"><button type="button" class="btn btn--small btn--danger" data-reset-yes>Yes, start over</button>
        <button type="button" class="btn btn--ghost btn--small" data-reset-no>Keep my game</button></div>`;
      wrap.querySelector("[data-reset-no]").focus();
    } else if (e.target.closest("[data-reset-no]")) {
      render();
    } else if (e.target.closest("[data-reset-yes]")) {
      GN.store.reset();
      dlg.close();
      location.reload();
    }
    // Clicking the dark backdrop closes the panel.
    if (e.target === dlg) dlg.close();
  });
  // Re-open the current screen afterwards so new points and timers show everywhere.
  dlg.addEventListener("close", () => {
    const id = GN.store.get().screen;
    GN.store.set({ screen: id });
    document.dispatchEvent(new CustomEvent("gn:settings-closed"));
  });

  // The editor opens in its own tab, away from the TV.
  GN.openEditor = function () {
    let w = null;
    try { w = window.open(location.pathname + "#edit", "gn-edit"); } catch (e) { /* blocked */ }
    if (!w) GN.ui.toast("Your browser blocked the new tab. Open this page in a new tab and add #edit to the end of the address.", 9000);
  };
  dlg.addEventListener("click", (e) => { if (e.target.closest("[data-edit-open]")) GN.openEditor(); });

  GN.settings = {
    get FIELDS() { return fields(); },
    fields,
    open() {
      render();
      const rp = dlg.querySelector("[data-remote-panel]");
      if (rp) GN.remote.panel(rp);
      dlg.showModal();
    },
    isOpen: () => dlg.open
  };
})();
