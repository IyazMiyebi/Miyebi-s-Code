/*
 * What the big screen shows for the Category Bank (whose turn, the turn timer, who's out)
 * and for the tie-breaker's ranked guesses. Used by js/screens/play.js.
 */
(function () {
  const esc = GN.esc;
  const G = () => GN.game, C = () => GN.category;
  const RING = 2 * Math.PI * 54;

  function question(round, i, name) {
    const r = GN.store.get().rules;
    return `
      <div class="cat">
        <header class="q__head">
          <p class="eyebrow">${esc(G().itemLabel(round, i))}</p>
          <p class="q__round">${esc(round.name)}</p>
        </header>
        <h2 class="cat__name" data-decode="${esc(name)}">${esc(name)}</h2>
        <p class="cat__rule">${r.categoryTurnSeconds} seconds a turn · no repeats · ${r.categoryAnswer} points an answer · last team standing +${r.categoryBonus}</p>
        <div class="cat__now">
          <div class="cat__turn" data-turn><span class="cat__tk" data-turn-k></span><span class="cat__tn" data-turn-name></span></div>
          <div class="timer" data-timer>
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="timer__track" cx="60" cy="60" r="54"/><circle class="timer__ring" cx="60" cy="60" r="54" style="stroke-dasharray:${RING}"/></svg>
            <span class="timer__num" data-num></span>
            <span class="timer__state" data-state></span>
          </div>
        </div>
        <div class="cat__teams">${C().order().map((t) => `
          <div class="ct" data-ct="${t.id}" style="--team:${GN.colourHex(t.colour)}">
            <span class="ct__name">${esc(t.name)}</span><span class="ct__n" data-ct-n></span>
          </div>`).join("")}</div>
      </div>`;
  }

  function result(round, i, name) {
    const s = GN.store.get(), c = C().state();
    const w = c.winner && C().team(c.winner);
    const rows = [...s.teams].sort((a, b) => (c.answers[b.id] || 0) - (c.answers[a.id] || 0));
    return `
      <div class="mg mg--result">
        <header class="q__head">
          <p class="eyebrow">${esc(G().itemLabel(round, i))} · result</p>
          <p class="q__round">${esc(round.name)}</p>
        </header>
        <h2 class="mg__name">${esc(name)}</h2>
        ${w ? `<p class="mg__winner" style="--team:${GN.colourHex(w.colour)}"><span class="mg__wk">Last team standing</span>
          <span class="mg__wn">${esc(w.name)}</span><span class="mg__wp">+${s.rules.categoryBonus} bonus</span></p>`
          : `<p class="mg__ask">No last team standing this time.</p>`}
        <ol class="mg__results">${rows.map((t) => {
          const n = c.answers[t.id] || 0;
          return `<li style="--team:${GN.colourHex(t.colour)}"><span>${esc(t.name)}</span><b>${n} ${n === 1 ? "answer" : "answers"} · +${n * s.rules.categoryAnswer}</b></li>`;
        }).join("")}</ol>
      </div>`;
  }

  GN.categoryView = {
    html(round, i, item, reveal) {
      const name = typeof item === "string" ? item : item.name;
      return reveal ? result(round, i, name) : question(round, i, name);
    },

    // Whose turn, who's out, how many answers. Returns what just happened ("out", "win").
    update(view, s, prev) {
      if (!view || !view.querySelector(".cat")) return null;
      const c = C().state();
      const banner = view.querySelector("[data-turn]");
      const team = (id) => C().team(id);
      let k = "", nm = "", colour = "var(--paper)", cls = "";
      if (c.winner) { k = "Last team standing"; nm = team(c.winner).name; colour = GN.colourHex(team(c.winner).colour); cls = "is-win"; }
      else if (c.turn) { k = "Your turn"; nm = team(c.turn).name; colour = GN.colourHex(team(c.turn).colour); cls = "is-turn"; }
      else if (!c.started) { const f = C().alive()[0]; k = "Starts"; nm = f ? f.name : ""; colour = f ? GN.colourHex(f.colour) : colour; }
      else { k = "Category over"; nm = ""; }
      const changed = banner.dataset.who !== (c.turn || c.winner || "");
      banner.dataset.who = c.turn || c.winner || "";
      banner.querySelector("[data-turn-k]").textContent = k;
      banner.querySelector("[data-turn-name]").textContent = nm;
      banner.style.setProperty("--team", colour);
      banner.className = "cat__turn " + cls;
      if (changed && GN.motionOK()) { banner.classList.remove("is-new"); void banner.offsetWidth; banner.classList.add("is-new"); }
      const timer = view.querySelector("[data-timer]");
      if (timer) timer.hidden = !!c.winner;

      view.querySelectorAll("[data-ct]").forEach((el) => {
        const id = el.dataset.ct, n = c.answers[id] || 0;
        el.querySelector("[data-ct-n]").textContent = c.out[id] ? `out · ${n}` : `${n} ${n === 1 ? "answer" : "answers"}`;
        el.className = "ct" + (c.out[id] ? " is-out" : "") + (c.turn === id ? " is-turn" : "") + (c.winner === id ? " is-win" : "");
      });

      const pc = prev && prev.show.cat;
      if (!pc || prev.show.item !== s.show.item || prev.show.round !== s.show.round) return null;
      if (c.winner && !pc.winner) return "win";
      if (Object.keys(c.out).length > Object.keys(pc.out).length) return "out";
      return null;
    },

    // Tie-breaker reveal: everyone's guess, closest first.
    tiebreak(view) {
      const box = view && view.querySelector("[data-answer]");
      if (!box) return;
      let list = box.querySelector("[data-tb]");
      if (!list) { list = document.createElement("ol"); list.className = "mg__results tb"; list.dataset.tb = ""; box.appendChild(list); }
      const ranked = GN.tiebreak.ranked(), w = GN.tiebreak.state().winner;
      list.hidden = !ranked.length;
      list.innerHTML = ranked.map((r, j) => `
        <li class="${r.team.id === w ? "is-win" : ""}" style="--team:${GN.colourHex(r.team.colour)}" data-pick="${r.team.id}" title="Give ${esc(r.team.name)} the tie-break">
          <span>${esc(r.team.name)}</span><b>${r.guess.toLocaleString("en-GB")} · ${r.diff === 0 ? "spot on!" : "off by " + r.diff.toLocaleString("en-GB")}${r.team.id === w ? " · wins the tie-break" : j === 0 && !w ? " · closest" : ""}</b>
        </li>`).join("");
    }
  };
})();
