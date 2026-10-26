/*
 * Tonight's line-up: which games are played, in what order, and how many questions each.
 * The games (with all their questions) live in the pack; the line-up only picks from them.
 * A game played twice gets the next questions the second time, never the same ones again.
 * No line-up (null) means the pack's own running order, exactly as before.
 *
 *   lineup = { rounds: [{ game: "brain", count: 5 }, …], tiebreak: true }
 */
(function () {
  const S = () => GN.store.get();
  const MAX_ROUNDS = 10;

  // What one question is called in each kind of game.
  const NOUNS = {
    music: ["song", "songs"],
    scramble: ["word", "words"],
    quiz: ["question", "questions"],
    mini: ["challenge", "challenges"],
    category: ["category", "categories"]
  };
  const noun = (kind, n) => (NOUNS[kind] || NOUNS.quiz)[n === 1 ? 0 : 1];

  // Every game the line-up can use. The tie-breaker isn't one: it's added automatically.
  const library = (pack = S().pack) => pack.rounds.filter((r) => r.kind !== "tiebreak" && r.items.length);

  // The pack's own running order, with every question.
  const fromPack = (pack = S().pack) => ({ rounds: library(pack).map((g) => ({ game: g.id, count: g.items.length })), tiebreak: true });

  // How many of a game's questions are still free for line-up slot `index`.
  function left(pack, rounds, index) {
    const id = rounds[index].game;
    const g = library(pack).find((x) => x.id === id);
    if (!g) return 0;
    const used = rounds.slice(0, index).filter((e) => e.game === id).reduce((n, e) => n + e.count, 0);
    return Math.max(0, g.items.length - used);
  }

  // Turn the line-up into the rounds the show plays (same shape as the pack's rounds).
  function build(pack, lineup) {
    if (!lineup || !Array.isArray(lineup.rounds)) return pack.rounds;
    const games = library(pack), used = {}, parts = {}, out = [];
    for (const entry of lineup.rounds) {
      const g = games.find((x) => x.id === entry.game);
      if (!g) continue;
      const from = used[g.id] || 0;
      const items = g.items.slice(from, from + Math.max(1, Math.floor(entry.count) || 1));
      if (!items.length) continue;
      used[g.id] = from + items.length;
      const part = (parts[g.id] = (parts[g.id] || 0) + 1);
      out.push({
        ...g,
        id: part > 1 ? `${g.id}-${part}` : g.id,
        game: g.id,
        number: out.length + 1,
        name: part > 1 ? `${g.name} ${part}` : g.name,
        items
      });
    }
    if (!out.length) return pack.rounds;
    if (lineup.tiebreak !== false) out.push(...pack.rounds.filter((r) => r.kind === "tiebreak"));
    return out;
  }

  // The rounds being played, rebuilt only when the pack or the line-up changes.
  let memo = { pack: null, lineup: undefined, rounds: [] };
  GN.rounds = () => {
    const s = S();
    if (memo.pack !== s.pack || memo.lineup !== s.lineup) memo = { pack: s.pack, lineup: s.lineup, rounds: build(s.pack, s.lineup) };
    return memo.rounds;
  };

  // Rough length of a round in seconds, for "about 45 minutes".
  function seconds(kind, n, r) {
    const each = {
      music: r.musicClipSeconds + r.musicSeconds + 25,
      scramble: r.scrambleSeconds + 20,
      quiz: r.brainSeconds + 25,
      mini: 150,
      category: 100
    }[kind] || 45;
    return 60 + each * n;
  }
  function minutes(rounds, r = S().rules) {
    const total = rounds.filter((x) => x.number).reduce((t, x) => t + seconds(x.kind, x.items.length, r), 0);
    return Math.max(5, Math.round(total / 60 / 5) * 5);
  }

  // Ready-made line-ups. Each slot names a kind of game; the first game of that kind is used.
  const PRESETS = [
    { id: "full", name: "The full night", note: "Every game, every question" },
    { id: "quick", name: "Quick game", note: "Three short rounds", slots: [["quiz", 5], ["scramble", 4], ["music", 5]] },
    { id: "quiz", name: "Quiz night", note: "Brains and words", slots: [["quiz", 5], ["scramble", 4], ["quiz", 5], ["scramble", 4]] },
    { id: "party", name: "Party games", note: "Up on your feet", slots: [["mini", 3], ["music", 5], ["category", 4], ["mini", 2]] }
  ];
  function preset(id, pack = S().pack) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return null;
    if (!p.slots) return fromPack(pack);
    const games = library(pack), rounds = [];
    for (const [kind, count] of p.slots) {
      const g = games.find((x) => x.kind === kind);
      if (!g) continue;
      rounds.push({ game: g.id, count });
      const free = left(pack, rounds, rounds.length - 1);
      if (!free) rounds.pop();
      else rounds[rounds.length - 1].count = Math.min(count, free);
    }
    return rounds.length ? { rounds, tiebreak: true } : null;
  }

  GN.lineup = {
    MAX_ROUNDS,
    PRESETS,
    noun,
    library,
    fromPack,
    left,
    build,
    minutes,
    preset,
    // The line-up being used now (the pack's own when none has been picked).
    current: () => S().lineup || fromPack(),
    // Which preset (if any) the current line-up matches.
    matches(lineup = GN.lineup.current()) {
      const same = (a, b) => !!a && !!b && JSON.stringify(a.rounds) === JSON.stringify(b.rounds);
      return (PRESETS.find((p) => same(preset(p.id), lineup)) || {}).id || null;
    },
    // Is a game under way? Changing the games then starts the scores again.
    inProgress: () => { const s = S(); return s.played.length > 0 || s.show.round != null || s.teams.some((t) => t.score !== 0); },
    set(lineup) {
      const base = GN.store.get();
      GN.store.set((s) => ({
        lineup,
        played: [],
        log: [],
        teams: s.teams.map((t) => ({ ...t, score: 0 })),
        show: { ...s.show, round: null, item: 0, phase: "intro", timesUp: false, board: false },
        timer: { ...base.timer, running: false, endsAt: null, left: 0, duration: 0 }
      }));
    }
  };
})();
