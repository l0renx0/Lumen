// Service worker: rende l'app installabile e utilizzabile anche offline.
// Quando modifichi i file dell'app, aumenta il numero di VERSION.
const VERSION = 'lumen-v2';
const SHELL = [
  './',
  'index.html',
  'assets/css/app.css',
  'assets/js/app.js',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'lumen-img').map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Dati: prima la rete (contenuti freschi), poi la copia salvata se offline.
  if (url.origin === location.origin && url.pathname.includes('/data/')) {
    if (url.pathname.endsWith('meta.json')) return; // sempre dalla rete
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Immagini esterne: copia salvata se c'è, aggiornata in background.
  if (req.destination === 'image' && url.origin !== location.origin) {
    e.respondWith(
      caches.open('lumen-img').then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  // Interfaccia: prima la rete (così gli aggiornamenti si vedono subito), la copia salvata se offline.
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true })),
    );
    return;
  }

  // Font: copia salvata, aggiornata in background.
  if (url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});
