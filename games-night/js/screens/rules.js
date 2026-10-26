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
      const SCORING = {
        music: `${r.musicBoth} for title and artist · ${r.musicOne} for one`,
        scramble: `${r.scramble} per word`,
        quiz: "",
        mini: `${r.mini} per win`,
        category: `${r.categoryAnswer} per answer · ${r.categoryBonus} bonus for the last team standing`,
        tiebreak: "Closest answer wins"
      };
      // One line per game in tonight's line-up (a game played twice is listed once).
      const rounds = GN.rounds();
      const n = rounds.filter((x) => x.number).length;
      const scoring = rounds.filter((x, i) => rounds.findIndex((y) => (y.game || y.id) === (x.game || x.id)) === i)
        .map((x) => [esc(x.game ? GN.store.get().pack.rounds.find((g) => g.id === x.game).name : x.name),
          x.kind === "quiz" ? `${GN.game.points(x)} ${x.turns ? "for each team that manages it" : "per " + GN.lineup.noun(x, 1)}` : SCORING[x.kind] || ""]);

      root.innerHTML = `
        <div class="rules">
          <div class="rules__text">
            <div class="rules__planet" aria-hidden="true"><span class="planet"></span></div>
            <p class="eyebrow">${teams.length} teams · ${n} ${n === 1 ? "round" : "rounds"}</p>
            <h2 class="display">House <em>rules</em></h2>
            <ol class="rules__list">
              ${pack.houseRules.map((x) => `<li>${esc(x)}</li>`).join("")}
            </ol>
            <h3 class="rules__sub">How to win</h3>
            <dl class="rules__score">
              ${scoring.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
            </dl>
            <p class="rules__end">Most points after ${GN.numberWord(n)} ${n === 1 ? "round" : "rounds"} takes the crown.</p>
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
