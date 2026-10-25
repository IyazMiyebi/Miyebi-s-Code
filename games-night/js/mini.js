/*
 * Mini games (Round 4). Each challenge has a mode from the pack:
 *   stopwatch      a race clock; each team's time is recorded when it finishes
 *   last-standing  a clock that runs until one team is left; teams are marked out
 *   memory         look at the tray (countdown), cover it, then write (countdown)
 * The winner gets the round's points with one tap. Charades prompts (if any) show only
 * in the host window, and turn over on the TV once guessed.
 */
(function () {
  const S = () => GN.store.get();
  const set = (p) => GN.store.set(p);
  const G = () => GN.game;
  const fresh = () => ({ start: null, acc: 0, times: {}, out: {}, winner: null, stage: "ready", guessed: 0 });

  const M = (GN.mini = {
    fresh,
    state() { return S().show.mini || fresh(); },
    mode() { const it = G().item(); return (it && it.mode) || "stopwatch"; },
    // The race clock is stored as a start time, so both windows show the same time.
    elapsed() { const m = M.state(); return m.acc + (m.start ? Date.now() - m.start : 0); },
    running() { return !!M.state().start; },
    patch(p) {
      set((s) => {
        const m = s.show.mini || fresh();
        return { show: { ...s.show, mini: { ...m, ...(typeof p === "function" ? p(m) : p) } } };
      });
    },

    startClock() { if (!M.running()) M.patch({ start: Date.now() }); },
    pauseClock() { if (M.running()) M.patch((m) => ({ acc: m.acc + Date.now() - m.start, start: null })); },
    toggleClock() { M.running() ? M.pauseClock() : M.startClock(); },
    resetClock() { M.patch({ start: null, acc: 0, times: {}, out: {} }); },

    // Stopwatch: this team has finished. Last standing: this team is out.
    mark(teamId) {
      const mode = M.mode(), m = M.state();
      if (!M.running() || !S().teams.some((t) => t.id === teamId)) return;
      const at = M.elapsed();
      if (mode === "stopwatch" && m.times[teamId] == null) M.patch((x) => ({ times: { ...x.times, [teamId]: at } }));
      else if (mode === "last-standing" && m.out[teamId] == null) M.patch((x) => ({ out: { ...x.out, [teamId]: at } }));
      else return;
      // Everyone has finished, or only one team is left: stop the clock.
      const teams = S().teams, after = M.state();
      if (mode === "stopwatch" && teams.every((t) => after.times[t.id] != null)) M.pauseClock();
      if (mode === "last-standing" && teams.filter((t) => after.out[t.id] == null).length <= 1) M.pauseClock();
    },
    unmark(teamId) {
      M.patch((x) => {
        const times = { ...x.times }, out = { ...x.out };
        delete times[teamId];
        delete out[teamId];
        return { times, out };
      });
    },

    // Who the results say won: the fastest, or the last one standing.
    suggestion() {
      const m = M.state(), teams = S().teams, mode = M.mode();
      if (mode === "stopwatch") {
        const done = teams.filter((t) => m.times[t.id] != null).sort((a, b) => m.times[a.id] - m.times[b.id]);
        return done[0] ? done[0].id : null;
      }
      if (mode === "last-standing") {
        const left = teams.filter((t) => m.out[t.id] == null);
        if (left.length === 1 && Object.keys(m.out).length) return left[0].id;
      }
      return null;
    },
    // Give the winner the points. Changing your mind moves them to the new winner.
    setWinner(teamId) {
      const m = M.state(), pts = S().rules.mini, it = G().item();
      if (m.winner === teamId) return;
      if (m.winner) G().award(m.winner, -pts, `${it.name}: winner changed`);
      if (teamId) G().award(teamId, pts, `${it.name} win`);
      M.patch({ winner: teamId || null });
    },
    guess(n) {
      const total = (G().item().prompts || []).length;
      M.patch({ guessed: Math.max(0, Math.min(total, n)) });
    },

    /* The big "next" button during a challenge. */
    advance() {
      const sh = S().show, m = M.state(), t = S().timer, r = S().rules;
      if (M.mode() === "memory") {
        if (m.stage === "ready") return M.memoryStage("look", r.memoryShowSeconds);
        if (t.running) return G().timeUp();
        if (m.stage === "look" && sh.timesUp) return M.memoryStage("write", r.memoryWriteSeconds);
        if (t.left < t.duration && !sh.timesUp) return G().resume();
        return G().reveal();
      }
      if (M.running()) return M.pauseClock();
      if (M.elapsed() === 0) return M.startClock();
      return G().reveal();
    },
    nextLabel() {
      const sh = S().show, m = M.state(), t = S().timer, r = S().rules;
      if (M.mode() === "memory") {
        if (m.stage === "ready") return `Start looking (${r.memoryShowSeconds}s)`;
        if (t.running) return m.stage === "look" ? "Cover the tray now" : "Stop the clock";
        if (m.stage === "look" && sh.timesUp) return `Start writing (${r.memoryWriteSeconds}s)`;
        if (t.left < t.duration && !sh.timesUp) return "Resume the timer";
        return "Show the result";
      }
      if (M.running()) return "Stop the clock";
      if (M.elapsed() === 0) return "Start the clock";
      return "Show the result";
    },
    memoryStage(stage, seconds) {
      M.patch({ stage });
      set((s) => ({ show: { ...s.show, timesUp: false }, timer: { duration: seconds, left: seconds, endsAt: null, running: false } }));
      G().startTimer();
    },

    fmt(ms) {
      const s = Math.max(0, ms) / 1000;
      const m = Math.floor(s / 60);
      return `${m}:${(s % 60).toFixed(1).padStart(4, "0")}`;
    }
  });
})();
