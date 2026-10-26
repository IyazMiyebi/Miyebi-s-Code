/*
 * Team setup: 2–4 teams, each with a name, colour, captain and (optionally) players.
 * The teams hang on strings at the top; grab one and throw it.
 */
(function () {
  GN.screens = GN.screens || {};

  const esc = GN.esc;
  const playerList = (t) => t.players.split(/[,\n]/).map((p) => p.trim()).filter(Boolean);

  function cardHTML(t) {
    const players = playerList(t);
    return `
      <div class="hang" data-hang="${t.id}" style="--team:${GN.colourHex(t.colour)}">
        <span class="hang__string" aria-hidden="true"></span>
        <div class="hang__card">
          <span class="hang__hole" aria-hidden="true"></span>
          <span class="hang__name">${esc(t.name || "Unnamed team")}</span>
          <span class="hang__meta">${t.captain ? "Captain " + esc(t.captain) : "No captain yet"}</span>
          <span class="hang__meta">${players.length ? players.length + (players.length === 1 ? " player" : " players") : "&nbsp;"}</span>
        </div>
      </div>`;
  }

  function formHTML(t, i, teams) {
    const swatches = GN.TEAM_COLOURS.map((c) => {
      const owner = teams.find((x) => x.colour === c.id && x.id !== t.id);
      return `<label class="swatch" style="--sw:${c.hex}" title="${c.name}${owner ? " (swaps with " + esc(owner.name) + ")" : ""}">
        <input type="radio" name="colour-${t.id}" value="${c.id}" ${t.colour === c.id ? "checked" : ""} data-field="colour">
        <span class="sr">${c.name}</span></label>`;
    }).join("");
    return `
      <fieldset class="team-form" data-team="${t.id}" style="--team:${GN.colourHex(t.colour)}">
        <legend class="sr">Team ${i + 1}</legend>
        <p class="team-form__legend" aria-hidden="true">Team ${i + 1}</p>
        <label class="field"><span class="field__label">Team name</span>
          <input id="name-${t.id}" class="field__input field__input--big" value="${esc(t.name)}" maxlength="24" data-field="name" autocomplete="off"></label>
        <div class="field"><span class="field__label" id="colour-label-${t.id}">Colour</span>
          <div class="swatches" role="radiogroup" aria-labelledby="colour-label-${t.id}">${swatches}</div></div>
        <label class="field"><span class="field__label">Captain</span>
          <input id="captain-${t.id}" class="field__input" value="${esc(t.captain)}" maxlength="24" placeholder="Who speaks for the team?" data-field="captain" autocomplete="off"></label>
        <label class="field"><span class="field__label">Players <em>(optional)</em></span>
          <input id="players-${t.id}" class="field__input" value="${esc(t.players)}" placeholder="Names, separated by commas" data-field="players" autocomplete="off"></label>
      </fieldset>`;
  }

  GN.screens.teams = {
    label: "Teams",
    mount(root, nav) {
      root.innerHTML = `
        <div class="teams">
          <div class="teams__line" aria-hidden="true"></div>
          <div class="teams__hangers" data-hangers></div>
          <div class="teams__body">
            <header class="teams__head">
              <p class="eyebrow">Game night · step 2</p>
              <h2 class="display">Let’s get in <em>teams</em></h2>
              <p class="teams__summary" data-summary></p>
            </header>
            <div class="count" role="radiogroup" aria-label="Number of teams">
              <span class="count__label">Teams</span>
              ${[2, 3, 4].map((n) => `<label class="count__opt"><input type="radio" name="team-count" value="${n}"><span>${n}</span></label>`).join("")}
            </div>
            <div class="team-forms" data-forms></div>
            <div class="teams__actions">
              <button class="btn btn--ghost" type="button" data-back>Back</button>
              <button class="btn" type="button" data-next>Pick the games
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            </div>
          </div>
        </div>`;

      const hangersEl = root.querySelector("[data-hangers]");
      const formsEl = root.querySelector("[data-forms]");
      const summaryEl = root.querySelector("[data-summary]");
      let hangers = {};

      function renderHangers(swing) {
        Object.values(hangers).forEach((h) => h.destroy());
        hangers = {};
        const teams = GN.store.get().teams;
        hangersEl.innerHTML = teams.map(cardHTML).join("");
        hangersEl.querySelectorAll("[data-hang]").forEach((el, i) => {
          hangers[el.dataset.hang] = GN.fx.hang(el, { startAngle: swing ? (i % 2 ? 0.35 : -0.3) : 0, length: 1.2 + i * 0.15 });
        });
      }
      // Update a card's words in place so it keeps swinging while you type.
      function refreshCard(t) {
        const el = hangersEl.querySelector(`[data-hang="${t.id}"]`);
        if (!el) return;
        const tmp = document.createElement("div");
        tmp.innerHTML = cardHTML(t);
        el.querySelector(".hang__card").innerHTML = tmp.querySelector(".hang__card").innerHTML;
        el.style.setProperty("--team", GN.colourHex(t.colour));
      }
      function renderForms() {
        const teams = GN.store.get().teams;
        formsEl.innerHTML = teams.map((t, i) => formHTML(t, i, teams)).join("");
        root.querySelectorAll('input[name="team-count"]').forEach((r) => { r.checked = Number(r.value) === teams.length; });
        renderSummary();
      }
      function renderSummary() {
        const teams = GN.store.get().teams;
        const counts = teams.map((t) => playerList(t).length);
        const total = counts.reduce((a, b) => a + b, 0);
        const even = counts.every((c) => c === counts[0]);
        summaryEl.textContent = total
          ? `${total} players · ${teams.length} teams` + (even ? ` of ${counts[0]}` : "")
          : `${teams.length} teams · works best with 4–10 players`;
      }

      root.addEventListener("change", (e) => {
        const t = e.target;
        if (t.name === "team-count") {
          GN.store.setTeamCount(Number(t.value));
          renderForms();
          renderHangers(true);
          return;
        }
        if (t.dataset.field === "colour") {
          const id = t.closest("[data-team]").dataset.team;
          const teams = GN.store.get().teams;
          const me = teams.find((x) => x.id === id);
          const other = teams.find((x) => x.colour === t.value && x.id !== id);
          // A name still at its default ("Team Ember") follows its colour.
          const nameFor = (team, colour) => {
            const word = (c) => "Team " + GN.TEAM_COLOURS.find((x) => x.id === c).name.split(" ")[0];
            return team.name === word(team.colour) ? word(colour) : team.name;
          };
          if (other) GN.store.updateTeam(other.id, { colour: me.colour, name: nameFor(other, me.colour) }); // swap colours
          GN.store.updateTeam(id, { colour: t.value, name: nameFor(me, t.value) });
          renderForms();
          GN.store.get().teams.forEach(refreshCard);
          hangers[id] && hangers[id].nudge(1.6);
          if (other && hangers[other.id]) hangers[other.id].nudge(1.6);
        }
      });
      root.addEventListener("input", (e) => {
        const t = e.target;
        const f = t.dataset.field;
        if (!f || f === "colour") return;
        const id = t.closest("[data-team]").dataset.team;
        GN.store.updateTeam(id, { [f]: t.value });
        const team = GN.store.get().teams.find((x) => x.id === id);
        refreshCard(team);
        renderSummary();
        if (f === "name" && hangers[id]) hangers[id].nudge(0.35);
      });
      // Tidy blank names when leaving the box.
      root.addEventListener("focusout", (e) => {
        const t = e.target;
        if (t.dataset.field === "name" && !t.value.trim()) {
          const id = t.closest("[data-team]").dataset.team;
          const i = GN.store.get().teams.findIndex((x) => x.id === id);
          t.value = "Team " + (i + 1);
          GN.store.updateTeam(id, { name: t.value });
          refreshCard(GN.store.get().teams[i]);
        }
      });
      root.querySelector("[data-back]").addEventListener("click", nav.back);
      root.querySelector("[data-next]").addEventListener("click", nav.next);

      renderForms();
      renderHangers(true);
      return () => Object.values(hangers).forEach((h) => h.destroy());
    }
  };
})();
