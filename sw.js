// Service worker do LogBook.
//
// Estratégia: rede primeiro, cache como rede de segurança. É mais lenta que
// cache-first, mas nunca serve um app velho depois de um deploy — o clássico
// tiro no pé de PWA em site sem asset versionado. Offline continua funcionando.
const CACHE = 'logbook-v1';
const ESSENCIAIS = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './data.json',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll falha inteiro se um item falhar; individual é mais tolerante.
      .then(c => Promise.allSettled(ESSENCIAIS.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Só GET do próprio site: API do GitHub e fontes não passam por aqui.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(async () => {
        const cacheado = await caches.match(req);
        if (cacheado) return cacheado;
        // Navegação offline para uma rota nova: entrega a casca do app.
        if (req.mode === 'navigate') {
          const casca = await caches.match('./index.html');
          if (casca) return casca;
        }
        return new Response('Offline e sem cópia local.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
