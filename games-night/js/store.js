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
      screen: "title"
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
          settings: { ...base.settings, ...saved.settings }
        };
      }
    } catch (e) { /* storage blocked or corrupt: start fresh */ }
    return fresh();
  }

  const listeners = new Set();
  let state = load();

  GN.store = {
    get: () => state,
    set(patch) {
      state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
      listeners.forEach((fn) => fn(state));
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset() { const keep = state.settings; state = fresh(); state.settings = keep; GN.store.set({}); },

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
  GN.scramble = (answer, scrambled) => {
    if (GN.isValidScramble(answer, scrambled)) return scrambled.toUpperCase().replace(/\s/g, "");
    const a = answer.toUpperCase().replace(/\s/g, "");
    if (new Set(a).size < 2) return a; // "AAA" cannot be scrambled
    let s = a;
    while (s === a) {
      const arr = [...a];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      s = arr.join("");
    }
    return s;
  };
})();
