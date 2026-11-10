/* BST Shipment Tracker service worker: keeps the app opening fast and offline. Live data always comes from Firebase. */
const CACHE = 'bst-tracker-v2';
const SHELL = ['./', 'index.html', 'js/config.js', 'js/backend.js', 'js/app-ui.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;           // Firebase, maps, tracking sites: straight to the network
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })   // newest version first
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
