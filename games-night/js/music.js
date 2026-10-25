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
  const key = (round, i) => `${round.id}:${i}`;
  const musicRound = () => S().pack.rounds.find((r) => r.kind === "music");

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

  /* ---------- Playing a clip (big screen only) ---------- */
  let ac = null, gain = null, analyser = null, audio = null, stopTimer = 0, bins = null;

  function graph() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    gain = ac.createGain();
    analyser = ac.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.75;
    bins = new Uint8Array(analyser.frequencyBinCount);
    gain.connect(analyser).connect(ac.destination);
    return true;
  }

  M.player = {
    playing: () => !!(audio && !audio.paused),
    // Play `seconds` of the clip from `start`, fading out at the end. Resolves when it ends.
    async play(opt, start, seconds, { onStart } = {}) {
      M.player.stop(true);
      if (!opt || !graph()) return "missing";
      if (ac.state === "suspended") { try { await ac.resume(); } catch (e) { /* ignore */ } }
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.preload = "auto";
      el.src = await localUrl(opt.url);
      audio = el;
      const src = ac.createMediaElementSource(el);
      src.connect(gain);
      const vol = GN.store.get().settings.sound ? 1 : 0;
      gain.gain.cancelScheduledValues(ac.currentTime);
      gain.gain.setValueAtTime(0.0001, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), ac.currentTime + 0.25);
      await new Promise((ok) => { if (el.readyState >= 1) ok(); else el.addEventListener("loadedmetadata", ok, { once: true }); el.addEventListener("error", ok, { once: true }); });
      if (el.error) return "error";
      try { el.currentTime = Math.min(start || 0, Math.max(0, (el.duration || 30) - 1)); } catch (e) { /* ignore */ }
      try { await el.play(); } catch (e) { return "blocked"; }
      if (audio !== el) return "stopped";
      onStart && onStart();
      return new Promise((done) => {
        const end = () => { clearTimeout(stopTimer); if (audio === el) audio = null; done("ended"); };
        el.addEventListener("ended", end, { once: true });
        el._done = done;
        stopTimer = setTimeout(() => {
          if (audio !== el) return;
          gain.gain.setValueAtTime(gain.gain.value, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
          setTimeout(() => { el.pause(); end(); }, 650);
        }, Math.max(1, seconds) * 1000);
      });
    },
    setVolume(on) {
      if (!gain || !audio) return;
      gain.gain.cancelScheduledValues(ac.currentTime);
      gain.gain.setValueAtTime(on ? 1 : 0.0001, ac.currentTime);
    },
    stop(quiet) {
      clearTimeout(stopTimer);
      if (!audio) return;
      const el = audio;
      audio = null;
      try { el.pause(); } catch (e) { /* ignore */ }
      if (el._done) el._done(quiet ? "replaced" : "stopped");
    },
    // Loudness of a few frequency bands, 0–1, for the sound bars.
    levels(n) {
      if (!analyser || !audio || audio.paused) return null;
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
})();
