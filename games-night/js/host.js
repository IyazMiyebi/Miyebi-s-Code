/*
 * Host controls: the page opened with #host on the end. Keep it on the laptop screen
 * while the TV shows the game. It shows the answers, runs the timer and keeps score,
 * and every press updates the big screen straight away.
 */
(function () {
  const esc = GN.esc;
  const G = () => GN.game;

  function teamRows() {
    const { teams } = GN.store.get();
    const round = G().round();
    const main = G().points(round);
    const amounts = [...new Set([main, ...G().extraPoints(round), 10, 20])];
    return teams.map((t, i) => `
      <div class="hteam" style="--team:${GN.colourHex(t.colour)}" data-team="${t.id}">
        <div class="hteam__id"><span class="hteam__key">${i + 1}</span><span class="hteam__name">${esc(t.name)}</span>
          <span class="hteam__score" data-score>${t.score}</span></div>
        <div class="hteam__btns">
          ${amounts.map((a) => `<button type="button" class="hbtn hbtn--add" data-add="${a}">+${a}</button>`).join("")}
          <button type="button" class="hbtn" data-add="${-main}">−${main}</button>
          <form class="hteam__custom" data-custom><input id="custom-${t.id}" type="number" inputmode="numeric" step="1" placeholder="±" aria-label="Custom points for ${esc(t.name)}"><button class="hbtn" type="submit">Add</button></form>
        </div>
      </div>`).join("");
  }

  GN.host = {
    start() {
      document.body.classList.add("is-host");
      document.title = "Host controls · " + GN.store.get().pack.title;
      const stage = document.getElementById("stage");
      stage.innerHTML = `
        <div class="host">
          <header class="host__top">
            <div><p class="eyebrow">Host controls</p><p class="host__where" data-where></p></div>
            <p class="host__tip">Keep this window on your laptop. The TV shows the other window, and follows every button you press here.</p>
          </header>
          <div class="host__grid">
            <section class="hcard hcard--now" aria-label="Now playing">
              <div class="host__clockrow">
                <p class="host__clock"><span data-clock>–</span><small data-clock-state></small></p>
                <div class="host__ctrl">
                  <button type="button" class="hbtn hbtn--big" data-act="back">Back</button>
                  <button type="button" class="btn host__next" data-act="advance"><span data-next-label></span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
                </div>
              </div>
              <div class="host__ctrl2">
                <button type="button" class="hbtn" data-act="pause">Pause timer</button>
                <button type="button" class="hbtn" data-act="restart">Restart timer</button>
                <button type="button" class="hbtn" data-act="reveal">Reveal now</button>
                <button type="button" class="hbtn" data-act="board" aria-pressed="false">Scoreboard on TV</button>
              </div>
              <div class="host__q"><p class="host__k" data-q-k>On the TV</p><p class="host__qtext" data-q></p></div>
              <div class="host__a"><p class="host__k">Answer · only you can see this</p><p class="host__atext" data-a></p></div>
              <p class="host__nextup" data-nextup></p>
            </section>
            <section class="hcard" aria-label="Scores">
              <h2 class="hcard__h">Scores</h2>
              <div class="hteams" data-teams></div>
              <div class="host__undo" data-undo></div>
              <ol class="host__log" data-log></ol>
            </section>
            <section class="hcard" aria-label="Rounds">
              <h2 class="hcard__h">Rounds</h2>
              <div class="hrounds" data-rounds></div>
              <div class="host__reset" data-reset-wrap><button type="button" class="hbtn" data-act="reset">Reset scores to zero…</button></div>
            </section>
          </div>
        </div>`;

      const $ = (sel) => stage.querySelector(sel);
      let teamsKey = "", raf = 0;

      function render(s) {
        const sh = s.show, round = G().round(), item = G().item();
        // Where are we?
        $("[data-where]").textContent = !round
          ? `The TV is showing: ${GN.screens[s.screen] ? GN.screens[s.screen].label : "Title"}`
          : `${round.number ? "Round " + round.number : "Extra time"} · ${round.name} · ` +
            { intro: "Round intro", question: G().itemLabel(round, sh.item), reveal: G().itemLabel(round, sh.item) + " · revealed", standings: "Standings" }[sh.phase];
        $("[data-next-label]").textContent = G().nextLabel();
        $("[data-act=back]").disabled = !round;

        // What's on the TV, and the answer.
        let q = "", a = "";
        if (!round) q = "Pick a round below to start it.";
        else if (sh.phase === "intro") q = G().playable(round) ? `Round intro: ${round.name}. Press the big button to show question 1.` : `Round intro: ${round.name}. Play this round off-screen for now and score it here.`;
        else if (sh.phase === "standings") q = "Standings between rounds.";
        else {
          a = G().answerOf(round, item);
          if (round.kind === "scramble") q = "Letters on screen: " + GN.scramble(item.answer, item.scrambled).split("").join(" ");
          else if (round.kind === "music") q = `Play clip ${sh.item + 1} now (${item.title} by ${item.artist}), then start the timer.`;
          else q = item.q || "";
        }
        $("[data-q]").textContent = q;
        $("[data-a]").textContent = a || "–";
        $("[data-a]").closest(".host__a").classList.toggle("is-shown", sh.phase === "reveal");

        // Coming up next, so the host can get ready.
        let nextUp = "";
        if (round && G().playable(round)) {
          const ni = sh.phase === "intro" ? 0 : sh.item + 1;
          const n = round.items[ni];
          if (n && sh.phase !== "standings") nextUp = `Next: ${n.q ? n.q + "  →  " : ""}${G().answerOf(round, n)}`;
        }
        $("[data-nextup]").textContent = nextUp;

        $("[data-act=board]").setAttribute("aria-pressed", String(!!sh.board));
        $("[data-act=reveal]").disabled = !(round && sh.phase === "question");
        const timed = round && sh.phase === "question";
        ["pause", "restart"].forEach((a) => ($(`[data-act=${a}]`).disabled = !timed));
        $("[data-act=pause]").textContent = s.timer.running ? "Pause timer" : "Resume timer";
        $("[data-act=pause]").disabled = !timed || sh.timesUp || (!s.timer.running && s.timer.left >= s.timer.duration);

        // Scores: rebuild the rows only when the teams or round change, so typing isn't interrupted.
        const tk = JSON.stringify([s.teams.map((t) => [t.id, t.name, t.colour]), round && round.id, s.rules]);
        if (tk !== teamsKey) { teamsKey = tk; $("[data-teams]").innerHTML = teamRows(); }
        s.teams.forEach((t) => {
          const el = $(`[data-team="${t.id}"] [data-score]`);
          if (el && el.textContent !== String(t.score)) el.textContent = t.score;
        });
        const last = s.log[s.log.length - 1];
        const nameOf = (id) => (s.teams.find((t) => t.id === id) || {}).name || "a team";
        $("[data-undo]").innerHTML = last
          ? `<button type="button" class="hbtn" data-act="undo">Undo ${last.points > 0 ? "+" : ""}${last.points} for ${esc(nameOf(last.team))}</button>`
          : `<p class="host__muted">No points yet.</p>`;
        $("[data-log]").innerHTML = s.log.slice(-6).reverse().map((l) =>
          `<li><b>${l.points > 0 ? "+" : ""}${l.points}</b> ${esc(nameOf(l.team))} <span>${esc(l.label)}</span></li>`).join("");

        // Rounds.
        $("[data-rounds]").innerHTML = s.pack.rounds.map((r, i) => `
          <button type="button" class="hround${sh.round === i ? " is-on" : ""}" data-round="${i}">
            <span class="hround__no">${r.number ? "R" + r.number : "TB"}</span>
            <span class="hround__name">${esc(r.name)}</span>
            <span class="hround__tag">${sh.round === i ? "Now" : s.played.includes(r.id) ? "Played" : "Start"}</span>
          </button>`).join("");
      }

      function clock() {
        const s = GN.store.get(), round = G().round();
        const el = $("[data-clock]"), st = $("[data-clock-state]");
        if (!round || s.show.phase === "intro" || s.show.phase === "standings") {
          el.textContent = "–";
          st.textContent = !round ? "the timer appears when a question is on screen"
            : !G().playable(round) ? "no timer in this round yet"
            : s.show.phase === "intro" ? "the timer starts with question 1" : "";
        } else {
          const left = G().secondsLeft();
          el.textContent = s.show.timesUp ? "0" : Math.ceil(left - 0.001);
          st.textContent = s.show.phase === "reveal" ? "revealed" : s.show.timesUp ? "time’s up" : s.timer.running ? "seconds left" : s.timer.left < s.timer.duration ? "paused" : "ready";
          el.parentElement.classList.toggle("is-urgent", s.timer.running && left <= 5);
        }
        raf = requestAnimationFrame(clock);
      }

      stage.addEventListener("click", (e) => {
        const g = G();
        const act = e.target.closest("[data-act]");
        if (act) {
          const a = act.dataset.act;
          if (a === "advance") g.advance();
          if (a === "back") g.back();
          if (a === "pause") g.togglePause();
          if (a === "restart") g.restartTimer();
          if (a === "reveal") g.reveal();
          if (a === "board") g.toggleBoard();
          if (a === "undo") g.undo();
          if (a === "reset") {
            const wrap = $("[data-reset-wrap]");
            wrap.innerHTML = `<p>Set every team back to 0 and mark all rounds unplayed?</p>
              <button type="button" class="hbtn hbtn--danger" data-act="reset-yes">Yes, reset</button>
              <button type="button" class="hbtn" data-act="reset-no">Cancel</button>`;
          }
          if (a === "reset-yes" || a === "reset-no") {
            if (a === "reset-yes") GN.store.resetScores();
            $("[data-reset-wrap]").innerHTML = `<button type="button" class="hbtn" data-act="reset">Reset scores to zero…</button>`;
          }
          return;
        }
        const add = e.target.closest("[data-add]");
        if (add) { g.award(add.closest("[data-team]").dataset.team, Number(add.dataset.add)); return; }
        const r = e.target.closest("[data-round]");
        if (r) g.startRound(Number(r.dataset.round));
      });
      stage.addEventListener("submit", (e) => {
        const f = e.target.closest("[data-custom]");
        if (!f) return;
        e.preventDefault();
        const input = f.querySelector("input");
        const v = Number(input.value);
        if (v) G().award(f.closest("[data-team]").dataset.team, v, "Custom");
        input.value = "";
      });

      // Same keys as the big screen.
      document.addEventListener("keydown", (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey || GN.settings.isOpen()) return;
        const t = e.target;
        if (t.matches("input, textarea, select")) return;
        if ((e.key === " " || e.key === "Enter") && t.matches("button, a")) return;
        if (e.key === "s" || e.key === "S") { e.preventDefault(); GN.settings.open(); return; }
        if (e.key === "Escape") return;
        if (GN.screens.play.onKey(e)) e.preventDefault();
      });

      GN.store.subscribe(render);
      render(GN.store.get());
      clock();
    }
  };
})();
