/*
 * Running order: the five rounds and the tie-breaker over a glowing box grid.
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
      const { pack, rules: r } = GN.store.get();
      const esc = GN.esc;
      root.innerHTML = `
        <div class="order__grid" aria-hidden="true"></div>
        <div class="order">
          <header class="order__head">
            <p class="eyebrow">Tonight’s running order</p>
            <h2 class="display">Five rounds. <em>One crown.</em></h2>
          </header>
          <div class="rounds" role="list">
            ${pack.rounds.map((round, i) => `
              <button type="button" class="round${round.number ? "" : " round--extra"}" role="listitem" data-round="${i}" ${i === 0 ? "data-autofocus" : ""}>
                <span class="round__no">${round.number ? "Round " + round.number : "Extra time"}</span>
                <span class="round__name">${esc(round.name)}</span>
                ${round.subtitle ? `<span class="round__sub">${esc(round.subtitle)}</span>` : ""}
                <span class="round__meta">${detail(round, r)}</span>
                <span class="round__pts">${points(round, r)}</span>
              </button>`).join("")}
          </div>
          <aside class="order__detail" data-detail aria-live="polite"></aside>
          <div class="teams__actions">
            <button class="btn btn--ghost" type="button" data-back>Back</button>
            <p class="order__note">The rounds start playing in the next update (Stage 2).</p>
          </div>
        </div>`;

      const grid = GN.fx.boxGrid(root.querySelector(".order__grid"), { cols: 11, rows: 11 });
      const detailEl = root.querySelector("[data-detail]");
      const settle = setTimeout(() => grid.play(), 800);

      function show(i) {
        const round = pack.rounds[i];
        root.querySelectorAll(".round").forEach((b) => b.classList.toggle("is-on", b.dataset.round === String(i)));
        detailEl.innerHTML = `
          <p class="order__detail-k">${round.number ? "Round " + round.number : "Extra time"} · ${points(round, r)}</p>
          <p class="order__detail-name">${esc(round.name)}${round.subtitle ? " <em>" + esc(round.subtitle) + "</em>" : ""}</p>
          <ul>${round.howTo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
      }
      root.addEventListener("focusin", (e) => {
        const b = e.target.closest(".round");
        if (b) { grid.focus(b); show(Number(b.dataset.round)); }
      });
      root.addEventListener("click", (e) => {
        const b = e.target.closest(".round");
        if (b) { grid.focus(b); show(Number(b.dataset.round)); }
      });
      root.addEventListener("pointerover", (e) => {
        const b = e.target.closest(".round");
        if (b) grid.focus(b);
      });
      root.querySelector("[data-back]").addEventListener("click", nav.back);
      show(0);
      const unsub = GN.store.subscribe(() => grid.play());
      return () => { clearTimeout(settle); unsub(); grid.destroy(); };
    }
  };
})();
