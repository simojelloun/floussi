/* Floussi : fonctionnement hors connexion.
   Les données ne passent jamais par ce fichier : elles restent sur l'appareil (localStorage, IndexedDB).

   Règles :
   - Code (html, js, css) : réseau d'abord, cache si hors connexion. Ainsi, après une mise en ligne,
     tout le monde reçoit en même temps la nouvelle version de TOUS les fichiers (pas de mélange ancien/nouveau).
   - Polices et images : cache d'abord (elles ne changent presque jamais).
   - Tout fichier chargé par index.html doit figurer dans FILES (vérifié par « npm test »).
   - Changer VERSION à chaque mise en ligne nettoie les anciens caches (conseillé, pas obligatoire). */
const VERSION = "36";
const CACHE = "floussi-" + VERSION;
const FILES = ["./", "index.html", "manifest.webmanifest", "confidentialite.html",
  "css/polices.css", "css/app.css",
  "js/traductions.js", "js/langues.js", "js/utilitaires.js", "js/preferences.js", "js/icones.js", "js/devises-categories.js", "js/donnees.js",
  "js/calculs.js", "js/recurrentes.js", "js/vues.js", "js/rendu.js", "js/calendrier.js", "js/verrouillage.js", "js/previsions.js", "js/listes.js",
  "js/saisie.js", "js/import-csv.js", "js/sauvegarde.js", "js/zoom.js", "js/zakat.js", "js/routes.js", "js/evenements.js", "js/gestes.js", "js/demarrage.js",
  "icon.svg", "icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "apple-touch-icon.png?v=2", "icon-192.png?v=2", "icon-512.png?v=2", "maskable-512.png?v=2",
  "raccourci-depense.png", "raccourci-revenu.png", "raccourci-stats.png",
  "fonts/bricolage-grotesque.woff2", "fonts/figtree-400.woff2", "fonts/figtree-500.woff2", "fonts/figtree-600.woff2",
  "fonts/plex-arabic-400.woff2", "fonts/plex-arabic-500.woff2", "fonts/plex-arabic-600.woff2", "fonts/plex-arabic-700.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const isCode = url => url.pathname.endsWith("/") || /\.(html|js|css|webmanifest)$/.test(url.pathname);
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // aucun autre site n'est contacté
  if (req.mode === "navigate" || isCode(url)) {
    const key = req.mode === "navigate" ? "index.html" : req;
    e.respondWith(fetch(req.url, {cache: "no-cache"}).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key).then(hit => hit || caches.match(req, {ignoreSearch: true}))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })));
});
