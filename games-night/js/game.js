/*
 * The rules of the live show: which step comes next, the countdown, and scoring.
 * The big screen and the host window both call these, so they always agree.
 *
 * A round goes:  intro → question 1 → (timer) → time's up → reveal → question 2 … → standings
 */
(function () {
  const S = () => GN.store.get();
  const set = (p) => GN.store.set(p);

  // Rounds that run item by item (all of them, now).
  const PLAYABLE = ["quiz", "tiebreak", "music", "scramble", "mini", "category"];

  const G = (GN.game = {
    round() { const s = S(); return s.show.round == null ? null : GN.rounds()[s.show.round]; },
    item() { const r = G.round(); return r ? r.items[S().show.item] : null; },
    playable(round) { return !!round && PLAYABLE.includes(round.kind); },

    // Seconds on the clock for a round's questions.
    seconds(round) {
      const r = S().rules;
      return { music: r.musicSeconds, scramble: r.scrambleSeconds, quiz: r.brainSeconds, tiebreak: r.brainSeconds,
        category: r.categoryTurnSeconds, mini: r.memoryShowSeconds }[round.kind] || 30;
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
      set((s) => ({ screen: "play", show: { ...s.show, round: index, item: 0, phase: "intro", timesUp: false, board: false, shuffle: 0,
        clip: { ...s.show.clip, item: null, playing: false, played: false } } }));
      G.resetTimer();
    },
    goQuestion(item, { timesUp = false } = {}) {
      set((s) => ({ show: { ...s.show, item, phase: "question", timesUp, shuffle: 0,
        clip: { ...s.show.clip, item, playing: false, played: timesUp }, mini: GN.mini.fresh(), cat: GN.category.fresh(), tb: { guesses: {}, winner: null } } }));
      G.resetTimer(timesUp);
    },

    // The one "do the next thing" button (Space on the big screen).
    advance() {
      const s = S(), sh = s.show, round = G.round(), t = s.timer;
      if (!round) return s.screen === "finale" ? G.finale() : G.startRound(G.firstUnplayed());
      if (sh.board) return G.toggleBoard(false);
      switch (sh.phase) {
        case "intro":
          return G.playable(round) ? G.goQuestion(0) : G.toStandings();
        case "question":
          if (round.kind === "mini") return GN.mini.advance();
          if (round.kind === "category") return GN.category.advance();
          if (sh.timesUp) return G.reveal();
          if (t.running) return G.timeUp();
          if (t.left < t.duration) return G.resume();
          // Music: play the clip first; the timer starts by itself when it ends.
          if (round.kind === "music" && (sh.clip.playing || sh.clip.pending)) return G.stopClip(true);
          if (round.kind === "music" && !sh.clip.played && G.hasClip()) return G.playClip();
          return G.startTimer();
        case "reveal":
          // Tie-breaker: the backup question is only needed if nobody has won it yet.
          if (round.kind === "tiebreak" && GN.tiebreak.state().winner) return G.toStandings();
          return sh.item < round.items.length - 1 ? G.goQuestion(sh.item + 1) : G.toStandings();
        case "standings": {
          // The tie-breaker is only played if the top teams are level; then the finale.
          const next = GN.rounds()[sh.round + 1];
          if (next && (next.kind !== "tiebreak" || G.needsTiebreak())) return G.startRound(sh.round + 1);
          return G.finale();
        }
      }
    },
    // What advance() will do next, in words for the host.
    nextLabel() {
      const s = S(), sh = s.show, round = G.round(), t = s.timer;
      if (!round) {
        if (s.screen === "finale") return "Replay the reveal";
        const r = GN.rounds()[G.firstUnplayed()];
        return r.number ? `Start Round ${r.number}` : `Start the ${r.name.toLowerCase()}`;
      }
      if (sh.board) return "Hide the scoreboard";
      switch (sh.phase) {
        case "intro": return !G.playable(round) ? "Show the standings" : round.kind === "mini" ? "Show challenge 1" : round.kind === "category" ? "Show category 1" : "Show question 1";
        case "question":
          if (round.kind === "mini") return GN.mini.nextLabel();
          if (round.kind === "category") return GN.category.nextLabel();
          if (sh.timesUp) return "Reveal the answer";
          if (t.running) return "Stop the clock";
          if (t.left < t.duration) return "Resume the timer";
          if (round.kind === "music" && (sh.clip.playing || sh.clip.pending)) return "Stop the clip and start the timer";
          if (round.kind === "music" && !sh.clip.played && G.hasClip()) return `Play clip ${sh.item + 1}`;
          return "Start the timer";
        case "reveal":
          if (round.kind === "tiebreak") return GN.tiebreak.state().winner ? "Show the standings" : sh.item < round.items.length - 1 ? "Still level: backup question" : "Show the standings";
          return sh.item < round.items.length - 1 ? `${{ mini: "Challenge", category: "Category" }[round.kind] || "Question"} ${sh.item + 2}` : "Show the standings";
        case "standings": {
          const next = GN.rounds()[sh.round + 1];
          if (next && (next.kind !== "tiebreak" || G.needsTiebreak())) return next.number ? `Start Round ${next.number}` : `Start the ${next.name.toLowerCase()} (scores are level)`;
          return "Reveal the winner";
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
      const i = GN.rounds().findIndex((r) => r.number && !s.played.includes(r.id));
      return i === -1 ? 0 : i;
    },

    back() {
      const s = S(), sh = s.show, round = G.round();
      if (!round) return;
      if (sh.board) return G.toggleBoard(false);
      switch (sh.phase) {
        case "intro":
          if (sh.round > 0) {
            const prev = GN.rounds()[sh.round - 1];
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
      // Music: play the song again as the answer goes up.
      const round = G.round();
      if (round && round.kind === "music" && G.hasClip()) setTimeout(() => { if (S().show.phase === "reveal") G.playClip(); }, 700);
    },
    /* ---------- Music clips ----------
       The host asks for a clip; the big screen plays it and reports back. */
    hasClip() {
      const round = G.round();
      return !!(round && round.kind === "music" && GN.music.option(round, S().show.item));
    },
    playClip() {
      const round = G.round();
      if (!round || round.kind !== "music" || !["question", "reveal"].includes(S().show.phase)) return;
      // Bumping "stop" silences a clip playing in the other window first.
      set((s) => ({ show: { ...s.show, clip: { ...s.show.clip, n: s.show.clip.n + 1, stop: s.show.clip.stop + 1, item: s.show.item, playing: false, pending: true, error: null } } }));
      GN.music.playHere();
    },
    // thenTimer: start the answer timer straight away (Space during a clip).
    stopClip(thenTimer) {
      set((s) => ({ show: { ...s.show, clip: { ...s.show.clip, stop: s.show.clip.stop + 1, playing: false, pending: false, played: true } } }));
      if (thenTimer && S().show.phase === "question" && !S().timer.running && !S().show.timesUp) G.startTimer();
    },
    clipStarted() { set((s) => ({ show: { ...s.show, clip: { ...s.show.clip, playing: true, pending: false, played: true, error: null } } })); },
    // The big screen couldn't play it ("blocked", "error" or "missing").
    clipFailed(error) { set((s) => ({ show: { ...s.show, clip: { ...s.show.clip, playing: false, pending: false, error } } })); },
    // Called by the big screen when a clip finishes on its own.
    clipEnded() {
      const s = S();
      set({ show: { ...s.show, clip: { ...s.show.clip, playing: false, pending: false } } });
      const t = S().timer;
      if (S().show.phase === "question" && !S().show.timesUp && !t.running && t.left >= t.duration) G.startTimer();
    },

    // Word scramble: show the same letters in a new order.
    shuffle() {
      const round = G.round();
      if (!round || round.kind !== "scramble" || S().show.phase !== "question") return;
      set((s) => ({ show: { ...s.show, shuffle: (s.show.shuffle || 0) + 1 } }));
    },
    // The letters currently on screen for a scramble question.
    letters(round, item) {
      const sh = S().show;
      if (sh.phase === "reveal") return item.answer.toUpperCase().replace(/\s/g, "");
      return GN.scramble(item.answer, item.scrambled, sh.shuffle || 0);
    },
    toggleBoard(force) {
      set((s) => ({ show: { ...s.show, board: typeof force === "boolean" ? force : !s.show.board } }));
    },
    // The top two teams are on the same score.
    needsTiebreak() {
      const list = G.standings();
      return list.length > 1 && list[0].score === list[1].score;
    },
    // "And the winner is…"
    finale() {
      G.pause();
      GN.music && GN.music.stopHere();
      set((s) => ({ screen: "finale", finaleAt: Date.now(), show: { ...s.show, round: null, board: false } }));
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
      return t.running ? Math.max(0, (t.endsAt - GN.now()) / 1000) : t.left;
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
    if (GN.role === "remote") return; // the laptop keeps time; a phone only shows it
    const t = S().timer;
    if (!t.running || Date.now() < t.endsAt) return;
    // Category bank: running out of time puts the team out. Only the big screen does
    // this, so the two windows can't both do it at once.
    const round = G.round();
    if (round && round.kind === "category" && S().show.phase === "question") {
      if (GN.role === "show") GN.category.out();
      return;
    }
    G.timeUp();
  }, 100);
})();
