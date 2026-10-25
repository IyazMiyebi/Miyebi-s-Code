/*
 * Phone remote. The TV window opens a private connection (PeerJS, free, no sign-up) under
 * a short code. A phone that opens the page with ?remote=CODE (scan the QR code in the
 * host controls) gets the host controls: answers, timer, scoring and every round.
 *
 * The laptop stays in charge: the phone sends each button press to the TV window, which
 * runs it exactly as if it had been pressed there, then sends its game state back.
 * Connecting needs the internet; the laptop and keyboard work without it, as always.
 */
(function () {
  const S = () => GN.store.get();
  const PREFIX = "ugn-";
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  // The only things a phone may ask the laptop to do.
  const ALLOWED = {
    game: ["startRound", "goQuestion", "advance", "back", "toStandings", "reveal", "toggleBoard", "exit", "finale",
      "startTimer", "pause", "resume", "togglePause", "restartTimer", "timeUp", "award", "undo", "shuffle", "playClip", "stopClip"],
    mini: ["toggleClock", "startClock", "pauseClock", "resetClock", "startTurn", "mark", "unmark", "setWinner", "guess", "advance"],
    category: ["start", "valid", "out", "bringBack", "skip", "advance"],
    tiebreak: ["setGuess", "setWinner"],
    store: ["set", "reset", "resetScores", "setTeamCount", "updateTeam"],
    music: ["prepare", "search", "choose", "setStart"]
  };

  // Load a library from vendor/ only when it's needed.
  const libs = {};
  function load(src) {
    if (!libs[src]) {
      libs[src] = new Promise((ok, fail) => {
        const el = document.createElement("script");
        el.src = src;
        el.onload = ok;
        el.onerror = () => { delete libs[src]; fail(new Error("Couldn't load " + src)); };
        document.head.appendChild(el);
      });
    }
    return libs[src];
  }

  function newCode() {
    const bytes = new Uint8Array(6);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  }
  function setRemote(patch) {
    const r = S().remote;
    if (Object.keys(patch).every((k) => r[k] === patch[k])) return;
    GN.store.set((s) => ({ remote: { ...s.remote, ...patch } }));
  }

  const R = (GN.remote = {
    link(code) { return `${location.origin}${location.pathname}?remote=${code || S().remote.code}`; },

    // Host controls: switch the phone remote on or off, or make a new code.
    enable() { setRemote({ enabled: true, code: S().remote.code || newCode(), status: "starting" }); },
    disable() { setRemote({ enabled: false, status: "off", phones: 0 }); },
    newCode() { takenTries = 0; setRemote({ code: newCode(), status: "starting", phones: 0 }); },

    // A QR code (SVG) for the phone link.
    async qr(text) {
      await load("vendor/qrcode.js");
      const q = window.qrcode(0, "M");
      q.addData(text);
      q.make();
      return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }
  });

  /* The "Phone remote" box (host controls and Settings): switch on, QR code, status. */
  R.panel = function (el) {
    let key = "", qrFor = "";
    function render() {
      if (!el.isConnected) { unsub(); return; }
      const r = S().remote;
      const k = JSON.stringify(r);
      if (k === key) return;
      key = k;
      const status = {
        starting: "Starting… (the TV window sets this up; keep it open)",
        ready: r.phones ? `✓ ${r.phones === 1 ? "Phone" : r.phones + " phones"} connected` : "Ready: scan the code with your phone’s camera",
        offline: "Can’t reach the internet. Retrying… (the laptop still works on its own)",
        busy: "Another TV window already has the remote. Close it, or make a new code.",
        error: "Couldn’t start the remote. Check the internet, then switch it off and on."
      }[r.status] || "Starting…";
      if (!r.enabled) {
        el.innerHTML = `<p class="host__muted">Run the show from your phone: answers, timer, scoring and every round. Connecting needs the internet.</p>
          <button type="button" class="hbtn hbtn--big" data-rm="on">Turn on phone remote</button>`;
      } else {
        el.innerHTML = `
          <p class="rm-status${r.status === "ready" ? " is-ok" : r.status === "starting" ? "" : " is-warn"}">${status}</p>
          <div class="rm-qr" data-qr aria-label="QR code for the phone remote"></div>
          <p class="rm-code">Code <b>${GN.esc(r.code)}</b></p>
          <p class="rm-link"><a href="${GN.esc(R.link(r.code))}" target="_blank" rel="noopener">${GN.esc(R.link(r.code))}</a></p>
          <div class="hclip__row">
            <button type="button" class="hbtn" data-rm="copy">Copy link</button>
            <button type="button" class="hbtn" data-rm="new">New code</button>
            <button type="button" class="hbtn" data-rm="off">Turn off</button>
          </div>
          <p class="host__muted">Anyone with this code can control the show and see the answers. “New code” disconnects every phone.</p>`;
        const box = el.querySelector("[data-qr]");
        const link = R.link(r.code);
        R.qr(link).then((svg) => { qrFor = link; box.innerHTML = svg; }).catch(() => { box.textContent = "QR code unavailable: type the link instead."; });
      }
    }
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-rm]");
      if (!b) return;
      const a = b.dataset.rm;
      if (a === "on") R.enable();
      if (a === "off") R.disable();
      if (a === "new") R.newCode();
      if (a === "copy") {
        const link = R.link();
        (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(
          () => GN.ui.toast("Link copied."),
          () => GN.ui.toast(link, 10000));
      }
    });
    const unsub = GN.store.subscribe(render);
    render();
  };

  /* ---------- The laptop side (runs in the TV window) ---------- */
  let peer = null, peerCode = "", conns = new Set(), sendTimer = 0, retry = 0, takenTries = 0;

  function sendState() {
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => {
      const msg = { type: "state", state: S(), now: Date.now() };
      conns.forEach((c) => { try { if (c.open) c.send(msg); } catch (e) { /* ignore */ } });
    }, 30);
  }

  function handle(conn, msg) {
    if (!msg || typeof msg !== "object") return;
    conn._seen = Date.now();
    if (msg.type === "ping") return;
    if (msg.type === "hello") { sendState(); return; }
    if (msg.type !== "call") return;
    const ok = ALLOWED[msg.ns] && ALLOWED[msg.ns].includes(msg.fn);
    const target = { game: GN.game, mini: GN.mini, category: GN.category, tiebreak: GN.tiebreak, store: GN.store, music: GN.music }[msg.ns];
    let result;
    try {
      result = ok ? target[msg.fn](...(Array.isArray(msg.args) ? msg.args : [])) : undefined;
    } catch (e) {
      result = undefined;
    }
    Promise.resolve(result).catch(() => undefined).then((value) => {
      const v = ["boolean", "number", "string"].includes(typeof value) ? value : null;
      try { conn.send({ type: "ack", id: msg.id, ok, value: v }); } catch (e) { /* ignore */ }
    });
  }

  let startingFor = "";
  async function startHub() {
    const r = S().remote;
    if (peer && peerCode === r.code && !peer.destroyed) return;
    if (startingFor === r.code) return; // already on its way (the status change below calls back here)
    stopHub();
    startingFor = peerCode = r.code;
    setRemote({ status: "starting" });
    try { await load("vendor/peerjs.min.js"); } catch (e) { startingFor = ""; setRemote({ status: "error" }); return; }
    startingFor = "";
    if (!S().remote.enabled || S().remote.code !== peerCode) return;
    const me = (peer = new window.Peer(PREFIX + peerCode, { debug: 0 }));
    const mine = () => peer === me; // ignore events from a hub we've since closed
    peer.on("open", () => { if (!mine()) return; retry = 0; takenTries = 0; setRemote({ status: "ready" }); });
    peer.on("connection", (conn) => {
      conn.on("open", () => {
        if (!mine()) return;
        conn._seen = Date.now();
        conns.add(conn);
        setRemote({ phones: conns.size });
        sendState();
      });
      conn.on("data", (msg) => handle(conn, msg));
      const gone = () => { conns.delete(conn); setRemote({ phones: conns.size }); };
      conn.on("close", gone);
      conn.on("error", gone);
    });
    // Lost touch with the connection service: keep trying (phones already joined stay joined).
    peer.on("disconnected", () => {
      if (!mine() || peer.destroyed) return;
      setRemote({ status: "offline" });
      setTimeout(() => { if (peer && !peer.destroyed && peer.disconnected) peer.reconnect(); }, Math.min(15000, 2000 * ++retry));
    });
    peer.on("error", (err) => {
      if (!mine()) return;
      if (err.type === "unavailable-id") {
        // Right after a reload the service still remembers this TV for a few seconds:
        // keep trying for about a minute before saying another window has the code.
        const code = peerCode;
        if (++takenTries > 12) { setRemote({ status: "busy" }); return; }
        setRemote({ status: "starting" });
        setTimeout(() => { if (S().remote.enabled && S().remote.code === code) { stopHub(); startHub(); } }, 5000);
      } else if (["network", "server-error", "socket-error", "socket-closed"].includes(err.type)) {
        setRemote({ status: "offline" });
        const code = peerCode;
        setTimeout(() => { if (S().remote.enabled && S().remote.code === code) { stopHub(); startHub(); } }, Math.min(20000, 3000 * ++retry));
      }
    });
  }
  function stopHub() {
    conns.forEach((c) => { try { c.close(); } catch (e) { /* ignore */ } });
    conns.clear();
    const p = peer;
    peer = null;
    peerCode = "";
    if (p) { try { p.destroy(); } catch (e) { /* ignore */ } }
  }
  // A phone that has gone quiet (closed, or out of range) no longer counts as connected.
  setInterval(() => {
    let dropped = false;
    conns.forEach((c) => { if (Date.now() - (c._seen || 0) > 15000) { conns.delete(c); dropped = true; try { c.close(); } catch (e) { /* ignore */ } } });
    if (dropped) setRemote({ phones: conns.size });
  }, 5000);

  if (GN.role === "show") {
    // Let go of the code as the page closes or reloads, so it can be used again at once.
    window.addEventListener("pagehide", stopHub);
    GN.store.subscribe((s, prev) => {
      const r = s.remote, p = prev && prev.remote;
      if (r.enabled && (!p || !p.enabled || p.code !== r.code || !peer)) startHub();
      if (!r.enabled && peer) stopHub();
      if (conns.size) sendState();
    });
    // Switched on last time: start again when the page opens.
    window.addEventListener("load", () => { if (S().remote.enabled) startHub(); });
  }

  /* ---------- The phone side ---------- */
  if (GN.role !== "remote") return;

  let conn = null, phonePeer = null, calls = 0, waiting = new Map(), started = false, wake = null, backoff = 0, pingTimer = 0;

  // Every button on the phone goes to the laptop instead of running here.
  function call(ns, fn, args) {
    return new Promise((ok) => {
      if (!conn || !conn.open) { banner("Not connected to the laptop yet…"); ok(undefined); return; }
      const id = ++calls;
      waiting.set(id, ok);
      setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); ok(undefined); } }, 15000);
      try { conn.send({ type: "call", id, ns, fn, args }); } catch (e) { waiting.delete(id); ok(undefined); }
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* ignore */ } }
    });
  }
  const targets = { game: GN.game, mini: GN.mini, category: GN.category, tiebreak: GN.tiebreak, store: GN.store, music: GN.music };
  Object.entries(ALLOWED).forEach(([ns, fns]) => {
    fns.forEach((fn) => {
      if (ns === "store" && fn === "set") return; // below
      targets[ns][fn] = (...args) => call(ns, fn, args);
    });
  });
  // Changes worked out from the phone's copy of the game, then sent as plain values.
  GN.store.set = (patch) => call("store", "set", [typeof patch === "function" ? patch(S()) : patch]);

  function screen(html) { document.getElementById("stage").innerHTML = `<div class="rm">${html}</div>`; }
  function banner(text) {
    let el = document.querySelector(".rm-banner");
    if (!text) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.className = "rm-banner"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = text;
  }
  async function keepAwake() {
    try { if ("wakeLock" in navigator && !wake && document.visibilityState === "visible") { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) { /* not allowed */ }
  }

  function connect() {
    if (conn && conn.open) return;
    banner(started ? "Reconnecting to the laptop…" : "");
    const target = PREFIX + GN.remoteCode;
    const open = () => {
      conn = phonePeer.connect(target, { reliable: true });
      const timer = setTimeout(() => { if (!conn.open) fail("timeout"); }, 12000);
      conn.on("open", () => { clearTimeout(timer); backoff = 0; banner(""); conn.send({ type: "hello" }); keepAwake(); });
      clearInterval(pingTimer);
      pingTimer = setInterval(() => { try { if (conn && conn.open) conn.send({ type: "ping" }); } catch (e) { /* ignore */ } }, 5000);
      conn.on("data", (msg) => {
        if (msg && msg.type === "state") {
          const offset = msg.now - Date.now();
          if (Math.abs(offset - GN.clockOffset) > 150) GN.clockOffset = offset;
          GN.store._replace(msg.state);
          if (!started) { started = true; GN.host.start(); }
        } else if (msg && msg.type === "ack" && waiting.has(msg.id)) {
          waiting.get(msg.id)(msg.value);
          waiting.delete(msg.id);
        }
      });
      conn.on("close", () => fail("closed"));
      conn.on("error", () => fail("error"));
    };
    if (phonePeer && !phonePeer.destroyed && phonePeer.open) return open();
    if (phonePeer) { try { phonePeer.destroy(); } catch (e) { /* ignore */ } }
    phonePeer = new window.Peer({ debug: 0 });
    phonePeer.on("open", open);
    phonePeer.on("error", (err) => fail(err.type));
  }
  let retryTimer = 0;
  function fail(why) {
    if ((conn && conn.open) || retryTimer) return;
    const wait = Math.min(15000, 1500 * 2 ** backoff++);
    const msg = why === "peer-unavailable"
      ? "Can’t find the show. Check the TV window is open with the phone remote switched on."
      : "Can’t reach the laptop. Check both are online.";
    if (!started) {
      screen(`<p class="eyebrow">Phone remote</p><h1 class="rm__title">Connecting…</h1><p class="rm__msg">${msg} Trying again in ${Math.round(wait / 1000)} seconds.</p>
        <button class="btn" type="button" onclick="location.reload()">Try again now</button>`);
    } else banner(msg + " Retrying…");
    retryTimer = setTimeout(() => { retryTimer = 0; connect(); }, wait);
  }

  GN.remote.startPhone = async function () {
    document.body.classList.add("is-host", "is-remote");
    document.title = "Phone remote · Games Night";
    screen(`<p class="eyebrow">Phone remote</p><h1 class="rm__title">Connecting to the show…</h1>
      <p class="rm__msg">Code <b>${GN.esc(GN.remoteCode)}</b>. Keep the TV window open on the laptop.</p>`);
    try { await load("vendor/peerjs.min.js"); } catch (e) {
      screen(`<h1 class="rm__title">No internet</h1><p class="rm__msg">The phone remote needs the internet to connect. The laptop still works on its own.</p>`);
      return;
    }
    connect();
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { keepAwake(); if (!conn || !conn.open) connect(); } });
    window.addEventListener("online", () => { if (!conn || !conn.open) connect(); });
    // Say goodbye when the phone page closes, so the laptop knows straight away.
    window.addEventListener("pagehide", () => { try { conn && conn.close(); phonePeer && phonePeer.destroy(); } catch (e) { /* ignore */ } });
  };
})();
