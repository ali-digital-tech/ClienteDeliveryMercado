/// <reference lib="webworker" />
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseWebConfig } from '@/shared/lib/firebaseConfig';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

const CACHE_NAME = 'cliente-delivery-push-v1';
const PRECACHE_URLS = self.__WB_MANIFEST.map((entry) => entry.url);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined))))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match('/index.html') as Promise<Response>))
  );
});

const supportsPushMessaging = (
  'PushManager' in self &&
  'Notification' in self &&
  'PushSubscription' in self &&
  ServiceWorkerRegistration.prototype.hasOwnProperty('showNotification') &&
  PushSubscription.prototype.hasOwnProperty('getKey')
);

if (supportsPushMessaging && firebaseWebConfig.apiKey && firebaseWebConfig.projectId && firebaseWebConfig.messagingSenderId && firebaseWebConfig.appId) {
  const messaging = getMessaging(initializeApp(firebaseWebConfig));
  onBackgroundMessage(messaging, (payload) => {
    const data = payload.data || {};
    self.registration.showNotification(data.title || 'Nova notificação', {
      body: data.body,
      image: data.image_url || undefined,
      icon: '/icons/icon-192.png',
      data,
    });
  });
}

function customerRoute(data: Record<string, string>) {
  const route = data.route || '/notifications';
  if (route.startsWith('/mercado/')) return route;
  return data.loja_id ? `/mercado/${data.loja_id}${route}` : route;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(customerRoute(event.notification.data || {}), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const current = clients[0] as WindowClient | undefined;
      if (current) {
        await current.navigate(destination);
        return current.focus();
      }
      return self.clients.openWindow(destination);
    })
  );
});
