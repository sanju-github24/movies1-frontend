/* AnchorMovies push worker.
 *
 * Deliberately NOT public/service-worker.js — that file is an ad network's
 * push script (js.mbidpsh.com). Registering it would hand our visitors' push
 * subscriptions to them, and they would send whatever they liked. This one is
 * ours: it only ever shows what our own server sends.
 */

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }

  const title = data.title || 'New on AnchorMovies';
  const options = {
    body: data.body || '',
    icon: '/web-app-manifest-192x192.png',
    badge: '/favicon-96x96.png',
    image: data.image || undefined,
    // Same tag means a second notification replaces the first rather than
    // stacking — nobody wants nine of these on a lock screen.
    tag: 'anchormovies-new',
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    // Reuse a tab that is already open on the site instead of piling up new ones.
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.location.origin)) {
        await c.focus();
        if ('navigate' in c) return c.navigate(url);
        return;
      }
    }
    return clients.openWindow(url);
  })());
});
