/*
 * Tie-breaker: each team writes down a number; closest to the answer wins.
 * The host types each team's guess in the host window. On the reveal the TV ranks the
 * guesses, and the host gives the tie-break (+1 point, enough to break the tie).
 */
(function () {
  const S = () => GN.store.get();
  const set = (p) => GN.store.set(p);
  const G = () => GN.game;

  const T = (GN.tiebreak = {
    POINTS: 1,
    state() { return S().show.tb || { guesses: {}, winner: null }; },
    patch(p) { set((s) => ({ show: { ...s.show, tb: { ...T.state(), ...p } } })); },
    // Accepts "10,080", "10080" or "10 080".
    parse(v) { const n = Number(String(v).replace(/[,\s]/g, "")); return String(v).trim() && Number.isFinite(n) ? n : null; },
    setGuess(teamId, value) {
      const n = T.parse(value);
      const guesses = { ...T.state().guesses };
      if (n == null) delete guesses[teamId]; else guesses[teamId] = n;
      T.patch({ guesses });
    },
    // Teams with a guess, closest first.
    ranked() {
      const item = G().item(), g = T.state().guesses;
      if (!item || item.value == null) return [];
      return S().teams.filter((t) => g[t.id] != null)
        .map((t) => ({ team: t, guess: g[t.id], diff: Math.abs(g[t.id] - item.value) }))
        .sort((a, b) => a.diff - b.diff);
    },
    // The closest team, unless two are equally close.
    suggestion() {
      const r = T.ranked();
      return r.length && (r.length === 1 || r[0].diff < r[1].diff) ? r[0].team.id : null;
    },
    setWinner(teamId) {
      const w = T.state().winner;
      if (w === teamId) return;
      if (w) G().award(w, -T.POINTS, "Tie-breaker: changed");
      if (teamId) G().award(teamId, T.POINTS, "Tie-breaker");
      T.patch({ winner: teamId || null });
    }
  });
})();
