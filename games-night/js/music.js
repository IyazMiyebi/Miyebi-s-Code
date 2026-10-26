/*
 * Music round clips: official 30-second previews from Apple's free iTunes search.
 * Nothing is hosted by us. "Get clips ready" downloads each preview into the browser
 * ("gn-clips" storage), so the round still plays if the Wi-Fi drops on the night.
 *
 * Finding a song needs the internet. If a song can't be found, the host plays it from
 * their own phone or playlist and the round carries on as normal.
 */
(function () {
  const CLIPS = "gn-clips";
  const BAD = /\b(remix|live|on stage|karaoke|instrumental|cover|tribute|acoustic|sped up|slowed|version|edit|mix|8d|lullaby)\b/;

  const norm = (s) => String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[ÿ]/g, "y")
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\s(feat|ft)\.?\s.*$/, " ")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const mainArtist = (a) => String(a).split(/\s+(?:ft\.?|feat\.?|featuring|&|and|x)\s+|,\s*/i)[0];

  const S = () => GN.store.get();
  // Matches are stored per song, so a song is found once whichever round it lands in.
  const key = (round, i) => { const it = round.items[i] || {}; return `song:${norm(it.title)}|${norm(mainArtist(it.artist || ""))}`; };
  // Every song in tonight's music rounds, as one list for "Get clips ready".
  function musicRound() {
    const rounds = (GN.rounds ? GN.rounds() : S().pack.rounds).filter((r) => r.kind === "music");
    if (!rounds.length) return null;
    if (rounds.length === 1) return rounds[0];
    return { ...rounds[0], id: "songs", items: rounds.flatMap((r) => r.items) };
  }

  function setEntry(k, patch) {
    GN.store.set((s) => ({ music: { ...s.music, [k]: { ...(s.music[k] || {}), ...patch } } }));
  }

  // Best matches first: right title, right artist, not a remix or live version.
  function rank(item, results) {
    const title = norm(item.title), artist = norm(mainArtist(item.artist));
    const wantsOdd = BAD.test(norm(item.title));
    return results
      .filter((r) => r.previewUrl)
      .map((r) => {
        const t = norm(r.trackName), a = norm(r.artistName);
        let score = 0;
        if (t === title) score += 4; else if (t.includes(title) || title.includes(t)) score += 2;
        if (a.includes(artist) || artist.includes(a)) score += 3;
        // Check the full names (brackets included) so "Dynamite (Live)" loses to "Dynamite".
        const raw = `${r.trackName} ${r.collectionName}`.toLowerCase();
        if (!wantsOdd && BAD.test(raw)) score -= 3;
        return {
          score,
          id: r.trackId,
          track: r.trackName,
          artist: r.artistName,
          album: r.collectionName,
          url: r.previewUrl,
          art: (r.artworkUrl100 || "").replace(/100x100bb/, "600x600bb")
        };
      })
      .filter((o) => o.score >= 5)
      .sort((x, y) => y.score - x.score)
      .filter((o, i, list) => list.findIndex((p) => p.url === o.url) === i)
      .slice(0, 5);
  }

  async function search(round, i, text) {
    const item = round.items[i], k = key(round, i);
    const term = text || `${item.title} ${mainArtist(item.artist)}`;
    setEntry(k, { status: "searching", term });
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=15&country=GB`);
      if (!res.ok) throw new Error("search " + res.status);
      const data = await res.json();
      const options = rank(item, data.results || []);
      setEntry(k, { status: options.length ? "found" : "none", options, choice: 0, ready: false });
      return options.length > 0;
    } catch (e) {
      setEntry(k, { status: navigator.onLine === false ? "offline" : "error" });
      return false;
    }
  }

  // Save the clip and its cover in the browser so they play without the internet.
  async function download(k) {
    const e = S().music[k];
    const opt = e && e.options && e.options[e.choice || 0];
    if (!opt || !("caches" in window)) return false;
    try {
      const cache = await caches.open(CLIPS);
      for (const url of [opt.url, opt.art].filter(Boolean)) {
        if (await cache.match(url)) continue;
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error("download " + res.status);
        await cache.put(url, res);
      }
      setEntry(k, { ready: true });
      return true;
    } catch (err) {
      setEntry(k, { ready: false });
      return false;
    }
  }

  // A local address for a saved file, or the web address if it isn't saved.
  const objectUrls = new Map();
  async function localUrl(url) {
    if (!url) return "";
    if (objectUrls.has(url)) return objectUrls.get(url);
    try {
      const hit = "caches" in window && (await (await caches.open(CLIPS)).match(url));
      if (hit) {
        const u = URL.createObjectURL(await hit.blob());
        objectUrls.set(url, u);
        return u;
      }
    } catch (e) { /* fall through */ }
    return url;
  }

  let preparing = null;
  const M = (GN.music = {
    key,
    musicRound,
    entry(round, i) { return S().music[key(round, i)] || null; },
    option(round, i) {
      const e = M.entry(round, i);
      return e && e.options && e.options[e.choice || 0] ? e.options[e.choice || 0] : null;
    },
    search,
    // Find every song that hasn't been found yet, then save them all.
    prepare(force) {
      if (preparing && !force) return preparing;
      const round = musicRound();
      if (!round) return Promise.resolve();
      preparing = (async () => {
        for (let i = 0; i < round.items.length; i++) {
          const e = M.entry(round, i);
          if (!e || !e.options || (!e.options.length && force)) await search(round, i, e && e.term);
          if (M.option(round, i) && !(M.entry(round, i) || {}).ready) await download(key(round, i));
        }
      })().finally(() => { preparing = null; });
      return preparing;
    },
    choose(round, i, choice) {
      setEntry(key(round, i), { choice, ready: false });
      return download(key(round, i));
    },
    setStart(round, i, start) { setEntry(key(round, i), { start: Math.max(0, Math.min(25, Math.round(start))) }); },
    summary() {
      const round = musicRound();
      if (!round) return { total: 0, found: 0, ready: 0, missing: [] };
      const list = round.items.map((_, i) => M.entry(round, i) || {});
      return {
        total: list.length,
        found: list.filter((e) => e.options && e.options.length).length,
        ready: list.filter((e) => e.ready).length,
        missing: round.items.filter((_, i) => !(list[i].options && list[i].options.length)).map((it) => it.title)
      };
    },
    localUrl
  });

  /* ---------- Playing a clip ----------
     One audio player is made once and reused for every clip. Phones and tablets (Safari
     especially) only let a player make sound if a tap has started it, so the first tap
     anywhere unlocks it with a moment of silence; after that, clips can play any time.
     Only one clip ever plays: a new Play, Stop or moving on silences the one before,
     even if it was still loading. */
  let ac = null, gain = null, analyser = null, bins = null, gen = 0;
  let el = null;        // the one audio player
  let audio = null;     // the player, while a clip is loading or playing
  let timers = [], pendingDone = null;
  const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

  function graph() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
      gain = ac.createGain();
      analyser = ac.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      bins = new Uint8Array(analyser.frequencyBinCount);
      gain.connect(analyser).connect(ac.destination);
    }
    if (!el) {
      el = new Audio();
      el.crossOrigin = "anonymous";
      el.preload = "auto";
      el.setAttribute("playsinline", "");
      ac.createMediaElementSource(el).connect(gain);
    }
    return true;
  }
  function unlock() {
    if (!graph()) return;
    if (ac.state !== "running") ac.resume().catch(() => {});
    if (!audio && el.paused) {
      try { el.src = SILENCE; const p = el.play(); if (p) p.catch(() => {}); } catch (e) { /* ignore */ }
    }
  }
  ["pointerdown", "touchend", "keydown"].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));

  function finish(why) {
    timers.forEach(clearTimeout);
    timers = [];
    const d = pendingDone;
    pendingDone = null;
    if (d) d(why);
  }

  M.player = {
    playing: () => !!(audio && !el.paused),
    // How many clips are loading or playing right now (only ever 0 or 1).
    count: () => (audio && (!el.paused || el.readyState < 3) ? 1 : 0),
    // Play `seconds` of the clip from `start`, fading out at the end. Resolves when it ends.
    async play(opt, start, seconds, { onStart } = {}) {
      M.player.stop(true);
      if (!opt || !graph()) return "missing";
      const my = ++gen;
      const stale = () => my !== gen;
      audio = el;
      // A window nobody has tapped can't make sound; don't wait for it forever.
      if (ac.state !== "running") await Promise.race([ac.resume().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
      if (stale()) return "replaced";
      if (ac.state !== "running") { audio = null; return "blocked"; }
      const url = await localUrl(opt.url);
      if (stale()) return "replaced";
      el.src = url;
      try { el.load(); } catch (e) { /* ignore */ }
      gain.gain.cancelScheduledValues(ac.currentTime);
      gain.gain.setValueAtTime(0.0001, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(GN.store.get().settings.sound ? 1 : 0.0001, ac.currentTime + 0.25);
      await new Promise((ok) => {
        if (el.readyState >= 1) return ok();
        el.addEventListener("loadedmetadata", ok, { once: true });
        el.addEventListener("error", ok, { once: true });
        setTimeout(ok, 8000);
      });
      if (stale()) return "replaced";
      if (el.error || el.readyState < 1) { audio = null; return "error"; }
      try { el.currentTime = Math.min(start || 0, Math.max(0, (el.duration || 30) - 1)); } catch (e) { /* ignore */ }
      // If the clip hasn't started after 10 seconds, give up rather than wait forever.
      let begun;
      try { begun = await Promise.race([el.play().then(() => true), new Promise((r) => setTimeout(() => r(false), 10000))]); }
      catch (e) { if (stale()) return "replaced"; audio = null; return "blocked"; }
      if (stale()) return "replaced";
      if (!begun) { try { el.pause(); } catch (e) { /* ignore */ } audio = null; return "error"; }
      onStart && onStart();
      return new Promise((done) => {
        pendingDone = done;
        el.addEventListener("ended", () => { if (my === gen) { audio = null; finish("ended"); } }, { once: true });
        // After `seconds`, fade out over 0.6s, then stop.
        timers.push(setTimeout(() => {
          if (my !== gen) return;
          gain.gain.cancelScheduledValues(ac.currentTime);
          gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
          timers.push(setTimeout(() => {
            if (my !== gen) return;
            try { el.pause(); } catch (e) { /* ignore */ }
            audio = null;
            finish("ended");
          }, 650));
        }, Math.max(1, seconds) * 1000));
      });
    },
    setVolume(on) {
      if (!gain || !audio) return;
      gain.gain.cancelScheduledValues(ac.currentTime);
      gain.gain.setValueAtTime(on ? 1 : 0.0001, ac.currentTime);
    },
    // Silence everything: the current clip, or one still loading.
    stop(quiet) {
      gen++;
      if (el && audio) { try { el.pause(); } catch (e) { /* ignore */ } }
      audio = null;
      finish(quiet ? "replaced" : "stopped");
    },
    // Loudness of a few frequency bands, 0–1, for the sound bars. If the clip is playing
    // in the other window, use the levels it sends across.
    levels(n) {
      if (!analyser || !audio || audio.paused) {
        return remote && performance.now() - remote.at < 400 ? remote.lv.slice(0, n) : null;
      }
      analyser.getByteFrequencyData(bins);
      const out = [];
      const per = Math.floor(bins.length * 0.7 / n) || 1;
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < per; j++) sum += bins[i * per + j];
        out.push(sum / per / 255);
      }
      return out;
    }
  };

  /* Send the sound-bar levels to the other window while a clip plays here. */
  let levelsChannel = null, remote = null, sendTimer = 0;
  try { levelsChannel = new BroadcastChannel("gn-levels"); } catch (e) { /* older browser */ }
  if (levelsChannel) levelsChannel.onmessage = (e) => { remote = { lv: e.data, at: performance.now() }; };
  // A plain timer, not animation frames: those pause when this window isn't in front.
  function sendLevels() {
    clearInterval(sendTimer);
    if (!levelsChannel) return;
    sendTimer = setInterval(() => {
      if (!audio || audio.paused) { clearInterval(sendTimer); return; }
      const lv = M.player.levels(9);
      if (lv) levelsChannel.postMessage(lv);
    }, 50);
  }

  /* ---------- Which window plays the clip ----------
     The window where Play was pressed (or Space, or A) plays it: that press is the
     browser's permission to make sound. Sound comes out of the laptop's speakers or the
     TV either way. Every window stops its clip when told to, or when the show moves on. */
  let token = 0;
  M.playHere = async function () {
    const G = GN.game, s = S(), round = G.round();
    if (!round || round.kind !== "music") return;
    const i = s.show.clip.item, opt = M.option(round, i), entry = M.entry(round, i) || {};
    const my = ++token;
    if (!opt) {
      G.clipFailed("missing");
      GN.ui.toast("No clip found for this song. Play it from your phone, then start the timer.");
      return;
    }
    const result = await M.player.play(opt, entry.start || 0, s.rules.musicClipSeconds || 10, {
      onStart: () => { if (my === token) { G.clipStarted(); sendLevels(); } }
    });
    if (my !== token) return;
    if (result === "ended") G.clipEnded();
    else if (result === "blocked") { G.clipFailed("blocked"); GN.ui.toast("This window isn't allowed to make sound yet. Click anywhere in it once, then press Play again.", 8000); }
    else if (result === "error" || result === "missing") { G.clipFailed("error"); GN.ui.toast("That clip wouldn't play. Check the internet, or play the song from your phone."); }
  };
  M.stopHere = function () { token++; M.player.stop(); };

  GN.store.subscribe((s, prev) => {
    if (!prev) return;
    const sh = s.show, ph = prev.show;
    if (sh.clip.stop !== ph.clip.stop) M.stopHere();
    else if (audio && (ph.item !== sh.item || ph.round !== sh.round || !["question", "reveal"].includes(sh.phase))) M.stopHere();
    if (prev.settings.sound !== s.settings.sound) M.player.setVolume(s.settings.sound);
  });

  // Older versions stored matches by position ("music:3"): move them onto their songs.
  if (GN.role !== "remote") {
    const music = S().music, old = Object.keys(music).filter((k) => /^[^:|]+:\d+$/.test(k));
    if (old.length) {
      const next = { ...music };
      old.forEach((k) => {
        const [id, i] = k.split(":");
        const round = S().pack.rounds.find((r) => r.id === id);
        delete next[k];
        if (round && round.items[+i] && !next[key(round, +i)]) next[key(round, +i)] = music[k];
      });
      GN.store.set({ music: next });
    }
  }
})();
