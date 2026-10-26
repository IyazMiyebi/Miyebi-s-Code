/*
 * Game packs: a pack is all the content of a show (title, house rules, rounds and their
 * questions, points and timers). This file checks packs, keeps a library of them in the
 * browser, turns them into files and back, and switches the show to a different pack.
 * The editor (js/editor.js) is the screen for all of this.
 */
(function () {
  const LIB = "gn.packs.v1";
  const FORMAT = "games-night-pack";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const S = () => GN.store.get();

  // A blank item for each kind of round.
  const BLANK = {
    music: () => ({ title: "", artist: "" }),
    scramble: () => ({ answer: "", scrambled: "" }),
    quiz: (r) => (r && r.choices ? (r.options ? { q: "", correct: 1, a: "" } : { q: "", options: [], correct: 1, a: "" }) : { q: "", a: "" }),
    mini: () => ({ name: "", mode: "stopwatch", turns: true, text: "", note: "" }),
    category: () => "",
    tiebreak: () => ({ q: "", a: "", value: null })
  };
  const blankText = (v) => typeof v !== "string" || !v.trim();

  function readLib() {
    try { const v = JSON.parse(localStorage.getItem(LIB)); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function writeLib(list) {
    try { localStorage.setItem(LIB, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  const P = (GN.packs = {
    BLANK,
    clone,

    /* Everything that needs fixing before a pack can be used. Each problem has the
       path of the box it's about, so the editor can point at it. */
    validate(pack) {
      const errors = [];
      const err = (path, msg) => errors.push({ path, msg });
      if (blankText(pack.title)) err("title", "The show needs a title.");
      (pack.rounds || []).forEach((r, i) => {
        const where = r.number ? `Round ${r.number}` : r.name || "Tie-breaker";
        const p = `rounds.${i}`;
        if (blankText(r.name)) err(`${p}.name`, `${where} needs a name.`);
        if (!r.items || !r.items.length) err(`${p}.items`, `${where} needs at least one item.`);
        (r.items || []).forEach((it, j) => {
          const q = `${p}.items.${j}`, n = `${where}, item ${j + 1}`;
          switch (r.kind) {
            case "music":
              if (blankText(it.title)) err(`${q}.title`, `${n}: the song title is empty.`);
              if (blankText(it.artist)) err(`${q}.artist`, `${n}: the artist is empty.`);
              break;
            case "scramble": {
              const a = (it.answer || "").replace(/\s/g, "");
              if (!a) err(`${q}.answer`, `${n}: the word is empty.`);
              else if (!/^[A-Za-z]+$/.test(a)) err(`${q}.answer`, `${n}: use letters only (A to Z).`);
              else if (new Set(a.toUpperCase()).size < 2) err(`${q}.answer`, `${n}: this word can't be scrambled.`);
              if (it.scrambled && a && !GN.isValidScramble(a, it.scrambled)) err(`${q}.scrambled`, `${n}: the scramble must use exactly the word's letters and not spell it. Clear it to shuffle automatically.`);
              break;
            }
            case "quiz": {
              if (blankText(it.q)) err(`${q}.q`, `${n}: the ${(r.noun || "question").toLowerCase()} is empty.`);
              const opts = (it.options && it.options.length ? it.options : r.options) || [];
              if (r.choices) {
                if (opts.length < 2) err(`${q}.options`, `${n}: give at least two choices, one per line.`);
                const c = Number(it.correct);
                if (!(Number.isInteger(c) && c >= 1 && c <= opts.length)) err(`${q}.correct`, `${n}: say which choice is right (a number from 1 to ${Math.max(2, opts.length)}).`);
              } else if (blankText(it.a)) err(`${q}.a`, `${n}: the answer is empty.`);
              break;
            }
            case "mini":
              if (blankText(it.name)) err(`${q}.name`, `${n}: the challenge needs a name.`);
              if (blankText(it.text)) err(`${q}.text`, `${n}: explain how it's played.`);
              break;
            case "category":
              if (blankText(it)) err(q, `${n}: the category is empty.`);
              break;
            case "tiebreak":
              if (blankText(it.q)) err(`${q}.q`, `${n}: the question is empty.`);
              if (blankText(it.a)) err(`${q}.a`, `${n}: the answer is empty.`);
              if (typeof it.value !== "number" || !Number.isFinite(it.value)) err(`${q}.value`, `${n}: the answer as a number is needed to find the closest guess.`);
              break;
          }
        });
      });
      return errors;
    },

    /* Tidy a pack: trim text, drop empty lines, and make sure every round the show
       needs is there (a file missing a round gets the built-in one). */
    normalize(input) {
      const base = GN.defaultPack;
      const pack = clone(input);
      const trim = (v) => (typeof v === "string" ? v.trim() : v);
      pack.id = pack.id || "pack-" + Date.now().toString(36);
      ["title", "tagline", "strapline"].forEach((k) => { pack[k] = trim(pack[k] != null ? pack[k] : base[k]); });
      pack.houseRules = (pack.houseRules || base.houseRules).map(trim).filter(Boolean);
      pack.rules = { ...base.rules, ...(pack.rules || {}) };
      Object.keys(pack.rules).forEach((k) => { pack.rules[k] = Math.max(0, Math.min(999, Math.round(Number(pack.rules[k]) || 0))); });
      pack.rounds = base.rounds.map((b) => {
        // Match rounds by id; older files without ids match by kind (first of each kind only).
        const firstOfKind = base.rounds.find((x) => x.kind === b.kind) === b;
        const r = (input.rounds || []).find((x) => x && x.id === b.id) || (firstOfKind && (input.rounds || []).find((x) => x && x.kind === b.kind && !x.id)) || b;
        const out = { ...clone(b), ...clone(r), id: b.id, kind: b.kind, number: b.number };
        out.name = trim(out.name);
        out.subtitle = trim(out.subtitle || "") || undefined;
        out.howTo = (out.howTo || []).map(trim).filter(Boolean);
        out.items = (out.items || []).map((it) => {
          if (b.kind === "category") return trim(typeof it === "string" ? it : (it && it.name) || "");
          const o = {};
          Object.entries(it || {}).forEach(([k, v]) => { o[k] = Array.isArray(v) ? v.map(trim).filter(Boolean) : trim(v); });
          if (b.kind === "scramble") { o.answer = (o.answer || "").toUpperCase().replace(/\s/g, ""); o.scrambled = (o.scrambled || "").toUpperCase().replace(/\s/g, ""); }
          if (b.kind === "tiebreak" && o.value != null && o.value !== "") o.value = Number(String(o.value).replace(/[,\s]/g, ""));
          if (b.kind === "mini" && !(o.prompts && o.prompts.length)) delete o.prompts;
          if (b.kind === "quiz") {
            if (!(o.options && o.options.length)) delete o.options;
            if (o.correct != null && o.correct !== "") o.correct = Number(o.correct); else delete o.correct;
            if (!o.hint) delete o.hint;
          }
          return o;
        });
        return out;
      });
      return pack;
    },

    /* Switch the show to this pack. Ends a round in progress, and forgets music clips
       only for songs that changed. */
    apply(input, { builtIn = false } = {}) {
      const pack = P.normalize(input);
      const s = S();
      if (s.show.round != null) GN.game.exit();
      // Keep the clips found for songs that are still in the pack.
      const music = {};
      pack.rounds.filter((r) => r.kind === "music").forEach((r) => r.items.forEach((_, i) => {
        const k = GN.music.key(r, i);
        if (s.music[k]) music[k] = s.music[k];
      }));
      // Identical to the built-in pack: treat it as built-in, so later fixes still arrive.
      const isBuiltIn = builtIn || JSON.stringify(pack) === JSON.stringify(P.normalize(GN.defaultPack));
      GN.store.set({ pack, packCustom: !isBuiltIn, rules: { ...pack.rules }, music });
      return pack;
    },
    restoreBuiltIn() { return P.apply(GN.defaultPack, { builtIn: true }); },

    /* The library of packs saved in this browser. */
    list() { return readLib().sort((a, b) => b.savedAt - a.savedAt); },
    get(libId) { return readLib().find((p) => p.libId === libId) || null; },
    save(pack, libId) {
      const list = readLib();
      const id = libId || "lib-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const entry = { libId: id, title: pack.title || "Untitled pack", savedAt: Date.now(), pack: clone(pack) };
      const i = list.findIndex((p) => p.libId === id);
      if (i >= 0) list[i] = entry; else list.push(entry);
      return writeLib(list) ? id : null;
    },
    remove(libId) { writeLib(readLib().filter((p) => p.libId !== libId)); },

    /* Files: a pack file is plain JSON, so it can be backed up or shared. */
    toFile(pack) {
      return JSON.stringify({ format: FORMAT, version: 1, savedAt: new Date().toISOString(), pack: P.normalize(pack) }, null, 2);
    },
    fileName(pack) {
      return `${(pack.title || "games-night").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "games-night"}.gamesnight.json`;
    },
    fromFile(text) {
      let data;
      try { data = JSON.parse(text); } catch (e) { throw new Error("That file isn't a game pack (it couldn't be read)."); }
      const pack = data && data.format === FORMAT ? data.pack : data;
      if (!pack || !Array.isArray(pack.rounds) || !pack.rounds.some((r) => r && r.kind)) throw new Error("That file isn't a game pack (it has no rounds).");
      return P.normalize(pack);
    }
  });

  // A custom pack saved before new games were added gets them (with the built-in questions).
  const s = S();
  if (GN.role !== "remote" && s.packCustom && GN.defaultPack.rounds.some((b) => !s.pack.rounds.some((r) => r.id === b.id))) {
    const pack = P.normalize(s.pack);
    GN.store.set({ pack, rules: { ...pack.rules, ...s.rules } });
  }
})();
