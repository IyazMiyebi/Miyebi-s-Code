/*
 * The finale: "And the winner is…", a drumroll, the winning team's name, confetti in
 * their colour, and the final scores hanging on their strings. Then play again.
 */
(function () {
  GN.screens = GN.screens || {};
  const esc = GN.esc;

  GN.screens.finale = {
    label: "Finale",
    mount(root) {
      const s = GN.store.get();
      const list = GN.game.standings();
      const top = list.filter((t) => t.place === 1);
      const draw = top.length > 1;
      const lead = top[0];
      const colours = draw ? top.map((t) => GN.colourHex(t.colour)) : [GN.colourHex(lead.colour), "#f3ebe1", "#ff3fd0"];
      const winnerName = draw ? top.map((t) => t.name).join(" & ") : lead.name;
      // The headline is sized so the longest word always fits on one line.
      const longest = Math.max(4, ...winnerName.split(/\s+/).map((w) => w.length));

      root.innerHTML = `
        <canvas class="fin__confetti" aria-hidden="true"></canvas>
        <div class="fin" style="--team:${colours[0]}">
          <p class="fin__ask" data-ask>And the winner is…</p>
          <div class="fin__reveal" data-reveal hidden>
            <p class="eyebrow">${draw ? "It’s a draw" : "Champions of " + esc(s.pack.title)}</p>
            <h2 class="fin__name" data-name style="--len:${longest}">${esc(winnerName)}</h2>
            <p class="fin__pts">${lead.score} points</p>
          </div>
          <div class="fin__cards" data-cards hidden>
            ${list.map((t) => `
              <div class="hang hang--score${t.place === 1 ? " is-lead" : ""}" data-hang="${t.id}" style="--team:${GN.colourHex(t.colour)}">
                <span class="hang__string" aria-hidden="true"></span>
                <div class="hang__card">
                  <span class="hang__hole" aria-hidden="true"></span>
                  <span class="hang__place">${["1st", "2nd", "3rd", "4th"][t.place - 1]}</span>
                  <span class="hang__name">${esc(t.name)}</span>
                  <span class="hang__score">${t.score}</span>
                </div>
              </div>`).join("")}
          </div>
          <div class="fin__actions" data-actions hidden>
            <button class="btn" type="button" data-again>Play again with these teams</button>
            <button class="btn btn--ghost" type="button" data-new>New teams</button>
            <button class="btn btn--ghost" type="button" data-replay>Replay the reveal</button>
          </div>
        </div>`;

      const confetti = GN.fx.confetti(root.querySelector(".fin__confetti"), colours);
      const timers = [];
      let hangers = [];
      const later = (ms, fn) => timers.push(setTimeout(fn, GN.motionOK() ? ms : 0));

      function reveal() {
        timers.forEach(clearTimeout);
        timers.length = 0;
        hangers.forEach((h) => h.destroy());
        hangers = [];
        const ask = root.querySelector("[data-ask]");
        ["[data-reveal]", "[data-cards]", "[data-actions]"].forEach((q) => (root.querySelector(q).hidden = true));
        ask.hidden = false;
        ask.classList.remove("is-on"); void ask.offsetWidth; ask.classList.add("is-on");
        GN.sound.play("drumroll");
        later(2600, () => {
          ask.hidden = true;
          const box = root.querySelector("[data-reveal]");
          box.hidden = false;
          GN.fx.decode(root.querySelector("[data-name]"), winnerName, 700);
          GN.sound.play("reveal");
          GN.sound.play("applause");
          confetti.fire(8);
        });
        later(4200, () => {
          const cards = root.querySelector("[data-cards]");
          cards.hidden = false;
          cards.querySelectorAll("[data-hang]").forEach((el, i) => hangers.push(GN.fx.hang(el, { startAngle: i % 2 ? 0.3 : -0.28, length: 1.3 + i * 0.12 })));
          root.querySelector("[data-actions]").hidden = false;
        });
      }

      root.querySelector("[data-again]").addEventListener("click", () => { GN.store.resetScores(); GN.store.set({ screen: "order" }); });
      root.querySelector("[data-new]").addEventListener("click", () => { GN.store.resetScores(); GN.store.set({ screen: "teams" }); });
      root.querySelector("[data-replay]").addEventListener("click", () => GN.game.finale());

      // The host window can replay the reveal too.
      let seen = s.finaleAt;
      const unsub = GN.store.subscribe((st) => { if (st.screen === "finale" && st.finaleAt !== seen) { seen = st.finaleAt; reveal(); } });
      reveal();
      return () => { unsub(); timers.forEach(clearTimeout); hangers.forEach((h) => h.destroy()); confetti.destroy(); };
    }
  };
})();
