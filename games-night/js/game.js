/*
 * The rules of the live show: which step comes next, the countdown, and scoring.
 * The big screen and the host window both call these, so they always agree.
 *
 * A round goes:  intro → question 1 → (timer) → time's up → reveal → question 2 … → standings
 */
(function () {
  const S = () => GN.store.get();
  const set = (p) => GN.store.set(p);

  // Rounds whose screens are built so far. The others show their intro, then standings.
  const PLAYABLE = ["quiz", "tiebreak"];

  const G = (GN.game = {
    round() { const s = S(); return s.show.round == null ? null : s.pack.rounds[s.show.round]; },
    item() { const r = G.round(); return r ? r.items[S().show.item] : null; },
    playable(round) { return !!round && PLAYABLE.includes(round.kind); },

    // Seconds on the clock for a round's questions.
    seconds(round) {
      const r = S().rules;
      return { music: r.musicSeconds, scramble: r.scrambleSeconds, quiz: r.brainSeconds, tiebreak: r.brainSeconds,
        category: r.categoryTurnSeconds }[round.kind] || 30;
    },
    // The points a correct answer is worth in this round (the one-tap button).
    points(round) {
      const r = S().rules;
      if (!round) return 10;
      return { music: r.musicBoth, scramble: r.scramble, quiz: r.brain, mini: r.mini, category: r.categoryAnswer, tiebreak: 10 }[round.kind] || 10;
    },
    // Other quick amounts offered for this round.
    extraPoints(round) {
      const r = S().rules;
      if (!round) return [10, 20];
      if (round.kind === "music") return [r.musicOne];
      if (round.kind === "category") return [r.categoryBonus];
      return [];
    },

    /* ---------- Moving through the show ---------- */
    startRound(index) {
      set((s) => ({ screen: "play", show: { ...s.show, round: index, item: 0, phase: "intro", timesUp: false, board: false } }));
      G.resetTimer();
    },
    goQuestion(item, { timesUp = false } = {}) {
      set((s) => ({ show: { ...s.show, item, phase: "question", timesUp } }));
      G.resetTimer(timesUp);
    },

    // The one "do the next thing" button (Space on the big screen).
    advance() {
      const s = S(), sh = s.show, round = G.round(), t = s.timer;
      if (!round) return;
      if (sh.board) return G.toggleBoard(false);
      switch (sh.phase) {
        case "intro":
          return G.playable(round) ? G.goQuestion(0) : G.toStandings();
        case "question":
          if (sh.timesUp) return G.reveal();
          if (t.running) return G.timeUp();
          if (t.left < t.duration) return G.resume();
          return G.startTimer();
        case "reveal":
          return sh.item < round.items.length - 1 ? G.goQuestion(sh.item + 1) : G.toStandings();
        case "standings": {
          const next = sh.round + 1;
          if (next < s.pack.rounds.length) return G.startRound(next);
          return set({ screen: "order", show: { ...sh, round: null } });
        }
      }
    },
    // What advance() will do next, in words for the host.
    nextLabel() {
      const s = S(), sh = s.show, round = G.round(), t = s.timer;
      if (!round) return "Start the show";
      if (sh.board) return "Hide the scoreboard";
      switch (sh.phase) {
        case "intro": return G.playable(round) ? "Show question 1" : "Show the standings";
        case "question":
          if (sh.timesUp) return "Reveal the answer";
          if (t.running) return "Stop the clock";
          if (t.left < t.duration) return "Resume the timer";
          return "Start the timer";
        case "reveal":
          return sh.item < round.items.length - 1 ? `Question ${sh.item + 2}` : "Show the standings";
        case "standings": {
          const next = s.pack.rounds[sh.round + 1];
          return next ? (next.number ? `Start Round ${next.number}` : `Start the ${next.name.toLowerCase()}`) : "Back to running order";
        }
      }
      return "";
    },
    // "Brain Game 04 / 10" style label for the current item.
    itemLabel(round, i) {
      const n = String(i + 1).padStart(2, "0"), of = String(round.items.length).padStart(2, "0");
      const noun = { quiz: "Brain Game", scramble: "Unscramble", music: "Music Clip", category: "Category", mini: "Challenge", tiebreak: "Tie-breaker" }[round.kind] || "Question";
      return round.kind === "tiebreak" ? (i === 0 ? "Tie-breaker" : "Tie-breaker · backup") : `${noun} ${n} / ${of}`;
    },
    answerOf(round, item) {
      if (!item) return "";
      if (round.kind === "music") return `${item.title} · ${item.artist}`;
      if (round.kind === "scramble") return item.answer;
      return item.a || "";
    },
    firstUnplayed() {
      const s = S();
      const i = s.pack.rounds.findIndex((r) => r.number && !s.played.includes(r.id));
      return i === -1 ? 0 : i;
    },

    back() {
      const s = S(), sh = s.show, round = G.round();
      if (!round) return;
      if (sh.board) return G.toggleBoard(false);
      switch (sh.phase) {
        case "intro":
          if (sh.round > 0) {
            const prev = s.pack.rounds[sh.round - 1];
            set({ show: { ...sh, round: sh.round - 1, item: prev.items.length - 1, phase: "standings", timesUp: false } });
          } else set({ screen: "order", show: { ...sh, round: null } });
          return;
        case "question":
          if (sh.item > 0) return set({ show: { ...sh, item: sh.item - 1, phase: "reveal", timesUp: true } });
          return set({ show: { ...sh, phase: "intro", timesUp: false } });
        case "reveal":
          return set({ show: { ...sh, phase: "question", timesUp: true } });
        case "standings":
          if (!G.playable(round)) return set({ show: { ...sh, phase: "intro" } });
          return set({ show: { ...sh, item: round.items.length - 1, phase: "reveal", timesUp: true } });
      }
    },
    toStandings() {
      G.pause();
      set((s) => {
        const id = G.round().id;
        return { show: { ...s.show, phase: "standings", board: false }, played: s.played.includes(id) ? s.played : [...s.played, id] };
      });
    },
    reveal() {
      G.pause();
      set((s) => ({ show: { ...s.show, phase: "reveal", timesUp: true } }));
    },
    toggleBoard(force) {
      set((s) => ({ show: { ...s.show, board: typeof force === "boolean" ? force : !s.show.board } }));
    },
    exit() {
      G.pause();
      set((s) => ({ screen: "order", show: { ...s.show, round: null, board: false } }));
    },

    /* ---------- The countdown ----------
       Stored as an end time, so both windows show the same number of seconds. */
    resetTimer(expired = false) {
      const round = G.round();
      const d = round ? G.seconds(round) : 30;
      set({ timer: { duration: d, left: expired ? 0 : d, endsAt: null, running: false } });
    },
    startTimer() {
      const t = S().timer;
      const left = t.left > 0 ? t.left : t.duration;
      set((s) => ({ timer: { ...t, left, running: true, endsAt: Date.now() + left * 1000 }, show: { ...s.show, timesUp: false } }));
    },
    pause() {
      const t = S().timer;
      if (!t.running) return;
      set({ timer: { ...t, running: false, endsAt: null, left: Math.max(0, (t.endsAt - Date.now()) / 1000) } });
    },
    resume() { G.startTimer(); },
    togglePause() { S().timer.running ? G.pause() : G.startTimer(); },
    restartTimer() {
      set((s) => ({ show: { ...s.show, timesUp: false, phase: s.show.phase === "reveal" ? "question" : s.show.phase } }));
      G.resetTimer();
      G.startTimer();
    },
    timeUp() {
      set((s) => ({ timer: { ...s.timer, running: false, endsAt: null, left: 0 }, show: { ...s.show, timesUp: true } }));
    },
    secondsLeft() {
      const t = S().timer;
      return t.running ? Math.max(0, (t.endsAt - Date.now()) / 1000) : t.left;
    },

    /* ---------- Scoring ---------- */
    award(teamId, points, label) {
      points = Math.round(Number(points));
      if (!points) return;
      const round = G.round();
      set((s) => ({
        teams: s.teams.map((t) => (t.id === teamId ? { ...t, score: t.score + points } : t)),
        log: [...s.log, { team: teamId, points, label: label || (round ? round.name : "Bonus"), at: Date.now() }].slice(-200)
      }));
    },
    undo() {
      const last = S().log[S().log.length - 1];
      if (!last) return null;
      set((s) => ({
        teams: s.teams.map((t) => (t.id === last.team ? { ...t, score: t.score - last.points } : t)),
        log: s.log.slice(0, -1)
      }));
      return last;
    },
    standings() {
      const teams = [...S().teams].sort((a, b) => b.score - a.score);
      // Teams on the same score share a place.
      return teams.map((t) => ({ ...t, place: teams.findIndex((x) => x.score === t.score) + 1 }));
    }
  });

  // When the clock runs out, mark time's up. Both windows check; the change is the same.
  setInterval(() => {
    const t = S().timer;
    if (t.running && Date.now() >= t.endsAt) G.timeUp();
  }, 100);
})();
