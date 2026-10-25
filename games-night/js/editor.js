/*
 * The content editor: the page opened with #edit on the end. Change the title, house
 * rules, every round's questions, and points and timers; then use the pack for the show,
 * save it in this browser, or download it as a file. Unsaved edits are kept as you type.
 */
(function () {
  const esc = GN.esc;
  const DRAFT = "gn.draft.v1";
  const P = () => GN.packs;
  const S = () => GN.store.get();

  const KIND_LABEL = { music: "songs", scramble: "words", quiz: "questions", mini: "challenges", category: "categories", tiebreak: "questions" };
  const ADD_LABEL = { music: "Add a song", scramble: "Add a word", quiz: "Add a question", mini: "Add a challenge", category: "Add a category", tiebreak: "Add a backup question" };
  const MODES = [
    ["turns", "Race, one team at a time"],
    ["race", "Race, all teams at once"],
    ["last-standing", "Last one standing"],
    ["memory", "Memory tray (look, then write)"]
  ];
  const modeOf = (it) => (it.mode === "memory" ? "memory" : it.mode === "last-standing" ? "last-standing" : it.turns ? "turns" : "race");

  let draft = null, libId = null, root = null, errors = [], validateTimer = 0;

  /* ---------- Reading and writing values by their path, e.g. "rounds.2.items.3.q" ---------- */
  function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj); }
  function setPath(obj, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.reduce((o, k) => o[k], obj);
    parent[last] = value;
  }
  const idFor = (path) => "f-" + path.replace(/\./g, "-");

  function saveDraft() {
    try { localStorage.setItem(DRAFT, JSON.stringify({ pack: draft, libId, at: Date.now() })); } catch (e) { /* ignore */ }
  }
  const same = (a, b) => JSON.stringify(P().normalize(a)) === JSON.stringify(P().normalize(b));

  /* ---------- Form pieces ---------- */
  function input(path, label, { type = "text", wide = false, area = false, lines = false, placeholder = "", hint = "" } = {}) {
    let v = getPath(draft, path);
    if (lines) v = (v || []).join("\n");
    if (v == null) v = "";
    const id = idFor(path);
    const attrs = `id="${id}" data-path="${path}" ${lines ? 'data-lines="1"' : ""} ${type === "number" ? 'data-number="1" inputmode="decimal"' : ""} placeholder="${esc(placeholder)}"`;
    return `<label class="ed-field${wide ? " ed-field--wide" : ""}" for="${id}"><span class="ed-label">${esc(label)}</span>
      ${area || lines ? `<textarea ${attrs} rows="${lines ? Math.max(2, String(v).split("\n").length) : 2}">${esc(v)}</textarea>` : `<input ${attrs} type="text" value="${esc(v)}">`}
      ${hint ? `<span class="ed-hint">${hint}</span>` : ""}</label>`;
  }

  function itemFields(r, i, it, j) {
    const p = `rounds.${i}.items.${j}`;
    switch (r.kind) {
      case "music":
        return input(`${p}.title`, "Song title") + input(`${p}.artist`, "Artist");
      case "scramble": {
        const st = scrambleStatus(it);
        return input(`${p}.answer`, "Word") + input(`${p}.scrambled`, "Scrambled letters", { placeholder: "Leave empty to shuffle automatically" }) +
          `<div class="ed-scr"><span class="ed-scr__st ${st.cls}" data-scr="${i}-${j}">${st.text}</span>
            <button type="button" class="hbtn" data-ed="shuffle" data-i="${i}" data-j="${j}">Shuffle</button></div>`;
      }
      case "quiz":
        return input(`${p}.q`, "Question", { area: true, wide: true }) + input(`${p}.a`, "Answer (only the host sees it until the reveal)", { wide: true });
      case "mini":
        return input(`${p}.name`, "Challenge name") +
          `<label class="ed-field" for="${idFor(p + ".mode")}"><span class="ed-label">How it's played</span>
            <select id="${idFor(p + ".mode")}" data-mode="${p}">${MODES.map(([v, l]) => `<option value="${v}" ${modeOf(it) === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>` +
          input(`${p}.text`, "Rules (shown on the TV)", { area: true, wide: true }) +
          input(`${p}.note`, "Small print (props, safety)", { wide: true }) +
          (modeOf(it) !== "memory" && modeOf(it) !== "last-standing"
            ? input(`${p}.prompts`, "Secret prompts, one per line (optional; shown only to the host, like charades)", { lines: true, wide: true }) : "");
      case "category":
        return input(p, "Category", { wide: true });
      case "tiebreak":
        return input(`${p}.q`, "Question", { area: true, wide: true }) + input(`${p}.a`, "Answer as shown") +
          input(`${p}.value`, "Answer as a number", { type: "number", hint: "Used to rank the guesses." });
    }
    return "";
  }

  function scrambleStatus(it) {
    const a = (it.answer || "").replace(/\s/g, "");
    if (!a) return { cls: "", text: "" };
    if (!it.scrambled) return { cls: "", text: "Will be shuffled automatically." };
    return GN.isValidScramble(a, it.scrambled) ? { cls: "is-ok", text: "✓ Good scramble" } : { cls: "is-bad", text: "✗ Must use the same letters and not spell the word" };
  }

  function roundHTML(r, i) {
    const n = r.items.length;
    return `
      <section class="ed-round" id="round-${i}" aria-labelledby="round-h-${i}">
        <header class="ed-round__head">
          <p class="eyebrow">${r.number ? "Round " + r.number : "Extra time"}</p>
          <h2 class="ed-round__h" id="round-h-${i}">${esc(r.name || "Untitled round")}</h2>
          <span class="ed-count">${n} ${KIND_LABEL[r.kind]}</span>
        </header>
        <div class="ed-grid">
          ${input(`rounds.${i}.name`, "Round name")}
          ${r.kind === "scramble" ? input(`rounds.${i}.subtitle`, "Subtitle") : ""}
          ${input(`rounds.${i}.howTo`, "Rules on the round's intro screen, one per line", { lines: true, wide: true })}
        </div>
        <ol class="ed-items" data-items="${i}">
          ${r.items.map((it, j) => `
            <li class="ed-item" data-item="${i}-${j}">
              <div class="ed-item__n">${j + 1}</div>
              <div class="ed-grid">${itemFields(r, i, it, j)}</div>
              <div class="ed-item__tools">
                <button type="button" class="hbtn" data-ed="up" data-i="${i}" data-j="${j}" ${j === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
                <button type="button" class="hbtn" data-ed="down" data-i="${i}" data-j="${j}" ${j === n - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
                <button type="button" class="hbtn" data-ed="remove" data-i="${i}" data-j="${j}">Remove</button>
              </div>
            </li>`).join("")}
        </ol>
        <button type="button" class="hbtn" data-ed="add" data-i="${i}">+ ${ADD_LABEL[r.kind]}</button>
      </section>`;
  }

  function rulesHTML() {
    const { POINTS, TIMERS } = GN.settings.FIELDS;
    const row = ([k, label], unit) => `<label class="ed-rule" for="${idFor("rules." + k)}"><span>${label}</span>
      <span class="set-num"><input id="${idFor("rules." + k)}" type="number" min="0" max="999" step="1" inputmode="numeric" data-path="rules.${k}" data-number="1" value="${draft.rules[k]}"><small>${unit}</small></span></label>`;
    return `<section class="ed-round" id="round-rules"><header class="ed-round__head"><p class="eyebrow">Scoring</p><h2 class="ed-round__h">Points and timers</h2></header>
      <div class="ed-rules"><div>${POINTS.map((f) => row(f, "pts")).join("")}</div><div>${TIMERS.map((f) => row(f, "sec")).join("")}</div></div></section>`;
  }

  function libraryHTML() {
    const list = P().list();
    if (!list.length) return `<p class="host__muted">No packs saved in this browser yet. “Save to this browser” keeps a copy here.</p>`;
    return `<ul class="ed-lib">${list.map((e) => `
      <li><span class="ed-lib__t">${esc(e.title)}${e.libId === libId ? " <em>(editing)</em>" : ""}</span>
        <span class="ed-lib__d">${new Date(e.savedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
        <button type="button" class="hbtn" data-ed="open-lib" data-lib="${e.libId}">Open</button>
        <button type="button" class="hbtn" data-ed="del-lib" data-lib="${e.libId}">Delete</button></li>`).join("")}</ul>`;
  }

  function render() {
    const y = window.scrollY;
    root.innerHTML = `
      <div class="ed">
        <header class="ed-top">
          <div class="ed-top__title"><p class="eyebrow">Content editor</p><h1 class="ed-h">${esc(draft.title || "Untitled pack")}</h1>
            <p class="ed-status" data-status></p></div>
          <div class="ed-actions">
            <button type="button" class="btn" data-ed="use">Use this pack for the show</button>
            <button type="button" class="hbtn" data-ed="save">Save to this browser</button>
            <button type="button" class="hbtn" data-ed="download">Download file</button>
            <label class="hbtn ed-file">Open file…<input type="file" accept=".json,application/json" data-ed-file hidden></label>
          </div>
          <div class="ed-confirm" data-confirm hidden></div>
        </header>
        <nav class="ed-nav" aria-label="Sections">
          <a href="#round-show">Show</a>${draft.rounds.map((r, i) => `<a href="#round-${i}">${esc(r.name || "Round")}</a>`).join("")}<a href="#round-rules">Points</a><a href="#round-packs">Packs</a>
        </nav>
        <div class="ed-problems" data-problems hidden></div>
        <section class="ed-round" id="round-show"><header class="ed-round__head"><p class="eyebrow">The show</p><h2 class="ed-round__h">Title and house rules</h2></header>
          <div class="ed-grid">
            ${input("title", "Show title")}
            ${input("tagline", "Line above the title")}
            ${input("strapline", "Line below the title")}
            ${input("houseRules", "House rules, one per line", { lines: true, wide: true })}
          </div>
        </section>
        ${draft.rounds.map(roundHTML).join("")}
        ${rulesHTML()}
        <section class="ed-round" id="round-packs"><header class="ed-round__head"><p class="eyebrow">Game packs</p><h2 class="ed-round__h">Saved in this browser</h2></header>
          <div data-lib>${libraryHTML()}</div>
          <div class="hclip__row">
            <button type="button" class="hbtn" data-ed="builtin">Load the original questions</button>
            <button type="button" class="hbtn" data-ed="discard">Discard my changes</button>
          </div>
          <p class="host__muted">Packs saved here stay in this browser on this laptop. Download a file to keep a backup or use the pack on another computer.</p>
        </section>
      </div>`;
    window.scrollTo(0, y);
    validate(true);
  }

  /* ---------- Checks and status ---------- */
  function validate(now) {
    clearTimeout(validateTimer);
    const run = () => {
      errors = P().validate(draft);
      root.querySelectorAll(".is-bad-field").forEach((el) => el.classList.remove("is-bad-field"));
      errors.forEach((e) => { const el = document.getElementById(idFor(e.path)); if (el) el.classList.add("is-bad-field"); });
      const box = root.querySelector("[data-problems]");
      box.hidden = !errors.length;
      box.innerHTML = errors.length ? `<p class="ed-problems__h">${errors.length === 1 ? "1 thing to fix" : errors.length + " things to fix"} before this pack can be used</p>
        <ul>${errors.slice(0, 12).map((e) => `<li><a href="#${idFor(e.path)}" data-goto="${idFor(e.path)}">${esc(e.msg)}</a></li>`).join("")}</ul>${errors.length > 12 ? `<p>…and ${errors.length - 12} more.</p>` : ""}` : "";
      status();
    };
    if (now) run(); else validateTimer = setTimeout(run, 200);
  }
  function status() {
    const el = root.querySelector("[data-status]");
    if (!el) return;
    const live = same(draft, S().pack);
    el.textContent = live ? "This is the pack the show is using." : "Changes not used yet: press “Use this pack for the show” to send them to the TV.";
    el.classList.toggle("is-dirty", !live);
    root.querySelector(".ed-h").textContent = draft.title || "Untitled pack";
  }
  function confirmBox(text, yes, onYes) {
    const box = root.querySelector("[data-confirm]");
    box.hidden = false;
    box.innerHTML = `<p>${text}</p><div class="hclip__row"><button type="button" class="btn btn--small btn--danger" data-yes>${yes}</button><button type="button" class="hbtn" data-no>Cancel</button></div>`;
    box.querySelector("[data-yes]").onclick = () => { box.hidden = true; onYes(); };
    box.querySelector("[data-no]").onclick = () => { box.hidden = true; };
    box.querySelector("[data-yes]").focus();
  }
  function load(pack, id) {
    draft = P().clone(pack);
    libId = id || null;
    saveDraft();
    render();
  }

  /* ---------- Actions ---------- */
  function use() {
    validate(true);
    if (errors.length) {
      GN.ui.toast("Fix the things listed at the top first.");
      root.querySelector("[data-problems]").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const go = () => { const p = P().apply(draft); draft = P().clone(p); saveDraft(); render(); GN.ui.toast("Done: the TV now uses this pack."); };
    if (S().show.round != null) confirmBox("A round is being played right now. Using this pack ends it (scores are kept) and returns the TV to the running order.", "Use it now", go);
    else go();
  }
  function download() {
    const blob = new Blob([P().toFile(draft)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = P().fileName(draft);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function onClick(e) {
    const go = e.target.closest("[data-goto]");
    if (go) { e.preventDefault(); const el = document.getElementById(go.dataset.goto); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus({ preventScroll: true }); } return; }
    const b = e.target.closest("[data-ed]");
    if (!b) return;
    const a = b.dataset.ed, i = Number(b.dataset.i), j = Number(b.dataset.j);
    const items = i >= 0 && draft.rounds[i] ? draft.rounds[i].items : null;
    if (a === "add") {
      items.push(P().BLANK[draft.rounds[i].kind]());
      saveDraft(); render();
      const el = root.querySelector(`[data-item="${i}-${items.length - 1}"] input, [data-item="${i}-${items.length - 1}"] textarea`);
      if (el) { el.scrollIntoView({ block: "center" }); el.focus(); }
    }
    if (a === "up" || a === "down") {
      const k = a === "up" ? j - 1 : j + 1;
      [items[j], items[k]] = [items[k], items[j]];
      saveDraft(); render();
      const btn = root.querySelector(`[data-ed="${a}"][data-i="${i}"][data-j="${k}"]`);
      if (btn && !btn.disabled) btn.focus();
    }
    if (a === "remove") {
      // Two taps: "Remove" becomes "Sure?" for a few seconds.
      if (!b.classList.contains("is-armed")) {
        b.classList.add("is-armed"); b.textContent = "Sure? Tap again";
        setTimeout(() => { if (b.isConnected) { b.classList.remove("is-armed"); b.textContent = "Remove"; } }, 3000);
        return;
      }
      items.splice(j, 1);
      saveDraft(); render();
    }
    if (a === "shuffle") {
      const it = items[j];
      const word = (it.answer || "").toUpperCase().replace(/\s/g, "");
      if (!word || new Set(word).size < 2) { GN.ui.toast("Type the word first."); return; }
      let s = it.scrambled, tries = 0;
      do { s = GN.scramble(word, "", 1 + Math.floor(Math.random() * 9999)); } while (s === it.scrambled && tries++ < 20);
      it.scrambled = s;
      saveDraft();
      const f = document.getElementById(idFor(`rounds.${i}.items.${j}.scrambled`));
      if (f) f.value = s;
      updateScramble(i, j);
      validate();
    }
    if (a === "use") use();
    if (a === "save") {
      const id = P().save(P().normalize(draft), libId);
      if (id) { libId = id; saveDraft(); root.querySelector("[data-lib]").innerHTML = libraryHTML(); GN.ui.toast(`Saved “${draft.title}” in this browser.`); }
      else GN.ui.toast("Couldn't save: this browser's storage is full or blocked. Download a file instead.");
    }
    if (a === "download") download();
    if (a === "open-lib") {
      const entry = P().get(b.dataset.lib);
      if (!entry) return;
      const open = () => load(entry.pack, entry.libId);
      if (!same(draft, S().pack)) confirmBox(`Open “${esc(entry.title)}”? Changes you haven't used or saved will be lost.`, "Open it", open); else open();
    }
    if (a === "del-lib") {
      const entry = P().get(b.dataset.lib);
      confirmBox(`Delete “${esc(entry ? entry.title : "this pack")}” from this browser? This can't be undone.`, "Delete", () => {
        P().remove(b.dataset.lib);
        if (libId === b.dataset.lib) libId = null;
        root.querySelector("[data-lib]").innerHTML = libraryHTML();
      });
    }
    if (a === "builtin") confirmBox("Load the original questions into the editor? Your changes here will be replaced (packs you saved are kept). Then press “Use this pack for the show”.", "Load them", () => load(GN.defaultPack, null));
    if (a === "discard") confirmBox("Throw away your changes and go back to the pack the show is using?", "Discard", () => load(S().pack, libId));
  }

  function updateScramble(i, j) {
    const st = scrambleStatus(draft.rounds[i].items[j]);
    const el = root.querySelector(`[data-scr="${i}-${j}"]`);
    if (el) { el.textContent = st.text; el.className = "ed-scr__st " + st.cls; }
  }

  function onInput(e) {
    const t = e.target;
    if (t.dataset.mode) {
      const it = getPath(draft, t.dataset.mode);
      if (t.value === "memory" || t.value === "last-standing") { it.mode = t.value; delete it.turns; }
      else { it.mode = "stopwatch"; it.turns = t.value === "turns"; }
      saveDraft(); render();
      return;
    }
    const path = t.dataset.path;
    if (!path) return;
    let v = t.value;
    if (t.dataset.lines) v = v.split("\n").map((x) => x.trim()).filter(Boolean);
    else if (t.dataset.number) { const n = Number(String(v).replace(/[,\s]/g, "")); v = v.trim() === "" || !Number.isFinite(n) ? null : n; }
    if (path.endsWith(".answer") || path.endsWith(".scrambled")) v = v.toUpperCase();
    setPath(draft, path, path.startsWith("rules.") ? Math.max(0, Math.min(999, Math.round(v || 0))) : v);
    saveDraft();
    const m = path.match(/^rounds\.(\d+)\.items\.(\d+)\.(answer|scrambled)$/);
    if (m) updateScramble(Number(m[1]), Number(m[2]));
    const nameMatch = path.match(/^rounds\.(\d+)\.name$/);
    if (nameMatch) { const h = root.querySelector(`#round-h-${nameMatch[1]}`); if (h) h.textContent = v || "Untitled round"; }
    validate();
  }

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const pack = P().fromFile(await file.text());
      const open = () => { load(pack, null); GN.ui.toast(`Opened “${pack.title}”. Press “Use this pack for the show” to send it to the TV.`); };
      if (!same(draft, S().pack)) confirmBox(`Open “${esc(pack.title)}” from the file? Changes you haven't used or saved will be lost.`, "Open it", open); else open();
    } catch (err) {
      GN.ui.toast(err.message, 8000);
    }
  }

  GN.editor = {
    start() {
      document.body.classList.add("is-host", "is-editor");
      document.title = "Edit questions · Games Night";
      root = document.getElementById("stage");
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(DRAFT)); } catch (e) { /* ignore */ }
      // Carry on with unsaved edits from last time, if there are any.
      if (saved && saved.pack && Array.isArray(saved.pack.rounds) && !same(saved.pack, S().pack)) {
        draft = saved.pack; libId = saved.libId || null;
        render();
        GN.ui.toast("Your unsaved edits from last time are back.");
      } else load(S().pack, saved && saved.libId);
      root.addEventListener("click", onClick);
      root.addEventListener("input", onInput);
      root.addEventListener("change", (e) => { if (e.target.matches("[data-ed-file]")) onFile(e); });
      // The show changed pack somewhere else (another editor, or the original restored).
      GN.store.subscribe((s, prev) => { if (prev && s.pack !== prev.pack) status(); });
    }
  };
})();
