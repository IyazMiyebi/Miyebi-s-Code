/*
 * The live show on the big screen: round intro, question with countdown, the
 * "time's up" moment, the answer reveal and the standings between rounds.
 * Everything it shows comes from the shared game state, so the host window can drive it.
 */
(function () {
  GN.screens = GN.screens || {};
  const esc = GN.esc;
  const G = () => GN.game;
  const RING = 2 * Math.PI * 54;

  function pointsLine(round) {
    const r = GN.store.get().rules;
    return {
      music: `${r.musicBoth} points for title and artist · ${r.musicOne} for one`,
      scramble: `${r.scramble} points per word`,
      quiz: `${r.brain} points per question`,
      mini: `${r.mini} points per win`,
      category: `${r.categoryAnswer} points per answer · ${r.categoryBonus} bonus for the last team standing`,
      tiebreak: "Closest answer wins"
    }[round.kind];
  }
  const STAGE_FOR = { mini: 5, category: 6 };
  const NOTE = {
    music: "For now, play each song from your own phone or playlist, then start the timer. Stage 4 adds a built-in clip player.",
    scramble: "Stage 3 adds animated letter tiles."
  };

  /* ---------- Views ---------- */
  function introHTML(round, index, total) {
    const playable = G().playable(round);
    return `
      <div class="intro">
        <canvas class="intro__ascii" aria-hidden="true"></canvas>
        <div class="intro__text">
          <p class="eyebrow">${round.number ? `Round ${round.number} of ${total}` : "Extra time"}</p>
          <h2 class="intro__name" data-decode="${esc(round.name)}">${esc(round.name)}</h2>
          ${round.subtitle ? `<p class="intro__sub">${esc(round.subtitle)}</p>` : ""}
          <ul class="intro__how">${round.howTo.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <p class="intro__pts">${pointsLine(round)}</p>
          ${playable ? (NOTE[round.kind] ? `<p class="intro__note">${NOTE[round.kind]}</p>` : "") : `<p class="intro__note">This round’s screens arrive in Stage ${STAGE_FOR[round.kind]}. For now, play it off-screen, award points with the team buttons, then press Space for the standings.</p>`}
        </div>
      </div>`;
  }

  // What the players see for each kind of question.
  function promptHTML(round, item) {
    if (round.kind === "scramble") {
      const letters = [...GN.scramble(item.answer, item.scrambled)];
      return `<div class="tiles" aria-label="Letters: ${esc(letters.join(" "))}">${letters.map((c, j) =>
        `<span class="tile" style="--j:${j}">${esc(c)}</span>`).join("")}</div>`;
    }
    if (round.kind === "music") {
      return `<div class="clip"><span class="eq" aria-hidden="true">${"<i></i>".repeat(5)}</span>
        <p class="q__text">Name the <em>song</em> and the <em>artist</em>.</p></div>`;
    }
    const q = item.q || "";
    return `<p class="q__text${q.length > 90 ? " is-long" : ""}">${esc(q)}</p>`;
  }

  function questionHTML(round, i, item, reveal) {
    return `
      <div class="q${reveal ? " is-reveal" : ""}">
        <canvas class="q__ascii" aria-hidden="true"></canvas>
        <header class="q__head">
          <p class="eyebrow">${esc(G().itemLabel(round, i))}</p>
          <p class="q__round">${esc(round.name)}</p>
        </header>
        <div class="q__prompt">${promptHTML(round, item)}</div>
        <div class="timer" data-timer>
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="timer__track" cx="60" cy="60" r="54"/><circle class="timer__ring" cx="60" cy="60" r="54" style="stroke-dasharray:${RING}"/></svg>
          <span class="timer__num" data-num></span>
          <span class="timer__state" data-state></span>
        </div>
        <div class="answer" data-answer ${reveal ? "" : "hidden"}>
          <p class="answer__k">Answer</p>
          <p class="answer__v" data-answer-text></p>
        </div>
      </div>`;
  }

  function standingsHTML(title) {
    const list = G().standings();
    const leaders = list.filter((t) => t.place === 1);
    const lead = list.length && list[0].score > 0
      ? (leaders.length > 1 ? "All square at the top" : `${esc(leaders[0].name)} in the lead`)
      : "Everything to play for";
    return `
      <div class="stand">
        <header class="stand__head">
          <p class="eyebrow">${esc(title)}</p>
          <h2 class="display">Standings. <em>${lead}</em></h2>
        </header>
        <div class="stand__cards">
          ${list.map((t) => `
            <div class="hang hang--score${t.place === 1 && t.score > 0 ? " is-lead" : ""}" data-hang="${t.id}" style="--team:${GN.colourHex(t.colour)}">
              <span class="hang__string" aria-hidden="true"></span>
              <div class="hang__card">
                <span class="hang__hole" aria-hidden="true"></span>
                <span class="hang__place">${["1st", "2nd", "3rd", "4th"][t.place - 1]}</span>
                <span class="hang__name">${esc(t.name)}</span>
                <span class="hang__score" data-score-for="${t.id}">${t.score}</span>
              </div>
            </div>`).join("")}
        </div>
      </div>`;
  }

  GN.screens.play = {
    label: "Live show",
    mount(root) {
      root.innerHTML = `
        <div class="play">
          <div class="play__view" data-view></div>
          <div class="board" data-board hidden></div>
          <div class="slam" data-slam aria-hidden="true"><span>Time’s up</span></div>
          <p class="play__hint" data-hint></p>
          <div data-strip></div>
        </div>`;
      const viewEl = root.querySelector("[data-view]");
      const boardEl = root.querySelector("[data-board]");
      const slamEl = root.querySelector("[data-slam]");
      const hintEl = root.querySelector("[data-hint]");
      const strip = GN.ui.scoreStrip(root.querySelector("[data-strip]"));
      let key = "", boardKey = "", cleanups = [], boardCleanups = [], hangers = {}, raf = 0, lastWhole = null;

      const clear = (list) => { list.forEach((f) => f()); list.length = 0; };

      function renderView() {
        const s = GN.store.get(), sh = s.show, round = G().round();
        if (!round) return;
        const k = `${sh.round}-${sh.item}-${sh.phase}`;
        if (k === key) return;
        const prevPhase = key.split("-")[2];
        const sameQuestion = key && key.split("-").slice(0, 2).join("-") === `${sh.round}-${sh.item}`;
        key = k;
        clear(cleanups);
        Object.values(hangers).forEach((h) => h.destroy());
        hangers = {};

        // Question → reveal on the same item keeps the screen and adds the answer.
        if (sameQuestion && prevPhase === "question" && sh.phase === "reveal") {
          showAnswer(round, viewEl.querySelector(".view:last-child"), true);
          return;
        }

        const total = s.pack.rounds.filter((r) => r.number).length;
        let html = "";
        if (sh.phase === "intro") html = introHTML(round, sh.round, total);
        else if (sh.phase === "standings") html = standingsHTML(round.number ? `After Round ${round.number}` : `After the ${round.name.toLowerCase()}`);
        else html = questionHTML(round, sh.item, G().item(), sh.phase === "reveal");

        const next = document.createElement("div");
        next.className = "view is-in";
        next.innerHTML = html;
        viewEl.querySelectorAll(".view").forEach((old) => {
          old.classList.add("is-out");
          setTimeout(() => old.remove(), GN.motionOK() ? 600 : 0);
        });
        viewEl.appendChild(next);
        requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("is-in")));

        if (sh.phase === "intro") {
          GN.sound.play("whoosh");
          const c = next.querySelector(".intro__ascii");
          const fx = GN.fx.asciiField(c, { text: round.number ? String(round.number).padStart(2, "0") : "TB", formMs: 1600, alpha: 0.9 });
          cleanups.push(() => fx.destroy());
          const h = next.querySelector("[data-decode]");
          cleanups.push(GN.fx.decode(h, h.dataset.decode, 1100));
        }
        if (sh.phase === "standings") {
          GN.sound.play("applause");
          next.querySelectorAll("[data-hang]").forEach((el, i) => {
            hangers[el.dataset.hang] = GN.fx.hang(el, { startAngle: i % 2 ? 0.3 : -0.28, length: 1.3 + i * 0.12 });
          });
        }
        if (sh.phase === "reveal") showAnswer(round, next, false);
        if (sh.phase === "question" || sh.phase === "reveal") { lastWhole = null; tickTimer(); }
      }

      function showAnswer(round, view, withSound) {
        const box = view.querySelector("[data-answer]");
        const text = G().answerOf(round, G().item());
        view.querySelector(".q").classList.add("is-reveal");
        box.hidden = false;
        cleanups.push(GN.fx.decode(box.querySelector("[data-answer-text]"), text, 900));
        // Short answers are also written large in ASCII behind the question.
        if (text.length <= 12) {
          const fx = GN.fx.asciiField(view.querySelector(".q__ascii"), { text: text.toUpperCase(), formMs: 1100, alpha: 0.32, fill: 0.7 });
          cleanups.push(() => fx.destroy());
        }
        if (withSound) GN.sound.play("reveal");
      }

      function renderBoard() {
        const s = GN.store.get();
        const k = s.show.board ? "on" : "off";
        if (k === boardKey) return;
        boardKey = k;
        clear(boardCleanups);
        if (!s.show.board) {
          boardEl.classList.remove("is-on");
          setTimeout(() => { if (!GN.store.get().show.board) { boardEl.hidden = true; boardEl.innerHTML = ""; } }, GN.motionOK() ? 400 : 0);
          return;
        }
        boardEl.hidden = false;
        boardEl.innerHTML = standingsHTML("Scoreboard");
        requestAnimationFrame(() => boardEl.classList.add("is-on"));
        boardEl.querySelectorAll("[data-hang]").forEach((el, i) => {
          const h = GN.fx.hang(el, { startAngle: i % 2 ? 0.25 : -0.22, length: 1.3 + i * 0.12 });
          boardCleanups.push(() => h.destroy());
          hangers["board-" + el.dataset.hang] = h;
        });
      }

      // Scores changed: roll the numbers and bounce the hanging cards.
      function scoresChanged(prev) {
        const { teams } = GN.store.get();
        strip.update(prev);
        let up = false, down = false;
        teams.forEach((t) => {
          const before = (prev.teams.find((x) => x.id === t.id) || t).score;
          if (before === t.score) return;
          t.score > before ? (up = true) : (down = true);
          root.querySelectorAll(`[data-score-for="${t.id}"]`).forEach((el) => GN.ui.roll(el, before, t.score));
          [hangers[t.id], hangers["board-" + t.id]].forEach((h) => h && h.nudge(1.4));
        });
        if (up) GN.sound.play("score");
        else if (down) GN.sound.play("minus");
      }

      function tickTimer() {
        cancelAnimationFrame(raf);
        const el = root.querySelector(".view:last-child [data-timer]");
        if (!el) return;
        const s = GN.store.get(), t = s.timer, sh = s.show;
        const left = G().secondsLeft();
        const whole = Math.ceil(left - 0.001);
        const frac = t.duration ? left / t.duration : 0;
        el.querySelector(".timer__ring").style.strokeDashoffset = String(RING * (1 - frac));
        el.querySelector("[data-num]").textContent = sh.timesUp ? "0" : whole;
        const state = sh.phase === "reveal" ? "Revealed" : sh.timesUp ? "Time’s up" : t.running ? "" : t.left < t.duration ? "Paused" : "Ready";
        el.querySelector("[data-state]").textContent = state;
        el.classList.toggle("is-urgent", t.running && whole <= 5);
        el.classList.toggle("is-done", sh.timesUp);
        el.classList.toggle("is-idle", !t.running && !sh.timesUp);
        if (t.running && lastWhole !== null && whole !== lastWhole && whole > 0) {
          GN.sound.play(whole <= 5 ? "tickUrgent" : "tick");
          if (whole <= 5) { el.classList.remove("is-beat"); void el.offsetWidth; el.classList.add("is-beat"); }
        }
        lastWhole = whole;
        if (t.running) raf = requestAnimationFrame(tickTimer);
      }

      function slam() {
        GN.sound.play("buzzer");
        slamEl.classList.remove("is-on"); void slamEl.offsetWidth; slamEl.classList.add("is-on");
        root.classList.remove("is-shake"); void root.offsetWidth;
        if (GN.motionOK()) root.classList.add("is-shake");
      }

      function renderHint() {
        hintEl.innerHTML = `<kbd>Space</kbd> ${esc(G().nextLabel())} <span class="play__keys">· <kbd>←</kbd> back · <kbd>P</kbd> pause · <kbd>1</kbd>–<kbd>${GN.store.get().teams.length}</kbd> score · <kbd>U</kbd> undo · <kbd>G</kbd> scoreboard · <kbd>Esc</kbd> rounds</span>`;
      }

      function onChange(s, prev) {
        if (s.screen !== "play" || s.show.round == null) return;
        renderView();
        renderBoard();
        renderHint();
        if (prev) {
          if (prev.teams !== s.teams) scoresChanged(prev);
          const sh = s.show, ph = prev.show;
          if (!ph.timesUp && sh.timesUp && ph.phase === "question" && sh.phase === "question" && ph.item === sh.item && ph.round === sh.round) slam();
          if (!prev.timer.running && s.timer.running && s.timer.left === s.timer.duration) GN.sound.play("start");
          if (prev.timer !== s.timer || prev.show !== s.show) { lastWhole = null; tickTimer(); }
        }
      }

      const unsub = GN.store.subscribe(onChange);
      onChange(GN.store.get(), null);

      return () => {
        unsub();
        cancelAnimationFrame(raf);
        clear(cleanups);
        clear(boardCleanups);
        Object.values(hangers).forEach((h) => h.destroy());
        strip.destroy();
      };
    },

    // Keys while the show is running (see app.js for the rest).
    onKey(e) {
      const g = G(), k = e.key;
      if (/^[1-4]$/.test(k)) {
        const team = GN.store.get().teams[Number(k) - 1];
        if (!team) return false;
        const pts = g.points(g.round());
        g.award(team.id, e.shiftKey ? -pts : pts);
        return true;
      }
      // Shift+number arrives as "!", "@" etc. on many keyboards.
      const shifted = { "!": 1, "@": 2, '"': 2, "#": 3, "£": 3, "$": 4 }[k];
      if (shifted && e.shiftKey) {
        const team = GN.store.get().teams[shifted - 1];
        if (team) g.award(team.id, -g.points(g.round()));
        return true;
      }
      switch (k.toLowerCase()) {
        case " ": case "arrowright": case "pagedown": case "enter": g.advance(); return true;
        case "arrowleft": case "pageup": g.back(); return true;
        case "p": g.togglePause(); return true;
        case "t": g.restartTimer(); return true;
        case "r": if (GN.store.get().show.phase === "question") g.reveal(); return true;
        case "g": g.toggleBoard(); return true;
        case "u": g.undo(); return true;
        case "escape": g.exit(); return true;
      }
      return false;
    }
  };
})();
