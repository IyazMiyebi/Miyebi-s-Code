/*
 * What the big screen shows for a mini game: the challenge (clock, team lanes, the memory
 * tray or charades cards) and the result with its winner. Used by js/screens/play.js.
 */
(function () {
  const esc = GN.esc;
  const G = () => GN.game, MI = () => GN.mini;
  const RING = 2 * Math.PI * 54;

  const timerHTML = () => `
    <div class="timer" data-timer>
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="timer__track" cx="60" cy="60" r="54"/><circle class="timer__ring" cx="60" cy="60" r="54" style="stroke-dasharray:${RING}"/></svg>
      <span class="timer__num" data-num></span>
      <span class="timer__state" data-state></span>
    </div>`;

  function challenge(round, i, item) {
    const mode = item.mode || "stopwatch";
    const teams = GN.store.get().teams;
    const prompts = item.prompts || [];
    return `
      <div class="mg mg--${mode}">
        <header class="q__head">
          <p class="eyebrow">${esc(G().itemLabel(round, i))}</p>
          <p class="q__round">${esc(round.name)}</p>
        </header>
        <div class="mg__main">
          <div class="mg__info">
            <h2 class="mg__name" data-decode="${esc(item.name)}">${esc(item.name)}</h2>
            <p class="mg__text">${esc(item.text)}</p>
            ${item.note ? `<p class="mg__note">${esc(item.note)}</p>` : ""}
          </div>
          ${mode === "memory" ? `<div class="mg__side">${timerHTML()}<p class="mg__stage" data-stage></p></div>`
            : `<p class="mg__clock" data-clock>0:00.0</p>`}
        </div>
        ${mode === "memory"
          ? `<div class="tray" data-tray>${Array.from({ length: 12 }, (_, j) => `<span class="mt" style="--j:${j}"><b>${j + 1}</b><i aria-hidden="true">?</i></span>`).join("")}</div>`
          : `<div class="lanes">${teams.map((t) => `
              <button type="button" class="lane" data-lane="${t.id}" style="--team:${GN.colourHex(t.colour)}" aria-label="${esc(t.name)}: ${item.mode === "last-standing" ? "tap when out" : "tap when finished"}">
                <span class="lane__name">${esc(t.name)}</span><span class="lane__val" data-lane-val></span>
              </button>`).join("")}</div>`}
        ${prompts.length ? `<div class="cards" data-cards aria-label="Charades prompts">${prompts.map((_, j) => `
            <div class="ccard" data-i="${j}"><span class="ccard__n">${j + 1}</span><span class="ccard__t"></span></div>`).join("")}</div>` : ""}
      </div>`;
  }

  function resultsList(item) {
    const m = MI().state(), teams = GN.store.get().teams, fmt = MI().fmt;
    const mode = item.mode || "stopwatch";
    let rows = [];
    if (mode === "stopwatch") {
      rows = [...teams].sort((a, b) => (m.times[a.id] ?? Infinity) - (m.times[b.id] ?? Infinity))
        .map((t) => [t, m.times[t.id] != null ? fmt(m.times[t.id]) : "didn’t finish"]);
    } else if (mode === "last-standing") {
      rows = [...teams].sort((a, b) => (m.out[b.id] ?? Infinity) - (m.out[a.id] ?? Infinity))
        .map((t) => [t, m.out[t.id] != null ? `out at ${fmt(m.out[t.id])}` : `still standing at ${fmt(MI().elapsed())}`]);
    }
    if (!rows.length) return "";
    return `<ol class="mg__results">${rows.map(([t, v]) =>
      `<li style="--team:${GN.colourHex(t.colour)}"><span>${esc(t.name)}</span><b>${esc(v)}</b></li>`).join("")}</ol>`;
  }

  function result(round, i, item) {
    const s = GN.store.get(), m = MI().state();
    const team = (id) => s.teams.find((t) => t.id === id);
    const w = m.winner && team(m.winner);
    const sug = MI().suggestion() && team(MI().suggestion());
    const mode = item.mode || "stopwatch";
    const ask = sug
      ? `${esc(sug.name)} ${mode === "stopwatch" ? "was fastest" : "lasted longest"}. Confirm the winner:`
      : "Who won?";
    return `
      <div class="mg mg--result">
        <header class="q__head">
          <p class="eyebrow">${esc(G().itemLabel(round, i))} · result</p>
          <p class="q__round">${esc(round.name)}</p>
        </header>
        <h2 class="mg__name">${esc(item.name)}</h2>
        ${w ? `<p class="mg__winner" style="--team:${GN.colourHex(w.colour)}"><span class="mg__wk">Winner</span>
              <span class="mg__wn" data-decode="${esc(w.name)}">${esc(w.name)}</span><span class="mg__wp">+${s.rules.mini} points</span></p>`
          : `<p class="mg__ask">${ask}</p>
             <div class="mg__pick"><span>Winner:</span>${s.teams.map((t) => `<button type="button" class="pick" data-pick="${t.id}" style="--team:${GN.colourHex(t.colour)}">${esc(t.name)}</button>`).join("")}</div>`}
        ${resultsList(item)}
      </div>`;
  }

  GN.miniView = {
    html(round, i, item, reveal) { return reveal ? result(round, i, item) : challenge(round, i, item); },

    // Keeps the race clock ticking on screen. Returns a function that stops it.
    start(view) {
      let raf = 0;
      const el = view.querySelector("[data-clock]");
      if (!el) return () => {};
      const tick = () => {
        el.textContent = MI().fmt(MI().elapsed());
        el.classList.toggle("is-running", MI().running());
        raf = requestAnimationFrame(tick);
      };
      tick();
      return () => cancelAnimationFrame(raf);
    },

    // Bring lanes, tray and cards up to date, and play the matching sounds.
    update(view, s, prev) {
      if (!view) return;
      const item = G().item();
      if (!item) return;
      const m = MI().state(), mode = item.mode || "stopwatch", fmt = MI().fmt;
      const teams = s.teams;
      const order = teams.filter((t) => m.times[t.id] != null).sort((a, b) => m.times[a.id] - m.times[b.id]).map((t) => t.id);
      const left = teams.filter((t) => m.out[t.id] == null);
      teams.forEach((t) => {
        const lane = view.querySelector(`[data-lane="${t.id}"]`);
        if (!lane) return;
        const val = lane.querySelector("[data-lane-val]");
        let text = MI().running() ? (mode === "stopwatch" ? "racing…" : "still in") : MI().elapsed() ? "stopped" : "ready";
        let cls = "";
        if (MI().turns()) {
          const up = MI().upNext();
          text = m.turn === t.id ? (MI().running() ? "on the clock" : "paused") : up && up.id === t.id ? "up next" : "waiting";
          cls = m.turn === t.id ? "is-turn" : "";
        }
        if (mode === "stopwatch" && m.times[t.id] != null) {
          const place = order.indexOf(t.id) + 1;
          text = `${fmt(m.times[t.id])} · ${["1st", "2nd", "3rd", "4th"][place - 1]}`;
          cls = place === 1 ? "is-win" : "is-done";
        }
        if (mode === "last-standing") {
          if (m.out[t.id] != null) { text = `out at ${fmt(m.out[t.id])}`; cls = "is-out"; }
          else if (left.length === 1 && Object.keys(m.out).length) { text = "last one standing!"; cls = "is-win"; }
        }
        val.textContent = text;
        lane.className = "lane " + cls;
      });

      const tray = view.querySelector("[data-tray]");
      if (tray) {
        const covered = m.stage === "write" || (m.stage === "look" && s.show.timesUp);
        tray.classList.toggle("is-look", m.stage === "look" && !s.show.timesUp);
        tray.classList.toggle("is-covered", covered);
        const stage = view.querySelector("[data-stage]");
        stage.textContent = m.stage === "ready" ? "Get the tray ready"
          : m.stage === "look" ? (s.show.timesUp ? "Cover the tray!" : "Look closely…")
          : s.show.timesUp ? "Pens down" : "Write down everything you remember";
      }

      const cards = view.querySelector("[data-cards]");
      if (cards) {
        const prompts = item.prompts || [];
        cards.querySelectorAll(".ccard").forEach((c, j) => {
          const shown = j < m.guessed;
          if (shown && !c.classList.contains("is-shown")) c.querySelector(".ccard__t").textContent = prompts[j];
          if (!shown) c.querySelector(".ccard__t").textContent = "";
          c.classList.toggle("is-shown", shown);
        });
      }

      // Sounds for what just happened.
      const pm = prev && prev.show.mini;
      if (!pm || !s.show.mini || prev.show.item !== s.show.item) return;
      if (!pm.start && m.start && !pm.acc) GN.sound.play("start");
      if (Object.keys(m.times).length > Object.keys(pm.times).length) GN.sound.play("score");
      if (Object.keys(m.out).length > Object.keys(pm.out).length) GN.sound.play("minus");
      if (m.guessed > pm.guessed) GN.sound.play("score");
      if (pm.start && !m.start && (mode === "last-standing" ? left.length === 1 : order.length === teams.length)) GN.sound.play("buzzer");
    }
  };
})();
