// Offline worker. build.py fills in VERSION and FILES and writes it as sw.js.
// Every file of the site is stored on the device at install, so all tests work without internet.
const VERSION = "f9a7c2c5b5";
const FILES = ["./", "engine/quiz.css", "engine/quiz.js", "fonts/AtkinsonHyperlegible-400-latin-ext.woff2", "fonts/AtkinsonHyperlegible-400-latin.woff2", "fonts/AtkinsonHyperlegible-700-latin-ext.woff2", "fonts/AtkinsonHyperlegible-700-latin.woff2", "fonts/BricolageGrotesque-600-latin-ext.woff2", "fonts/BricolageGrotesque-600-latin.woff2", "fonts/BricolageGrotesque-800-latin-ext.woff2", "fonts/BricolageGrotesque-800-latin.woff2", "fonts/NotoSans-400-latin-ext.woff2", "fonts/NotoSans-400-latin.woff2", "fonts/NotoSans-500-latin-ext.woff2", "fonts/NotoSans-500-latin.woff2", "fonts/fonts.css", "hub.js", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "manifest.webmanifest", "tests.json", "tests/kl7/englisch-vokabeln-unit1.html", "tests/kl7/erdkunde-global-grid-seasons.html", "tests/kl7/mathe-zuordnungen.html"];
const CACHE = "lerntests-" + VERSION;
const FONTS = "lerntests-fonts";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("lerntests-") && k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: keep a copy, refresh it when online. Pages fall back to system fonts otherwise.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== location.origin) return;

  // Site files: from the device first, network only for anything not stored yet.
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
    if (hit) return hit;
    return fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })
      .catch(() => req.mode === "navigate" ? c.match("./index.html") : Response.error());
  })));
});

self.addEventListener("message", e => {
  if (e.data === "version" && e.source) e.source.postMessage({ version: VERSION });
});
