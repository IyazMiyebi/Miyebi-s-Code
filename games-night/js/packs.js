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
    quiz: () => ({ q: "", a: "" }),
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
            case "quiz":
              if (blankText(it.q)) err(`${q}.q`, `${n}: the question is empty.`);
              if (blankText(it.a)) err(`${q}.a`, `${n}: the answer is empty.`);
              break;
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
        const r = (input.rounds || []).find((x) => x && x.kind === b.kind) || b;
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
      const oldMusic = (s.pack.rounds.find((r) => r.kind === "music") || { items: [] }).items;
      const newRound = pack.rounds.find((r) => r.kind === "music");
      const music = {};
      if (newRound) {
        newRound.items.forEach((it, i) => {
          const old = oldMusic[i], k = `${newRound.id}:${i}`;
          if (old && old.title === it.title && old.artist === it.artist && s.music[k]) music[k] = s.music[k];
        });
      }
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
})();
