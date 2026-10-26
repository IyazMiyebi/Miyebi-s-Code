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
            <div><p class="eyebrow">Host controls</p><h1 class="host__where" data-where></h1></div>
            <p class="host__tip">Keep this window on your laptop. The TV shows the other window, and follows every button you press here.
              <button type="button" class="hbtn host__edit" data-act="edit">Edit questions</button>
              <a class="hbtn host__edit" href="cheatsheet.html" target="_blank" rel="noopener">Cheat sheet</a></p>
            <p class="host__warn" data-tv-sound hidden>The TV window can’t make sound yet (ticks, buzzer, applause). Click it once: it shows a “Click to turn on sound” button. Music clips play from this window, so they’re fine.</p>
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
                <button type="button" class="hbtn" data-act="shuffle" hidden>Shuffle letters</button>
                <button type="button" class="hbtn" data-act="board" aria-pressed="false">Scoreboard on TV</button>
              </div>
              <div class="hclip" data-clip hidden></div>
              <div class="hmini" data-mini hidden></div>
              <div class="hmini" data-cat hidden></div>
              <div class="hmini" data-tb hidden></div>
              <div class="hmini" data-fin hidden></div>
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
            <section class="hcard" aria-label="Phone remote" data-remote-card>
              <h2 class="hcard__h">Phone remote</h2>
              <div data-remote-panel></div>
            </section>
            <section class="hcard hcard--clips" aria-label="Music clips">
              <h2 class="hcard__h">Music clips</h2>
              <p class="host__muted" data-clips-sum></p>
              <button type="button" class="hbtn" data-act="clips-ready">Get clips ready</button>
              <ol class="hclips" data-clips></ol>
            </section>
          </div>
        </div>`;

      const $ = (sel) => stage.querySelector(sel);
      // On the phone itself, this box just says it's connected.
      if (GN.role === "remote") {
        $("[data-remote-card]").innerHTML = `<h2 class="hcard__h">Phone remote</h2><p class="host__muted">This phone controls the show on the TV. Keep the TV window open on the laptop.</p>`;
        stage.querySelector(".host__tip").textContent = "This phone is the remote. Every button here runs on the TV straight away. (Edit questions on the laptop.)";
        $("[data-tv-sound]").textContent = "The TV window can’t make sound yet. Click it once on the laptop (it shows a “Click to turn on sound” button), or the music clips, ticks and buzzer stay silent.";
      } else GN.remote.panel($("[data-remote-panel]"));
      let clipKey = "", clipsKey = "";

      // The current song: which version plays, where it starts, play / stop.
      function renderClip(s) {
        const box = $("[data-clip]");
        const round = G().round();
        const on = round && round.kind === "music" && ["question", "reveal"].includes(s.show.phase);
        box.hidden = !on;
        if (!on) { clipKey = ""; return; }
        const i = s.show.item, e = GN.music.entry(round, i) || {}, opt = GN.music.option(round, i);
        const k = JSON.stringify([i, e.status, e.options && e.options.map((o) => o.url), e.choice, e.ready]);
        if (k !== clipKey) {
          clipKey = k;
          box.innerHTML = `
            <p class="hclip__info" data-clip-info></p>
            <div class="hclip__row">
              <button type="button" class="hbtn hbtn--big" data-act="clip-play">Play clip</button>
              <button type="button" class="hbtn" data-act="clip-stop">Stop</button>
              ${opt ? `<label class="hclip__field">Version
                <select id="clip-choice" data-clip-choice>${e.options.map((o, j) => `<option value="${j}" ${j === (e.choice || 0) ? "selected" : ""}>${esc(o.track)} · ${esc(o.artist)}</option>`).join("")}</select></label>
              <label class="hclip__field">Start at <input id="clip-start" type="number" min="0" max="25" step="1" value="${e.start || 0}" data-clip-start> s</label>` : ""}
            </div>`;
        }
        const status = !opt ? (e.status === "searching" ? "Looking for this song…" : "No clip found for this song. Play it from your phone, or search again under Music clips.")
          : s.show.clip.error === "blocked" ? "The browser blocked the sound. Click once anywhere in the window you pressed Play in, then press Play again."
          : s.show.clip.error ? "The clip wouldn't play. Check the internet (or press Get clips ready), or play the song from your phone."
          : `${s.show.clip.pending ? "Starting the clip… " : s.show.clip.playing ? "▶ Playing: " : ""}${opt.track} · ${opt.artist}${e.ready ? " · saved for offline" : " · plays from the internet"}`;
        $("[data-clip-info]").textContent = status;
        $("[data-act=clip-play]").textContent = s.show.clip.played ? "Play again" : "Play clip";
        $("[data-act=clip-play]").disabled = !opt;
        $("[data-act=clip-stop]").disabled = !(s.show.clip.playing || s.show.clip.pending);
        $("[data-clip-info]").classList.toggle("is-warn", !!s.show.clip.error);
      }

      // Mini games: the race clock, a button per team, charades prompts and the winner.
      let miniKey = "";
      function renderMini(s) {
        const box = $("[data-mini]");
        const round = G().round(), item = G().item();
        const on = round && round.kind === "mini" && ["question", "reveal"].includes(s.show.phase);
        box.hidden = !on;
        if (!on) { miniKey = ""; return; }
        const m = GN.mini.state(), mode = item.mode || "stopwatch", fmt = GN.mini.fmt;
        const k = JSON.stringify([s.show.item, s.show.phase, m, s.teams.map((t) => [t.id, t.name, t.colour])]);
        if (k === miniKey) return;
        miniKey = k;
        const sug = GN.mini.suggestion();
        const clockBtns = mode === "memory" ? "" : `
          <div class="hclip__row">
            <button type="button" class="hbtn hbtn--big" data-act="mini-clock">${GN.mini.running() ? "Pause the clock" : GN.mini.turns() && !m.turn ? (GN.mini.upNext() ? `Start ${esc(GN.mini.upNext().name)}’s turn` : "Everyone has played") : GN.mini.elapsed() ? "Resume the clock" : "Start the clock"}</button>
            <button type="button" class="hbtn" data-act="mini-reset" ${GN.mini.elapsed() ? "" : "disabled"}>Reset clock and times</button>
          </div>`;
        const teamRows = mode === "memory" || s.show.phase === "reveal" ? "" : `<div class="hmini__teams">${s.teams.map((t, i) => {
          const done = mode === "stopwatch" ? m.times[t.id] : m.out[t.id];
          return `<div class="hmini__team" style="--team:${GN.colourHex(t.colour)}">
            <span class="hteam__key">${i + 1}</span><span class="hmini__name">${esc(t.name)}</span>
            <span class="hmini__val">${done != null ? (mode === "stopwatch" ? "finished " : "out at ") + fmt(done) : ""}</span>
            ${done != null ? `<button type="button" class="hbtn" data-act="mini-unmark" data-team="${t.id}">Undo</button>`
              : `<button type="button" class="hbtn hbtn--add" data-act="mini-mark" data-team="${t.id}" ${GN.mini.running() && (!GN.mini.turns() || m.turn === t.id) ? "" : "disabled"}>${mode === "stopwatch" ? "Finished" : "Out"}</button>`}
          </div>`;
        }).join("")}</div>`;
        const prompts = item.prompts || [];
        const charades = prompts.length ? `
          <div class="hmini__prompts"><p class="host__k">Charades prompts · show only the actor</p>
            <ol>${prompts.map((p, i) => `<li class="${i < m.guessed ? "is-done" : i === m.guessed ? "is-next" : ""}">${esc(p)}</li>`).join("")}</ol>
            <div class="hclip__row">
              <button type="button" class="hbtn hbtn--big" data-act="mini-guess" ${m.guessed >= prompts.length ? "disabled" : ""}>Guessed! (${m.guessed}/${prompts.length})</button>
              <button type="button" class="hbtn" data-act="mini-unguess" ${m.guessed ? "" : "disabled"}>Undo</button>
              <button type="button" class="hbtn" data-act="mini-reguess" ${m.guessed ? "" : "disabled"}>Reset for the next team</button>
            </div></div>` : "";
        const winner = `
          <div class="hmini__win"><p class="host__k">Winner · +${s.rules.mini} points${sug && !m.winner ? ` · suggested: ${esc((s.teams.find((t) => t.id === sug) || {}).name)}` : ""}</p>
            <div class="hclip__row">${s.teams.map((t) => `<button type="button" class="hbtn ${m.winner === t.id ? "is-on" : ""}" style="--team:${GN.colourHex(t.colour)}" data-act="mini-win" data-team="${t.id}" aria-pressed="${m.winner === t.id}">${esc(t.name)}</button>`).join("")}
              ${m.winner ? `<button type="button" class="hbtn" data-act="mini-win" data-team="">No winner</button>` : ""}</div></div>`;
        box.innerHTML = clockBtns + teamRows + charades + winner;
      }

      // Category bank: valid / out, and each team's state.
      let catKey = "";
      function renderCat(s) {
        const box = $("[data-cat]"), round = G().round();
        const on = round && round.kind === "category" && s.show.phase === "question";
        box.hidden = !on;
        if (!on) { catKey = ""; return; }
        const c = GN.category.state(), r = s.rules;
        const k = JSON.stringify([s.show.item, c, s.teams.map((t) => [t.id, t.name, t.colour])]);
        if (k === catKey) return;
        catKey = k;
        const name = (id) => esc((GN.category.team(id) || {}).name || "");
        const live = c.started && !c.winner && c.turn;
        box.innerHTML = `
          <p class="host__k">${c.winner ? `Last team standing: ${name(c.winner)} (+${r.categoryBonus} given)` : live ? `${name(c.turn)}’s turn` : c.started ? "Category over" : "Press Start: the first team’s turn begins"}</p>
          <div class="hclip__row">
            <button type="button" class="hbtn hbtn--big hbtn--ok" data-act="cat-valid" ${live ? "" : "disabled"}>✓ Valid answer (+${r.categoryAnswer})</button>
            <button type="button" class="hbtn hbtn--big hbtn--danger" data-act="cat-out" ${live ? "" : "disabled"}>✗ Out: repeat, wrong or too slow</button>
            <button type="button" class="hbtn" data-act="cat-skip" ${live ? "" : "disabled"}>Skip to next team</button>
          </div>
          <div class="hmini__teams">${GN.category.order().map((t) => {
            const n = c.answers[t.id] || 0;
            return `<div class="hmini__team" style="--team:${GN.colourHex(t.colour)}">
              <span class="hmini__name">${esc(t.name)}${c.turn === t.id ? " ◀ turn" : ""}</span>
              <span class="hmini__val">${n} ${n === 1 ? "answer" : "answers"}${c.out[t.id] ? " · out" : ""}</span>
              ${c.out[t.id] ? `<button type="button" class="hbtn" data-act="cat-back" data-team="${t.id}">Bring back</button>` : ""}
            </div>`;
          }).join("")}</div>
          <p class="host__muted">The timer runs out on the TV: that team is out automatically.</p>`;
      }

      // Tie-breaker: type each team's guess; give the tie-break on the reveal.
      let tbKey = "";
      function renderTb(s) {
        const box = $("[data-tb]"), round = G().round();
        const on = round && round.kind === "tiebreak" && ["question", "reveal"].includes(s.show.phase);
        box.hidden = !on;
        if (!on) { tbKey = ""; return; }
        const tb = GN.tiebreak.state(), sug = GN.tiebreak.suggestion();
        const k = JSON.stringify([s.show.item, s.show.phase, tb.winner, sug, s.teams.map((t) => [t.id, t.name, t.colour])]);
        if (k !== tbKey) {
          tbKey = k;
          box.innerHTML = `
            <p class="host__k">Each team’s guess</p>
            <div class="hmini__teams">${s.teams.map((t) => `
              <label class="hmini__team" style="--team:${GN.colourHex(t.colour)}"><span class="hmini__name">${esc(t.name)}</span>
                <input id="tb-${t.id}" class="hmini__input" inputmode="numeric" data-tb-guess="${t.id}" value="${tb.guesses[t.id] != null ? tb.guesses[t.id] : ""}" placeholder="guess"></label>`).join("")}</div>
            ${s.show.phase === "reveal" ? `<div class="hmini__win"><p class="host__k">Give the tie-break (+${GN.tiebreak.POINTS} point)${sug && !tb.winner ? ` · closest: ${esc((s.teams.find((t) => t.id === sug) || {}).name)}` : ""}</p>
              <div class="hclip__row">${s.teams.map((t) => `<button type="button" class="hbtn ${tb.winner === t.id ? "is-on" : ""}" style="--team:${GN.colourHex(t.colour)}" data-act="tb-win" data-team="${t.id}">${esc(t.name)}</button>`).join("")}</div></div>`
              : `<p class="host__muted">The guesses appear on the TV when you reveal the answer.</p>`}`;
        }
      }

      // Finale controls.
      function renderFin(s) {
        const box = $("[data-fin]");
        box.hidden = s.screen !== "finale";
        if (box.hidden || box.dataset.done) return;
        box.dataset.done = "1";
        box.innerHTML = `<p class="host__k">Finale</p><div class="hclip__row">
          <button type="button" class="hbtn hbtn--big" data-act="fin-replay">Replay the reveal</button>
          <button type="button" class="hbtn" data-act="fin-again">Play again with these teams</button></div>`;
      }

      // Every song in the round: found, saved, or missing (with a search box).
      function renderClips(s) {
        const round = GN.music.musicRound();
        const card = $(".hcard--clips");
        card.hidden = !round;
        if (!round) return;
        const sum = GN.music.summary();
        $("[data-clips-sum]").textContent = !sum.found && !Object.keys(s.music).length
          ? "Official 30-second previews, found automatically. Press the button before the night so they're saved for offline."
          : `${sum.ready} of ${sum.total} saved for offline · ${sum.found} found${sum.missing.length ? ` · ${sum.missing.length} not found` : ""}`;
        const k = JSON.stringify(round.items.map((_, i) => { const e = GN.music.entry(round, i) || {}; return [e.status, e.ready, e.choice, e.options && e.options.length]; }));
        if (k === clipsKey) return;
        clipsKey = k;
        $("[data-clips]").innerHTML = round.items.map((it, i) => {
          const e = GN.music.entry(round, i) || {};
          const found = e.options && e.options.length;
          const tag = e.status === "searching" ? "searching…" : e.ready ? "saved" : found ? "found" : e.status === "offline" ? "offline" : e.status ? "not found" : "";
          return `<li class="hclips__row${found ? "" : e.status && e.status !== "searching" ? " is-missing" : ""}">
            <span class="hclips__name">${i + 1}. ${esc(it.title)}</span><span class="hclips__tag">${tag}</span>
            ${found || !e.status || e.status === "searching" ? "" : `<form class="hclips__search" data-search="${i}">
              <input id="search-${i}" value="${esc(e.term || it.title + " " + it.artist)}" aria-label="Search for ${esc(it.title)}">
              <button class="hbtn" type="submit">Search</button></form>`}
          </li>`;
        }).join("");
      }
      let teamsKey = "", raf = 0;

      function render(s) {
        $("[data-tv-sound]").hidden = !(s.tvSound === false && s.settings.sound);
        renderClip(s);
        renderMini(s);
        renderCat(s);
        renderTb(s);
        renderFin(s);
        if (s.screen !== "finale") delete $("[data-fin]").dataset.done;
        renderClips(s);
        const sh = s.show, round = G().round(), item = G().item();
        // Where are we?
        $("[data-where]").textContent = !round
          ? `The TV is showing: ${GN.screens[s.screen] ? GN.screens[s.screen].label : "Title"}`
          : `${round.number ? "Round " + round.number : "Extra time"} · ${round.name} · ` +
            { intro: "Round intro", question: G().itemLabel(round, sh.item), reveal: G().itemLabel(round, sh.item) + " · revealed", standings: "Standings" }[sh.phase];
        $("[data-next-label]").textContent = G().nextLabel();
        $("[data-act=back]").disabled = !round;
        if (s.screen === "finale") $("[data-where]").textContent = "Finale: the winner is on the TV";

        // What's on the TV, and the answer.
        let q = "", a = "";
        if (!round) q = "Pick a round below to start it.";
        else if (sh.phase === "intro") q = G().playable(round) ? `Round intro: ${round.name}. Press the big button to show question 1.` : `Round intro: ${round.name}. Play this round off-screen for now and score it here.`;
        else if (sh.phase === "standings") q = "Standings between rounds.";
        else {
          a = G().answerOf(round, item);
          if (round.kind === "scramble") q = "Letters on screen: " + G().letters(round, item).split("").join(" ");
          else if (round.kind === "music") q = G().hasClip()
            ? `Music clip ${sh.item + 1}. Press “Play clip”: it plays on the TV, then the timer starts by itself.`
            : `Music clip ${sh.item + 1}. No clip found: play it from your phone, then start the timer.`;
          else if (round.kind === "mini") { q = `${item.name}: ${item.text}`; a = item.note || ""; }
          else if (round.kind === "category") { q = `Category: ${typeof item === "string" ? item : item.name}`; a = ""; }
          else q = item.q || "";
        }
        $("[data-q]").textContent = q;
        $("[data-a]").textContent = a || "–";
        $("[data-a]").closest(".host__a").hidden = !!(round && (round.kind === "mini" || round.kind === "category") && !a);
        $("[data-a]").closest(".host__a").classList.toggle("is-shown", sh.phase === "reveal");

        // Coming up next, so the host can get ready.
        let nextUp = "";
        if (round && G().playable(round)) {
          const ni = sh.phase === "intro" ? 0 : sh.item + 1;
          const n = round.items[ni];
          if (n && sh.phase !== "standings") nextUp = round.kind === "mini" ? `Next: ${n.name}` : `Next: ${n.q ? n.q + "  →  " : ""}${G().answerOf(round, n)}`;
        }
        $("[data-nextup]").textContent = nextUp;

        $("[data-act=board]").setAttribute("aria-pressed", String(!!sh.board));
        $("[data-act=reveal]").disabled = !(round && sh.phase === "question");
        $("[data-act=shuffle]").hidden = !(round && round.kind === "scramble");
        $("[data-act=shuffle]").disabled = !(round && round.kind === "scramble" && sh.phase === "question");
        // The race clock in mini games has its own buttons; the countdown ones don't apply.
        const timed = round && sh.phase === "question" && !(round.kind === "mini" && item && item.mode !== "memory");
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
        $("[data-rounds]").innerHTML = GN.rounds().map((r, i) => `
          <button type="button" class="hround${sh.round === i ? " is-on" : ""}" data-round="${i}">
            <span class="hround__no">${r.number ? "R" + r.number : "TB"}</span>
            <span class="hround__name">${esc(r.name)}</span>
            <span class="hround__tag">${sh.round === i ? "Now" : s.played.includes(r.id) ? "Played" : "Start"}</span>
          </button>`).join("") + `
          <button type="button" class="hround${s.screen === "finale" ? " is-on" : ""}" data-act="finale">
            <span class="hround__no">★</span><span class="hround__name">Finale: reveal the winner</span>
            <span class="hround__tag">${s.screen === "finale" ? "Now" : "Show"}</span>
          </button>`;
      }

      function clock() {
        const s = GN.store.get(), round = G().round();
        const el = $("[data-clock]"), st = $("[data-clock-state]");
        if (!round || s.show.phase === "intro" || s.show.phase === "standings") {
          el.textContent = "–";
          st.textContent = !round ? "the timer appears when a question is on screen"
            : !G().playable(round) ? "no timer in this round yet"
            : s.show.phase === "intro" ? "the timer starts with question 1" : "";
        } else if (round.kind === "mini" && G().item().mode !== "memory") {
          el.textContent = GN.mini.fmt(GN.mini.elapsed());
          st.textContent = GN.mini.running() ? "on the clock" : GN.mini.elapsed() ? "stopped" : "ready";
          el.parentElement.classList.remove("is-urgent");
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
          if (a === "shuffle") g.shuffle();
          if (a === "edit") GN.openEditor();
          if (a === "clip-play") g.playClip();
          if (a === "cat-valid") GN.category.valid();
          if (a === "cat-out") GN.category.out();
          if (a === "cat-skip") GN.category.skip();
          if (a === "cat-back") GN.category.bringBack(act.dataset.team);
          if (a === "tb-win") GN.tiebreak.setWinner(act.dataset.team);
          if (a === "fin-replay" || a === "finale") g.finale();
          if (a === "fin-again") { GN.store.resetScores(); GN.store.set({ screen: "order" }); }
          if (a === "mini-clock") GN.mini.toggleClock();
          if (a === "mini-reset") GN.mini.resetClock();
          if (a === "mini-mark") GN.mini.mark(act.dataset.team);
          if (a === "mini-unmark") GN.mini.unmark(act.dataset.team);
          if (a === "mini-win") GN.mini.setWinner(act.dataset.team || null);
          if (a === "mini-guess") GN.mini.guess(GN.mini.state().guessed + 1);
          if (a === "mini-unguess") GN.mini.guess(GN.mini.state().guessed - 1);
          if (a === "mini-reguess") GN.mini.guess(0);
          if (a === "clip-stop") g.stopClip(false);
          if (a === "clips-ready") {
            act.disabled = true;
            act.textContent = "Getting clips ready…";
            GN.music.prepare(true).finally(() => { act.disabled = false; act.textContent = "Get clips ready"; });
          }
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
      stage.addEventListener("input", (e) => {
        if (e.target.matches("[data-tb-guess]")) GN.tiebreak.setGuess(e.target.dataset.tbGuess, e.target.value);
      });
      stage.addEventListener("change", (e) => {
        const round = G().round();
        if (e.target.matches("[data-clip-choice]")) GN.music.choose(round, GN.store.get().show.item, Number(e.target.value));
        if (e.target.matches("[data-clip-start]")) GN.music.setStart(round, GN.store.get().show.item, Number(e.target.value) || 0);
      });
      stage.addEventListener("submit", (e) => {
        const sf = e.target.closest("[data-search]");
        if (sf) {
          e.preventDefault();
          const round = GN.music.musicRound(), i = Number(sf.dataset.search);
          GN.music.search(round, i, sf.querySelector("input").value.trim()).then((ok) => ok && GN.music.prepare());
          return;
        }
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
