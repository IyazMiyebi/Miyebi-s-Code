/*
 * Scoring on the big screen: the team strip along the bottom, the pop-up with
 * +points / custom / undo, and numbers that roll up when a score changes.
 */
(function () {
  GN.ui = GN.ui || {};
  const esc = GN.esc;

  // Count a number from `from` to `to` inside `el`.
  GN.ui.roll = function (el, from, to, ms = 900) {
    cancelAnimationFrame(el._roll);
    if (!GN.motionOK() || from === to) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) el._roll = requestAnimationFrame(step);
    };
    el._roll = requestAnimationFrame(step);
  };

  // A "+10" that floats up from an element in the team's colour.
  GN.ui.floatPoints = function (anchor, points, colour) {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const f = document.createElement("span");
    f.className = "float-pts" + (points < 0 ? " is-minus" : "");
    f.textContent = (points > 0 ? "+" : "") + points;
    f.style.setProperty("--team", colour);
    f.style.left = r.left + r.width / 2 + "px";
    f.style.top = r.top + "px";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), GN.motionOK() ? 1400 : 600);
  };

  GN.ui.scoreStrip = function (host) {
    host.className = "strip";
    host.setAttribute("aria-label", "Scores");
    let pop = null;

    function render() {
      const { teams } = GN.store.get();
      host.innerHTML = teams.map((t, i) => `
        <button type="button" class="strip__team" data-team="${t.id}" style="--team:${GN.colourHex(t.colour)}"
          title="Award points to ${esc(t.name)} (key ${i + 1})">
          <span class="strip__name">${esc(t.name)}</span>
          <span class="strip__score" data-score="${t.score}">${t.score}</span>
        </button>`).join("");
    }

    function update(prev) {
      const { teams } = GN.store.get();
      if (!prev || prev.teams.length !== teams.length || teams.some((t, i) => prev.teams[i].id !== t.id || prev.teams[i].name !== t.name || prev.teams[i].colour !== t.colour)) {
        render();
        return;
      }
      teams.forEach((t, i) => {
        const before = prev.teams[i].score;
        if (before === t.score) return;
        const btn = host.querySelector(`[data-team="${t.id}"]`);
        const num = btn.querySelector(".strip__score");
        GN.ui.roll(num, before, t.score);
        btn.classList.remove("is-bump"); void btn.offsetWidth; btn.classList.add("is-bump");
        GN.ui.floatPoints(btn, t.score - before, GN.colourHex(t.colour));
      });
    }

    function closePop() { if (pop) { pop.remove(); pop = null; } }
    function openPop(btn) {
      closePop();
      const team = GN.store.get().teams.find((t) => t.id === btn.dataset.team);
      const round = GN.game.round();
      const main = GN.game.points(round);
      const amounts = [...new Set([main, ...GN.game.extraPoints(round), 10, 20])];
      const last = GN.store.get().log.slice(-1)[0];
      pop = document.createElement("div");
      pop.className = "pop";
      pop.style.setProperty("--team", GN.colourHex(team.colour));
      pop.innerHTML = `
        <p class="pop__name">${esc(team.name)}</p>
        <div class="pop__row">${amounts.map((a) => `<button type="button" class="pop__btn" data-add="${a}">+${a}</button>`).join("")}
          <button type="button" class="pop__btn pop__btn--minus" data-add="${-main}">−${main}</button></div>
        <form class="pop__custom"><input id="pop-custom" type="number" inputmode="numeric" step="1" placeholder="Custom" aria-label="Custom points">
          <button type="submit" class="pop__btn">Add</button></form>
        ${last ? `<button type="button" class="pop__undo" data-undo>Undo last (${last.points > 0 ? "+" : ""}${last.points}, ${esc((GN.store.get().teams.find((t) => t.id === last.team) || {}).name || "")})</button>` : ""}`;
      document.body.appendChild(pop);
      const r = btn.getBoundingClientRect();
      const pw = pop.offsetWidth, ph = pop.offsetHeight;
      pop.style.left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2)) + "px";
      // Above the team, or below it when the scores sit at the top (landscape phones).
      pop.style.top = (r.top - ph - 12 >= 8 ? r.top - ph - 12 : Math.min(innerHeight - ph - 8, r.bottom + 12)) + "px";
      pop.querySelector("[data-add]").focus();
      pop.addEventListener("click", (e) => {
        const add = e.target.closest("[data-add]");
        if (add) { GN.game.award(team.id, Number(add.dataset.add)); closePop(); }
        if (e.target.closest("[data-undo]")) { GN.game.undo(); closePop(); }
      });
      pop.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const v = Number(pop.querySelector("input").value);
        if (v) GN.game.award(team.id, v, "Custom");
        closePop();
      });
      pop.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closePop(); btn.focus(); } });
    }

    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-team]");
      if (!b) return;
      if (pop && pop.dataset.for === b.dataset.team) return closePop();
      openPop(b);
      pop.dataset.for = b.dataset.team;
    });
    const outside = (e) => { if (pop && !pop.contains(e.target) && !host.contains(e.target)) closePop(); };
    document.addEventListener("pointerdown", outside);

    render();
    return {
      update,
      isOpen: () => !!pop,
      close: closePop,
      destroy() { closePop(); document.removeEventListener("pointerdown", outside); }
    };
  };
})();
