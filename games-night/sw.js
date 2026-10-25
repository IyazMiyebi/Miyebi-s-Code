/*
 * Offline support. The first visit saves every file of the show in the browser;
 * after that it opens with no internet at all. When online it always loads the
 * latest files. Bump VERSION when the file list changes.
 */
const VERSION = "gn-stage8-1";
const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon.svg",
  "css/app.css",
  "fonts/instrument-serif-latin-400-italic.woff2",
  "fonts/instrument-serif-latin-400-normal.woff2",
  "fonts/archivo-latin-standard-normal.woff2",
  "fonts/jetbrains-mono-latin-500-normal.woff2",
  "data/default-pack.js",
  "js/store.js",
  "js/fx/liquid.js",
  "js/fx/hanging.js",
  "js/fx/boxgrid.js",
  "js/fx/ascii.js",
  "js/fx/spiral.js",
  "js/fx/confetti.js",
  "js/music.js",
  "js/mini.js",
  "js/category.js",
  "js/tiebreak.js",
  "js/sound.js",
  "js/game.js",
  "js/ui/toast.js",
  "js/ui/scores.js",
  "js/screens/title.js",
  "js/screens/teams.js",
  "js/screens/rules.js",
  "js/screens/order.js",
  "js/screens/mini-view.js",
  "js/screens/category-view.js",
  "js/screens/finale.js",
  "js/screens/play.js",
  "js/settings.js",
  "js/host.js",
  "js/packs.js",
  "js/editor.js",
  "js/remote.js",
  "vendor/peerjs.min.js",
  "vendor/qrcode.js",
  "js/app.js"
];

// Always save fresh copies (skip the browser's 10-minute file cache), so the saved
// files can never be a mix of old and new versions.
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      // Remove old copies of the show, but keep the saved music clips ("gn-clips").
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "gn-clips").map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Our own files: get the latest from the internet and save it. If there's no internet
// (or it takes more than 3 seconds), use the saved copy instead.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then((cache) => {
      const fresh = (e.request.mode === "navigate" ? fetch(e.request) : fetch(e.request.url, { cache: "no-cache" }))
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; });
      const saved = () => cache.match(e.request, { ignoreSearch: true });
      const slow = new Promise((resolve) => setTimeout(resolve, 3000)).then(saved);
      return Promise.race([fresh.catch(saved), slow.then((hit) => hit || fresh)])
        .then((res) => res || fresh);
    })
  );
});
