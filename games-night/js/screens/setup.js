/*
 * Pick the games: how many rounds, which game each round is, and how many questions.
 * Ready-made line-ups are one tap away. Changes save straight away, unless a game is
 * already under way: then they wait for a yes, because new games start the scores again.
 */
(function () {
  GN.screens = GN.screens || {};
  const esc = GN.esc;
  const L = () => GN.lineup;

  // Each kind of game has its own colour on this screen.
  const TINT = { music: "var(--neon)", scramble: "var(--iris)", quiz: "var(--ember)", mini: "#c6ff3d", category: "#5ce1ff" };
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  GN.numberWord = (n) => WORDS[n] || String(n);

  GN.screens.setup = {
    label: "Games",
    mount(root, nav) {
      const pack = GN.store.get().pack;
      const games = L().library(pack);
      const hasTiebreak = pack.rounds.some((r) => r.kind === "tiebreak");
      let draft = JSON.parse(JSON.stringify(L().current()));
      let dirty = false;

      root.innerHTML = `
        <div class="setup">
          <header class="teams__head">
            <p class="eyebrow">Game night · step 3</p>
            <h2 class="display">Pick the <em>games</em></h2>
            <p class="teams__summary" data-summary aria-live="polite"></p>
          </header>
          <div class="presets" role="group" aria-label="Ready-made line-ups" data-presets></div>
          <div class="count setup__count">
            <span class="count__label" id="rounds-label">Rounds</span>
            <button type="button" class="step-btn" data-rounds="-1" aria-label="One round fewer">−</button>
            <output class="setup__n" data-n aria-labelledby="rounds-label"></output>
            <button type="button" class="step-btn" data-rounds="1" aria-label="One round more">+</button>
          </div>
          <p class="setup__full" data-full hidden>Every question is in a round. To add a round, give another round fewer questions.</p>
          <ol class="slots" data-slots></ol>
          ${hasTiebreak ? `<label class="set-row setup__tb"><span>Tie-breaker if the top teams finish level</span>
            <input type="checkbox" class="toggle" data-tb></label>` : ""}
          <div class="setup__confirm" data-confirm hidden role="alert">
            <p>A game is under way. Playing these games instead starts every team's score again from 0.</p>
            <div class="set-reset__btns">
              <button type="button" class="btn btn--small btn--danger" data-apply>Use these games</button>
              <button type="button" class="btn btn--ghost btn--small" data-discard>Keep the games we're playing</button>
            </div>
          </div>
          <div class="teams__actions">
            <button class="btn btn--ghost" type="button" data-back>Back</button>
            <button class="btn" type="button" data-next data-autofocus>House rules
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          </div>
        </div>`;

      const $ = (q) => root.querySelector(q);
      const game = (id) => games.find((g) => g.id === id);

      // Keep every slot playable: counts within the questions left, never an empty slot.
      function normalise() {
        const rounds = draft.rounds;
        for (let i = 0; i < rounds.length; i++) {
          if (!game(rounds[i].game)) rounds[i].game = games[0].id;
          let free = L().left(pack, rounds, i);
          if (!free) {
            const other = games.find((g) => L().left(pack, [...rounds.slice(0, i), { game: g.id, count: 1 }], i) > 0);
            if (!other) { rounds.splice(i, 1); i--; continue; }
            rounds[i].game = other.id;
            free = L().left(pack, rounds, i);
          }
          rounds[i].count = Math.max(1, Math.min(free, Math.floor(rounds[i].count) || 1));
        }
      }
      // A new round: a game not in the line-up yet if there is one, else the one with most left.
      function newSlot() {
        const rounds = draft.rounds;
        const freeFor = (g) => L().left(pack, [...rounds, { game: g.id, count: 1 }], rounds.length);
        const unused = games.find((g) => !rounds.some((e) => e.game === g.id) && freeFor(g) > 0);
        const best = unused || games.slice().sort((a, b) => freeFor(b) - freeFor(a))[0];
        const free = best ? freeFor(best) : 0;
        return free ? { game: best.id, count: Math.min(5, free) } : null;
      }

      function slotHTML(e, i) {
        const g = game(e.game);
        const free = L().left(pack, draft.rounds, i);
        const options = games.map((x) => {
          const can = L().left(pack, [...draft.rounds.slice(0, i), { game: x.id, count: 1 }], i) > 0;
          return `<option value="${esc(x.id)}" ${x.id === e.game ? "selected" : ""} ${can ? "" : "disabled"}>${esc(x.name)}${can ? "" : " (all used)"}</option>`;
        }).join("");
        const n = draft.rounds.length;
        return `
          <li class="slot" style="--tint:${TINT[g.kind] || "var(--paper)"}">
            <span class="slot__no">Round ${i + 1}</span>
            <label class="slot__game"><span class="sr">Game for round ${i + 1}</span>
              <select class="field__input" data-game="${i}">${options}</select></label>
            <p class="slot__blurb">${esc(g.blurb || "")}</p>
            <div class="slot__qs">
              <button type="button" class="step-btn" data-count="${i}" data-by="-1" ${e.count <= 1 ? "disabled" : ""} aria-label="Fewer ${L().noun(g.kind, 2)} in round ${i + 1}">−</button>
              <span class="slot__count"><b>${e.count}</b> ${L().noun(g.kind, e.count)}</span>
              <button type="button" class="step-btn" data-count="${i}" data-by="1" ${e.count >= free ? "disabled" : ""} aria-label="More ${L().noun(g.kind, 2)} in round ${i + 1}">+</button>
            </div>
            <div class="slot__move">
              <button type="button" class="step-btn" data-move="${i}" data-by="-1" ${i === 0 ? "disabled" : ""} aria-label="Move round ${i + 1} earlier">↑</button>
              <button type="button" class="step-btn" data-move="${i}" data-by="1" ${i === n - 1 ? "disabled" : ""} aria-label="Move round ${i + 1} later">↓</button>
              <button type="button" class="step-btn" data-remove="${i}" ${n <= 1 ? "disabled" : ""} aria-label="Remove round ${i + 1}">✕</button>
            </div>
          </li>`;
      }

      function render(focusSel) {
        const rounds = L().build(pack, draft);
        const n = draft.rounds.length;
        const qs = draft.rounds.reduce((t, e) => t + e.count, 0);
        const teams = GN.store.get().teams.length;
        $("[data-summary]").textContent = `${n} ${n === 1 ? "round" : "rounds"} · ${qs} to play · about ${L().minutes(rounds)} minutes · ${teams} teams`;
        $("[data-n]").textContent = n;
        root.querySelector('[data-rounds="-1"]').disabled = n <= 1;
        const noneLeft = !newSlot();
        root.querySelector('[data-rounds="1"]').disabled = n >= L().MAX_ROUNDS || noneLeft;
        $("[data-full]").hidden = !(noneLeft && n < L().MAX_ROUNDS);
        const on = L().matches(draft);
        $("[data-presets]").innerHTML = L().PRESETS.filter((p) => L().preset(p.id, pack)).map((p) => `
          <button type="button" class="preset" data-preset="${p.id}" aria-pressed="${on === p.id}">
            <span class="preset__name">${esc(p.name)}</span><span class="preset__note">${esc(p.note)}</span></button>`).join("");
        $("[data-slots]").innerHTML = draft.rounds.map(slotHTML).join("");
        const tb = $("[data-tb]");
        if (tb) tb.checked = draft.tiebreak !== false;
        $("[data-confirm]").hidden = !dirty;
        if (focusSel) { const f = root.querySelector(focusSel); if (f && !f.disabled) f.focus(); }
      }

      // Save straight away, or hold the change until the host says yes.
      function changed(focusSel) {
        normalise();
        if (L().inProgress()) dirty = JSON.stringify(draft) !== JSON.stringify(L().current());
        else { dirty = false; L().set(JSON.parse(JSON.stringify(draft))); }
        render(focusSel);
      }

      root.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b || b.disabled) return;
        const d = b.dataset;
        if (d.preset) { draft = L().preset(d.preset, pack); return changed(`[data-preset="${d.preset}"]`); }
        if (d.rounds) {
          if (d.rounds === "1") { const s = newSlot(); if (s) draft.rounds.push(s); }
          else draft.rounds.pop();
          return changed(`[data-rounds="${d.rounds}"]`);
        }
        if (d.count != null) { draft.rounds[+d.count].count += +d.by; return changed(`[data-count="${d.count}"][data-by="${d.by}"]`); }
        if (d.move != null) {
          const i = +d.move, j = i + +d.by, r = draft.rounds;
          [r[i], r[j]] = [r[j], r[i]];
          return changed(`[data-move="${j}"][data-by="${d.by}"]`);
        }
        if (d.remove != null) { draft.rounds.splice(+d.remove, 1); return changed(`[data-game="${Math.max(0, +d.remove - 1)}"]`); }
        if ("apply" in d) { L().set(JSON.parse(JSON.stringify(draft))); dirty = false; GN.ui.toast("New games saved. Scores are back to 0."); return render("[data-next]"); }
        if ("discard" in d) { draft = JSON.parse(JSON.stringify(L().current())); dirty = false; return render("[data-next]"); }
        if ("back" in d) return nav.back();
        if ("next" in d) {
          if (dirty) { const c = $("[data-confirm]"); c.classList.remove("is-nudge"); void c.offsetWidth; c.classList.add("is-nudge"); c.querySelector("[data-apply]").focus(); return; }
          return nav.next();
        }
      });
      root.addEventListener("change", (e) => {
        const t = e.target;
        if (t.dataset.game != null) {
          const i = +t.dataset.game;
          draft.rounds[i] = { game: t.value, count: Math.max(draft.rounds[i].count, 5) };
          return changed(`[data-game="${i}"]`);
        }
        if (t.matches("[data-tb]")) { draft.tiebreak = t.checked; return changed("[data-tb]"); }
      });

      // Another window (the host's) changed the line-up: show it, unless we're mid-edit.
      const unsub = GN.store.subscribe((s, prev) => {
        if (s.lineup !== prev.lineup && !dirty) { draft = JSON.parse(JSON.stringify(L().current())); render(); }
      });
      normalise();
      render();
      return unsub;
    }
  };
})();
