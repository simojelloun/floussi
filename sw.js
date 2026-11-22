/* Floussi : fonctionnement hors connexion.
   Les fichiers de l'appli sont gardés en cache ; les données restent dans le navigateur (localStorage). */
const CACHE = "flousi-v31";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "apple-touch-icon.png?v=2", "icon-192.png?v=2", "icon-512.png?v=2", "maskable-512.png?v=2", "raccourci-depense.png", "raccourci-revenu.png", "raccourci-stats.png", "confidentialite.html",
  "fonts/bricolage-grotesque.woff2", "fonts/figtree-400.woff2", "fonts/figtree-500.woff2", "fonts/figtree-600.woff2",
  "fonts/plex-arabic-400.woff2", "fonts/plex-arabic-500.woff2", "fonts/plex-arabic-600.woff2", "fonts/plex-arabic-700.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Page : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return r; }).catch(() => caches.match("index.html")));
    return;
  }
  // Fichiers de l'appli (polices comprises) : cache d'abord. Aucun autre site n'est contacté.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === "opaque") { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })));
  }
});
