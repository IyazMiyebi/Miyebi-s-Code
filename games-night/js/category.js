/*
 * Category Bank (Round 5). Teams take turns naming something in the category, with a
 * short turn timer that passes to the next team after every valid answer. Run out of
 * time, repeat an answer or get it wrong, and the team is out of this category.
 * Each valid answer scores; the last team standing gets the bonus.
 * The starting team rotates from one category to the next.
 */
(function () {
  const S = () => GN.store.get();
  const set = (p) => GN.store.set(p);
  const G = () => GN.game;
  const fresh = () => ({ started: false, turn: null, out: {}, answers: {}, winner: null });

  const C = (GN.category = {
    fresh,
    state() { return S().show.cat || fresh(); },
    patch(p) {
      set((s) => {
        const c = s.show.cat || fresh();
        return { show: { ...s.show, cat: { ...c, ...(typeof p === "function" ? p(c) : p) } } };
      });
    },
    name() { const it = G().item(); return typeof it === "string" ? it : (it && it.name) || ""; },
    // Teams in turn order for this category (rotated so a different team starts each time).
    order() {
      const teams = S().teams, n = teams.length, k = S().show.item % n;
      return teams.slice(k).concat(teams.slice(0, k));
    },
    alive() { const c = C.state(); return C.order().filter((t) => !c.out[t.id]); },
    // The next team still in, after `id`.
    after(id) {
      const order = C.order(), c = C.state();
      const i = order.findIndex((t) => t.id === id);
      for (let j = 1; j <= order.length; j++) {
        const t = order[(i + j) % order.length];
        if (!c.out[t.id] && t.id !== id) return t;
      }
      return null;
    },
    team(id) { return S().teams.find((t) => t.id === id) || null; },

    newTurn(teamId) {
      C.patch({ turn: teamId });
      G().resetTimer();
      G().startTimer();
    },
    start() {
      const first = C.alive()[0];
      if (!first) return;
      C.patch({ started: true });
      C.newTurn(first.id);
    },
    // A good answer: points, then the turn passes on.
    valid() {
      const c = C.state();
      if (!c.started || c.winner || !c.turn) return;
      G().award(c.turn, S().rules.categoryAnswer, `${C.name()}: answer`);
      C.patch((x) => ({ answers: { ...x.answers, [c.turn]: (x.answers[c.turn] || 0) + 1 } }));
      const next = C.after(c.turn);
      C.newTurn(next ? next.id : c.turn);
    },
    // Out of time, a repeat, or a wrong answer.
    out(teamId) {
      const c = C.state();
      const id = teamId || c.turn;
      if (!c.started || c.winner || !id || c.out[id]) return;
      const next = C.after(id);
      C.patch((x) => ({ out: { ...x.out, [id]: true } }));
      const left = C.alive();
      if (left.length <= 1) {
        // Last team standing: they get the bonus and the category ends.
        const w = left[0];
        set((s) => ({ timer: { ...s.timer, running: false, endsAt: null, left: 0 } }));
        C.patch({ winner: w ? w.id : null, turn: null });
        if (w) G().award(w.id, S().rules.categoryBonus, `${C.name()}: last team standing`);
        return;
      }
      if (id === c.turn) C.newTurn(next.id);
    },
    // Put a team back in (if the host was too quick).
    bringBack(teamId) {
      const c = C.state();
      if (c.winner) {
        G().award(c.winner, -S().rules.categoryBonus, `${C.name()}: bonus taken back`);
        C.patch({ winner: null });
      }
      C.patch((x) => { const out = { ...x.out }; delete out[teamId]; return { out }; });
      if (!C.state().turn) C.newTurn(teamId);
    },
    skip() { const c = C.state(); if (c.turn) { const n = C.after(c.turn); if (n) C.newTurn(n.id); } },

    advance() {
      const c = C.state(), t = S().timer;
      if (!c.started) return C.start();
      if (c.winner || !C.alive().length) return G().reveal();
      if (t.running) return C.valid();
      return G().resume();
    },
    nextLabel() {
      const c = C.state(), t = S().timer;
      if (!c.started) return "Start the category";
      if (c.winner || !C.alive().length) return "Show the result";
      if (t.running) return `Valid answer: ${(C.team(c.turn) || {}).name} +${S().rules.categoryAnswer}`;
      return "Resume the timer";
    }
  });
})();
