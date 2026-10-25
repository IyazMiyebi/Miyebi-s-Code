/*
 * Game state: teams, scores, settings and where we are in the show.
 * Saved in the browser (localStorage) so a refresh mid-game loses nothing.
 */
(function () {
  const KEY = "gn.state.v1";

  GN.TEAM_COLOURS = [
    { id: "ember", name: "Ember Red", hex: "#ff4a1c" },
    { id: "iris", name: "Iris Violet", hex: "#8b5cff" },
    { id: "acid", name: "Acid Lime", hex: "#c6ff3d" },
    { id: "ice", name: "Ice Blue", hex: "#5ce1ff" }
  ];
  const DEFAULT_NAMES = ["Team Ember", "Team Iris", "Team Acid", "Team Ice"];

  // Escape text before putting it into HTML (team names and pack content are typed by people).
  GN.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  GN.colourHex = (id) => (GN.TEAM_COLOURS.find((c) => c.id === id) || GN.TEAM_COLOURS[0]).hex;

  function makeTeam(i) {
    return {
      id: "t" + (i + 1),
      name: DEFAULT_NAMES[i],
      colour: GN.TEAM_COLOURS[i].id,
      captain: "",
      players: "",
      score: 0
    };
  }

  function fresh() {
    return {
      version: 1,
      pack: GN.defaultPack,
      rules: { ...GN.defaultPack.rules },
      teams: [makeTeam(0), makeTeam(1)],
      settings: { sound: true, motion: "auto" },
      screen: "title",
      // Where we are in the live show (see js/game.js).
      show: { round: null, item: 0, phase: "intro", timesUp: false, board: false, shuffle: 0,
        clip: { n: 0, stop: 0, item: null, playing: false, played: false } },
      timer: { duration: 0, left: 0, endsAt: null, running: false },
      music: {},    // song clips found for the music round (see js/music.js)
      log: [],      // every score change, newest last, so it can be undone
      played: []    // round ids that reached their standings
    };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && saved.version === 1) {
        const base = fresh();
        return {
          ...base,
          ...saved,
          rules: { ...base.rules, ...saved.rules },
          settings: { ...base.settings, ...saved.settings },
          show: { ...base.show, ...saved.show, clip: { ...base.show.clip, ...(saved.show && saved.show.clip), playing: false } },
          timer: { ...base.timer, ...saved.timer }
        };
      }
    } catch (e) { /* storage blocked or corrupt: start fresh */ }
    return fresh();
  }

  const listeners = new Set();
  let state = load();

  /* The big screen and the host window share one game. Every change is sent to the
     other window straight away (BroadcastChannel), with a localStorage fallback. */
  GN.role = location.hash === "#host" ? "host" : "show";
  let channel = null;
  try { channel = new BroadcastChannel("gn-sync"); } catch (e) { /* older browser */ }
  function receive(next) {
    if (!next || next.version !== 1) return;
    const prev = state;
    state = next;
    listeners.forEach((fn) => fn(state, prev));
  }
  if (channel) channel.onmessage = (e) => receive(e.data);
  else window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) { try { receive(JSON.parse(e.newValue)); } catch (err) { /* ignore */ } }
  });

  GN.store = {
    get: () => state,
    set(patch) {
      const prev = state;
      state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
      try { channel && channel.postMessage(state); } catch (e) { /* ignore */ }
      listeners.forEach((fn) => fn(state, prev));
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset() { const keep = state.settings; state = fresh(); state.settings = keep; GN.store.set({}); },
    // A new game with the same teams: scores, log and progress back to zero.
    resetScores() {
      const base = fresh();
      GN.store.set((s) => ({ teams: s.teams.map((t) => ({ ...t, score: 0 })), log: [], played: [], show: base.show, timer: base.timer }));
    },

    setTeamCount(n) {
      GN.store.set((s) => {
        const teams = s.teams.slice(0, n);
        while (teams.length < n) {
          // Give a new team the first colour nobody is using yet.
          const t = makeTeam(teams.length);
          const used = teams.map((x) => x.colour);
          const free = GN.TEAM_COLOURS.find((c) => !used.includes(c.id));
          t.colour = free.id;
          t.name = "Team " + free.name.split(" ")[0];
          teams.push(t);
        }
        return { teams };
      });
    },
    updateTeam(id, patch) {
      GN.store.set((s) => ({ teams: s.teams.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    }
  };

  /* Motion: honour the device's "reduce motion" setting unless the host overrides it. */
  const mq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  GN.motionOK = () => {
    const m = state.settings.motion;
    if (m === "full") return true;
    if (m === "reduce") return false;
    return !(mq && mq.matches);
  };

  /* Word scramble: keep a stored scramble only if it uses exactly the same letters and
     is not the answer itself; otherwise shuffle until it differs. */
  GN.isValidScramble = (answer, scrambled) => {
    const a = (answer || "").toUpperCase().replace(/\s/g, "");
    const s = (scrambled || "").toUpperCase().replace(/\s/g, "");
    return !!s && s !== a && [...s].sort().join("") === [...a].sort().join("");
  };
  // `variant` 0 is the pack's own scramble; 1, 2, 3… are reshuffles (the host's
  // "shuffle letters" button). Each is the same in every window.
  GN.scramble = (answer, scrambled, variant = 0) => {
    if (!variant && GN.isValidScramble(answer, scrambled)) return scrambled.toUpperCase().replace(/\s/g, "");
    const a = answer.toUpperCase().replace(/\s/g, "");
    if (new Set(a).size < 2) return a; // "AAA" cannot be scrambled
    // Shuffle with a random sequence seeded by the word itself, so the big screen and
    // the host window always show the same scramble.
    let seed = ([...a].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) + variant * 7919) >>> 0;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let s = a;
    while (s === a) {
      const arr = [...a];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      s = arr.join("");
    }
    return s;
  };
})();
