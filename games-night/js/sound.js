/*
 * Sound effects, made on the fly with the browser's synthesiser: no audio files to
 * download, so they work offline. Only the big-screen window makes sound.
 */
(function () {
  let ac = null, master = null;

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.7;
      master.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }
  // Browsers only allow sound after the first click or key press.
  ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, () => ctx(), { once: true, capture: true }));

  const on = () => GN.role === "show" && GN.store.get().settings.sound;

  function tone(freq, start, dur, { type = "sine", vol = 0.3, slide = 0, attack = 0.005 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  function noise(start, dur, { vol = 0.3, filter = 1200, q = 0.7, type = "bandpass" } = {}) {
    const len = Math.ceil(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf;
    f.type = type;
    f.frequency.value = filter;
    f.Q.value = q;
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    s.connect(f).connect(g).connect(master);
    s.start(start);
  }

  const sounds = {
    tick(t) { tone(1800, t, 0.03, { type: "square", vol: 0.05 }); },
    tickUrgent(t) { tone(2400, t, 0.05, { type: "square", vol: 0.12 }); tone(1200, t, 0.08, { vol: 0.1 }); },
    buzzer(t) {
      tone(110, t, 0.9, { type: "sawtooth", vol: 0.28 });
      tone(116, t, 0.9, { type: "sawtooth", vol: 0.22 });
      tone(55, t, 0.9, { type: "square", vol: 0.12 });
    },
    reveal(t) {
      noise(t, 0.5, { vol: 0.15, filter: 3000, q: 0.5, type: "highpass" });
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.6, { type: "triangle", vol: 0.16 }));
    },
    score(t) { tone(988, t, 0.12, { type: "triangle", vol: 0.2 }); tone(1319, t + 0.09, 0.3, { type: "triangle", vol: 0.2 }); },
    minus(t) { tone(330, t, 0.25, { type: "triangle", vol: 0.2, slide: 0.6 }); },
    whoosh(t) { noise(t, 0.5, { vol: 0.12, filter: 600, q: 1.5 }); },
    start(t) { tone(440, t, 0.12, { type: "triangle", vol: 0.2 }); tone(880, t + 0.12, 0.25, { type: "triangle", vol: 0.2 }); },
    // A snare roll that builds, for "and the winner is…".
    drumroll(t) {
      for (let i = 0; i < 46; i++) {
        const at = t + i * 0.055;
        noise(at, 0.05, { vol: 0.04 + (i / 46) * 0.16, filter: 2600, q: 0.8 });
      }
      tone(60, t + 2.55, 0.5, { type: "sine", vol: 0.5 });
      noise(t + 2.55, 0.6, { vol: 0.25, filter: 5000, q: 0.4, type: "highpass" });
    },
    applause(t) {
      // Lots of tiny claps of filtered noise, swelling then fading.
      for (let i = 0; i < 90; i++) {
        const at = t + Math.random() * 2.6;
        const env = Math.sin(Math.min(1, (at - t) / 2.6) * Math.PI);
        noise(at, 0.06 + Math.random() * 0.05, { vol: 0.05 + env * 0.12, filter: 900 + Math.random() * 2200, q: 1.2 });
      }
    }
  };

  GN.sound = {
    play(name) {
      if (!on() || !sounds[name] || !ctx()) return;
      try { sounds[name](ac.currentTime + 0.01); } catch (e) { /* ignore */ }
    }
  };
})();
