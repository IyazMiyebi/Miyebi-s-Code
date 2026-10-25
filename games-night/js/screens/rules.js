/*
 * House rules and how to win. The text runs around a slowly turning planet
 * (the "runaround text wrap" from the reference).
 */
(function () {
  GN.screens = GN.screens || {};

  GN.screens.rules = {
    label: "House rules",
    mount(root, nav) {
      const { pack, rules: r, teams } = GN.store.get();
      const esc = GN.esc;
      const scoring = [
        ["Music", `${r.musicBoth} for title and artist · ${r.musicOne} for one`],
        ["Nauseous", `${r.scramble} per word`],
        ["Brain Games", `${r.brain} per question`],
        ["Mini Games", `${r.mini} per win`],
        ["Category Bank", `${r.categoryAnswer} per answer · ${r.categoryBonus} bonus for the last team standing`],
        ["Tie-breaker", "Closest answer wins"]
      ];

      root.innerHTML = `
        <div class="rules">
          <div class="rules__text">
            <div class="rules__planet" aria-hidden="true"><span class="planet"></span></div>
            <p class="eyebrow">${teams.length} teams · ${pack.rounds.filter((x) => x.number).length} rounds</p>
            <h2 class="display">House <em>rules</em></h2>
            <ol class="rules__list">
              ${pack.houseRules.map((x) => `<li>${esc(x)}</li>`).join("")}
            </ol>
            <h3 class="rules__sub">How to win</h3>
            <dl class="rules__score">
              ${scoring.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
            </dl>
            <p class="rules__end">Most points after five rounds takes the crown.</p>
            <div class="teams__actions">
              <button class="btn btn--ghost" type="button" data-back>Back</button>
              <button class="btn" type="button" data-next data-autofocus>See the running order
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            </div>
          </div>
        </div>`;
      root.querySelector("[data-back]").addEventListener("click", nav.back);
      root.querySelector("[data-next]").addEventListener("click", nav.next);
    }
  };
})();
