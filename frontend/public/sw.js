/* Service Worker — Festou / Espaço do Cliente */

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = { title: 'Festou', body: event.data?.text() || '' }; }

  const title   = data.title || 'Festou';
  const options = {
    body:               data.body  || '',
    icon:               '/img/favicon.png',
    badge:              '/img/favicon.png',
    image:              data.image  || undefined,
    data:               { url: data.url || '/minha-conta' },
    vibrate:            [200, 100, 200, 100, 200],
    requireInteraction: !!data.requireInteraction,
    tag:                data.tag   || 'festou-push',
    renotify:           true,
    timestamp:          Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/minha-conta';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      // Tenta focar uma janela já aberta no mesmo domínio
      const aberta = lista.find(c => {
        try { return new URL(c.url).pathname.startsWith('/minha-conta'); } catch { return false; }
      });
      if (aberta) return aberta.focus();
      // Abre nova janela — no Android standalone abre como PWA
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('notificationclose', event => {
  // analítica futura se necessário
});
