/* ONS Cliente — Service Worker v1 */
const CACHE_V = 'ons-cliente-v1';

const LOCAL = [
  './',
  './index.html',
  './manifest.json',
  './icon.jpg',
  './logo.jpg'
];

const CDNS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_V).then(c => Promise.allSettled([...LOCAL, ...CDNS].map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Nunca cachear chamadas ao Supabase — sempre buscar dados frescos
  if (url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(
        '{"error":"offline"}',
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Estratégia: cache-first com atualização em segundo plano
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(r => {
        if (r && r.status === 200 && e.request.method === 'GET') {
          caches.open(CACHE_V).then(c => c.put(e.request, r.clone()));
        }
        return r;
      }).catch(() => null);
      return cached || fresh || new Response('Offline', { status: 503 });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
