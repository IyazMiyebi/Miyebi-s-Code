/*
 * Offline support. The first visit saves every file of the show in the browser;
 * after that it opens with no internet at all. Bump VERSION whenever files change
 * so everyone gets the new copy.
 */
const VERSION = "gn-stage1-1";
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
  "js/screens/title.js",
  "js/screens/teams.js",
  "js/screens/rules.js",
  "js/screens/order.js",
  "js/settings.js",
  "js/app.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Our own files: answer from the saved copy straight away (fast, works offline), and
// quietly fetch a fresh copy for next time. Anything else (e.g. music previews): network.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(e.request, { ignoreSearch: true }).then((hit) => {
        const fresh = fetch(e.request)
          .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => hit);
        if (hit) { e.waitUntil(fresh); return hit; }
        return fresh;
      })
    )
  );
});
