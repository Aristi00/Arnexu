/* Arnexu · Service Worker
   - Red primero: siempre intenta traer lo más nuevo; si no hay internet, usa lo guardado.
   - Nunca guarda llamadas a Supabase ni a otros dominios (datos siempre frescos y privados).
   - Recibe y muestra notificaciones push. */
const VERSION = 'arnexu-v2';
const PRECACHE = [
  'offline.html', 'css/styles.css', 'js/config.js', 'js/app.js', 'js/pwa.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'arnexu-64x (1).png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // Supabase, fuentes, CDN: no se tocan
  if (url.pathname.endsWith('/sw.js')) return;

  event.respondWith((async () => {
    try {
      const resp = await fetch(req);
      if (resp && resp.ok && resp.type === 'basic') {
        const copia = resp.clone();
        caches.open(VERSION).then((c) => c.put(req, copia)).catch(() => {});
      }
      return resp;
    } catch (e) {
      const guardado = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (guardado) return guardado;
      if (req.mode === 'navigate') return (await caches.match('offline.html')) || Response.error();
      return Response.error();
    }
  })());
});

// ---------- Notificaciones push ----------
self.addEventListener('push', (event) => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; } catch (e) { datos = { cuerpo: event.data ? event.data.text() : '' }; }
  const titulo = datos.titulo || 'Arnexu';
  event.waitUntil(self.registration.showNotification(titulo, {
    body: datos.cuerpo || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/favicon-48.png',
    tag: datos.tag || 'arnexu',
    renotify: true,
    data: { url: datos.url || 'inicio.html' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || 'inicio.html', self.registration.scope).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of ventanas) {
      if (v.url.startsWith(self.registration.scope) && 'focus' in v) {
        await v.focus();
        if ('navigate' in v) { try { await v.navigate(destino); } catch (e) { /* ya está enfocada */ } }
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
