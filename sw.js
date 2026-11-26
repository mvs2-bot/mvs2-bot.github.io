// Service Worker für das Dashboard (nur Root-Seite, Unterprojekte haben eigene SWs).
// Einzige Versionsnummer der Root-Seiten: bei jeder Änderung an einer Datei aus ASSETS hochzählen.
// HTML/CSS/JS brauchen keine ?v=…-Parameter: der SW holt sie immer frisch (Revalidierung per ETag).
const CACHE = 'mvs2-dashboard-v56';
const ASSETS = [
  './', './index.html', './konto.html', './admin.html', './usage.html', './colors.html', './manifest.json',
  './shared/tokens.css', './shared/hub.css', './shared/streak.css',
  './shared/dashboard.js', './shared/tools.js', './shared/projects.js', './shared/overall-account.js',
  './shared/ios-nav.js', './shared/streak.js', './shared/kpi.js', './shared/settings-nav.js',
  './icon.svg', './favicon.ico', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png',
];
// Dieselbe Liste entscheidet, welche Anfragen der SW bedient (Pfade relativ zum Scope, z. B. '/shared/hub.css').
const PATHS = new Set(ASSETS.map(a => new URL(a, self.registration.scope).pathname));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('mvs2-dashboard-') && k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Nur eigene Root-Dateien bedienen – Unterprojekte (/TravelBase/, /QuickTools/ …) nicht anfassen.
  if (e.request.method !== 'GET' || url.origin !== location.origin || !PATHS.has(url.pathname)) return;

  // Network-first: immer aktuell, offline aus dem Cache. no-cache = am Browser-Cache vorbei beim Server nachfragen.
  const req = e.request.mode === 'navigate' ? e.request : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
