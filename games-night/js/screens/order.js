/*
 * Running order: tonight's rounds and the tie-breaker over a glowing box grid.
 * Picking a round shows its rules (never its answers: this is the big screen).
 */
(function () {
  GN.screens = GN.screens || {};

  function detail(round, r) {
    switch (round.kind) {
      case "music": return `${round.items.length} clips · ${r.musicSeconds}s to answer`;
      case "scramble": return `${round.items.length} words · ${r.scrambleSeconds}s each`;
      case "quiz": return `${round.items.length} questions · ${r.brainSeconds}s each`;
      case "mini": return `${round.items.length} challenges`;
      case "category": return `${round.items.length} categories · ${r.categoryTurnSeconds}s turns`;
      default: return "Only if the scores are level";
    }
  }
  function points(round, r) {
    switch (round.kind) {
      case "music": return `${r.musicBoth} pts · ${r.musicOne} for one half`;
      case "scramble": return `${r.scramble} pts a word`;
      case "quiz": return `${r.brain} pts a question`;
      case "mini": return `${r.mini} pts a win`;
      case "category": return `${r.categoryAnswer} pts an answer · ${r.categoryBonus} bonus`;
      default: return "Closest wins";
    }
  }

  GN.screens.order = {
    label: "Running order",
    mount(root, nav) {
      const { rules: r, played } = GN.store.get();
      const rounds = GN.rounds();
      const n = rounds.filter((x) => x.number).length;
      const word = GN.numberWord(n);
      const first = GN.game.firstUnplayed();
      const esc = GN.esc;
      root.innerHTML = `
        <div class="order__grid" aria-hidden="true"></div>
        <div class="order">
          <header class="order__head">
            <p class="eyebrow">Tonight’s running order</p>
            <h2 class="display">${word[0].toUpperCase() + word.slice(1)} ${n === 1 ? "round" : "rounds"}. <em>One crown.</em></h2>
          </header>
          <div class="rounds">
            ${rounds.map((round, i) => `
              <button type="button" class="round${round.number ? "" : " round--extra"}${played.includes(round.id) ? " is-played" : ""}" data-round="${i}" ${i === first ? "data-autofocus" : ""}>
                <span class="round__no">${round.number ? "Round " + round.number : "Extra time"}${played.includes(round.id) ? ' <span class="round__done">· played</span>' : ""}</span>
                <span class="round__name">${esc(round.name)}</span>
                ${round.subtitle ? `<span class="round__sub">${esc(round.subtitle)}</span>` : ""}
                <span class="round__meta">${detail(round, r)}</span>
                <span class="round__pts">${points(round, r)}</span>
              </button>`).join("")}
          </div>
          <div class="order__detail" data-detail aria-live="polite"></div>
          <div class="teams__actions">
            <button class="btn btn--ghost" type="button" data-back>Back</button>
            <button class="btn" type="button" data-play="${first}">Start ${rounds[first].number ? "Round " + rounds[first].number : esc(rounds[first].name)}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            ${played.length ? `<button class="btn btn--ghost" type="button" data-finale>Reveal the winner</button>` : ""}
            <p class="order__note"><kbd>H</kbd> opens the host controls in a second window, with the answers.</p>
          </div>
        </div>`;

      const grid = GN.fx.boxGrid(root.querySelector(".order__grid"), { cols: 9, rows: 9 });
      const detailEl = root.querySelector("[data-detail]");
      const settle = setTimeout(() => grid.play(), 800);

      function show(i) {
        const round = rounds[i];
        root.querySelectorAll(".round").forEach((b) => b.classList.toggle("is-on", b.dataset.round === String(i)));
        detailEl.innerHTML = `
          <p class="order__detail-k">${round.number ? "Round " + round.number : "Extra time"} · ${points(round, r)}</p>
          <p class="order__detail-name">${esc(round.name)}${round.subtitle ? " <em>" + esc(round.subtitle) + "</em>" : ""}</p>
          <ul>${round.howTo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <button class="btn btn--small" type="button" data-play="${i}">${played.includes(round.id) ? "Play it again" : "Play this round"}</button>`;
      }
      root.addEventListener("focusin", (e) => {
        const b = e.target.closest(".round");
        if (b) { grid.focus(b); show(Number(b.dataset.round)); }
      });
      root.addEventListener("click", (e) => {
        if (e.target.closest("[data-finale]")) { GN.game.finale(); return; }
        const p = e.target.closest("[data-play]");
        if (p) { GN.game.startRound(Number(p.dataset.play)); return; }
        const b = e.target.closest(".round");
        if (b) { grid.focus(b); show(Number(b.dataset.round)); }
      });
      root.addEventListener("pointerover", (e) => {
        const b = e.target.closest(".round");
        if (b) grid.focus(b);
      });
      root.querySelector("[data-back]").addEventListener("click", nav.back);
      show(first);
      const unsub = GN.store.subscribe(() => grid.play());
      return () => { clearTimeout(settle); unsub(); grid.destroy(); };
    }
  };
})();
