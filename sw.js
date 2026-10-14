// Service Worker für das Dashboard (nur Root-Seite, Unterprojekte haben eigene SWs).
// Bei Änderungen an index.html die Versionsnummer erhöhen.
const CACHE = 'mvs2-dashboard-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

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
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const path = url.pathname;
  const isRootAsset = path === '/' || ['/index.html', '/manifest.json', '/icon.svg'].includes(path);
  if (!isRootAsset) return;

  // Network-first: immer aktuell, offline aus dem Cache.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
