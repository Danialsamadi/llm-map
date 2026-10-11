// Offline support. The page and its data come from the network first, so a deploy shows up on the next load,
// and from the cache when there is no network. The pinned three.js build and the fonts never change, so they come from the cache first.
const CACHE = 'llm-map';
const LASTING = /^https:\/\/(cdn\.jsdelivr\.net\/npm\/three@|fonts\.(googleapis|gstatic)\.com\/)/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  const keep = res => { // copied before the page reads the body
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(req, copy))); }
    return res;
  };
  if (LASTING.test(req.url)) e.respondWith(caches.match(req).then(hit => hit ?? fetch(req).then(keep)));
  else if (url.origin === location.origin) e.respondWith(fetch(req).then(keep, () => caches.match(req, { ignoreSearch: true }).then(hit => hit ?? Response.error())));
});
