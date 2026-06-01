/// <reference lib="webworker" />
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseWebConfig } from '@/shared/lib/firebaseConfig';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

const CACHE_NAME = 'cliente-delivery-push-v1';
const PRODUCT_IMAGE_CACHE_NAME = 'cliente-delivery-product-images-v1';
const PRODUCT_IMAGE_CACHE_MAX_ENTRIES = 500;
const PRECACHE_URLS = self.__WB_MANIFEST.map((entry) => entry.url);
const PRODUCT_IMAGE_PATH_PREFIXES = [
  '/storage/v1/object/public/product-images/',
  '/storage/v1/render/image/public/product-images/',
];

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
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== PRODUCT_IMAGE_CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isProductImageRequest(request: Request) {
  if (request.method !== 'GET') return false;

  const url = new URL(request.url);
  return PRODUCT_IMAGE_PATH_PREFIXES.some((pathPrefix) => url.pathname.startsWith(pathPrefix));
}

function isCacheableImageResponse(response: Response) {
  return response.type === 'opaque' || response.ok;
}

async function trimProductImageCache(cache: Cache) {
  const requests = await cache.keys();
  if (requests.length <= PRODUCT_IMAGE_CACHE_MAX_ENTRIES) return;

  const deleteCount = requests.length - PRODUCT_IMAGE_CACHE_MAX_ENTRIES;
  await Promise.all(requests.slice(0, deleteCount).map((request) => cache.delete(request)));
}

async function handleProductImageRequest(
  request: Request,
  waitUntil: (promise: Promise<unknown>) => void,
) {
  const cache = await caches.open(PRODUCT_IMAGE_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (isCacheableImageResponse(networkResponse)) {
    waitUntil(
      cache.put(request, networkResponse.clone())
        .then(() => trimProductImageCache(cache))
        .catch(() => undefined)
    );
  }

  return networkResponse;
}

self.addEventListener('fetch', (event) => {
  if (isProductImageRequest(event.request)) {
    event.respondWith(handleProductImageRequest(event.request, (promise) => event.waitUntil(promise)));
    return;
  }

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
