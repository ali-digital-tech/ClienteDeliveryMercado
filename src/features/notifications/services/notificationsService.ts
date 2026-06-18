import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { apiRequest } from '@/shared/lib/api';
import { firebaseVapidKey, firebaseWebConfig } from '@/shared/lib/firebaseConfig';
import { getFriendlyMessage } from '@/shared/lib/userMessages';

export interface CustomerNotification {
  id: string;
  loja_id?: string | null;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read_at: string | null;
  created_at: string;
}

export interface CustomerNotificationPreferences {
  orders_enabled: boolean;
  campaigns_enabled: boolean;
}

const DEVICE_TOKEN_STORAGE_KEY = 'customer_notification_fcm_token';
const PUSH_SERVICE_WORKER_URL = '/sw.js';
const SERVICE_WORKER_READY_TIMEOUT_MS = 30000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getActiveMarketId() {
  if (typeof window === 'undefined') return undefined;
  const marketId = window.location.pathname.match(/\/mercado\/([^/]+)/)?.[1];
  return marketId && UUID_REGEX.test(marketId) ? marketId : undefined;
}

function getPayloadMarketId(data: Record<string, unknown> | undefined | null) {
  const marketId = String(data?.loja_id || data?.tenant_id || '');
  return UUID_REGEX.test(marketId) ? marketId : undefined;
}

function belongsToMarket(data: Record<string, unknown> | undefined | null, marketId: string | undefined) {
  if (!marketId) return true;
  const notificationMarketId = getPayloadMarketId(data);
  return !notificationMarketId || notificationMarketId === marketId;
}

function filterNotificationsByMarket(notifications: CustomerNotification[], marketId: string | undefined) {
  if (!marketId) return notifications;

  return notifications.filter((notification) => {
    if (notification.loja_id && notification.loja_id !== marketId) return false;
    return belongsToMarket(notification.data, marketId);
  });
}

export function hasCustomerPushRegistration() {
  return Boolean(localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY));
}

const firebaseConfigured = () => Boolean(
  firebaseWebConfig.apiKey && firebaseWebConfig.projectId && firebaseWebConfig.messagingSenderId && firebaseWebConfig.appId
);

async function getWebMessaging() {
  if (!firebaseConfigured() || !(await isSupported())) return null;
  const app = getApps()[0] || initializeApp(firebaseWebConfig);
  return getMessaging(app);
}

async function waitForActiveServiceWorker(registration: ServiceWorkerRegistration) {
  if (registration.active) return registration;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const worker = registration.installing || registration.waiting;

  try {
    return await Promise.race([
      new Promise<ServiceWorkerRegistration>((resolve, reject) => {
        if (!worker) {
          navigator.serviceWorker.ready.then(resolve, reject);
          return;
        }

        const resolveWhenActive = () => {
          if (worker.state === 'activated' || registration.active) {
            resolve(registration);
          } else if (worker.state === 'redundant') {
            reject(new Error('o service worker falhou durante a instalação'));
          }
        };

        worker.addEventListener('statechange', resolveWhenActive);
        resolveWhenActive();
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('tempo limite excedido ao iniciar o service worker')),
          SERVICE_WORKER_READY_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getPushServiceWorkerRegistration() {
  let registration: ServiceWorkerRegistration;

  try {
    registration = await navigator.serviceWorker.register(PUSH_SERVICE_WORKER_URL, { scope: '/' });
  } catch {
    throw new Error('Não foi possível ativar o serviço de notificações neste dispositivo. Tente novamente.');
  }

  try {
    return await waitForActiveServiceWorker(registration);
  } catch {
    throw new Error('O serviço de notificações não ficou pronto. Recarregue a página e tente novamente.');
  }
}

async function saveToken(token: string) {
  const lojaId = getActiveMarketId();
  try {
    await apiRequest('/notifications/register-device', {
      method: 'POST',
      body: {
        ...(lojaId ? { loja_id: lojaId } : {}),
        fcm_token: token,
        platform: 'web',
        app_type: 'customer_app',
      },
    });
  } catch (error: any) {
    throw new Error(getFriendlyMessage(error, 'Não foi possível registrar este dispositivo para receber notificações.'));
  }
  localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
}

export async function enableCustomerPush(requestPermission = true) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Este navegador não suporta notificações push. No iPhone, instale e abra o app pela Tela de Início.');
  }

  if (!firebaseVapidKey) {
    throw new Error('A chave VITE_FIREBASE_VAPID_KEY não foi incluída no build do app do cliente.');
  }

  // iOS requires the permission prompt to be initiated directly by the user's tap.
  const permission = requestPermission ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return null;

  const messaging = await getWebMessaging();
  if (!messaging) {
    throw new Error('Notificações push não são compatíveis com este navegador. No iPhone, use o app instalado na Tela de Início em iOS 16.4 ou superior.');
  }

  const registration = await getPushServiceWorkerRegistration();

  let token: string;
  try {
    token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch {
    throw new Error('Permissão concedida, mas não foi possível registrar as notificações push. Tente novamente.');
  }

  if (!token) throw new Error('Não foi possível registrar este dispositivo.');
  await saveToken(token);
  return token;
}

export async function refreshCustomerPushIfGranted() {
  if ('Notification' in window && Notification.permission === 'granted') {
    return enableCustomerPush(false);
  }
  return null;
}

export async function disableCustomerPush({ clearLocalOnError = true }: { clearLocalOnError?: boolean } = {}) {
  const token = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
  if (!token) return;
  try {
    await apiRequest('/notifications/deactivate-device', {
      method: 'POST',
      body: { fcm_token: token },
    });
    localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
  } catch (error) {
    if (clearLocalOnError) {
      localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
    }
    throw error;
  }
}

export async function listenForCustomerPush(callback: (payload: MessagePayload) => void) {
  const messaging = await getWebMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    if (!belongsToMarket(payload.data, getActiveMarketId())) return;
    window.dispatchEvent(new CustomEvent('notification-received', { detail: payload.data }));
    callback(payload);
  });
}

export async function fetchCustomerNotifications(marketId = getActiveMarketId()) {
  const query = marketId ? `?loja_id=${encodeURIComponent(marketId)}` : '';
  const response = await apiRequest<{ data: CustomerNotification[] }>(`/notifications${query}`);
  return filterNotificationsByMarket(response.data || [], marketId);
}

export function isCustomerNotificationForMarket(notification: CustomerNotification, marketId = getActiveMarketId()) {
  return filterNotificationsByMarket([notification], marketId).length > 0;
}

export async function readCustomerNotification(id: string) {
  const response = await apiRequest<{ data: CustomerNotification }>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return response.data;
}

export async function fetchCustomerNotificationPreferences() {
  const lojaId = getActiveMarketId();
  const query = lojaId ? `?loja_id=${encodeURIComponent(lojaId)}` : '';
  const response = await apiRequest<{ data: CustomerNotificationPreferences }>(`/notifications/preferences${query}`);
  return response.data;
}

export async function updateCustomerNotificationPreferences(
  preferences: Partial<Pick<CustomerNotificationPreferences, 'orders_enabled' | 'campaigns_enabled'>>
) {
  const lojaId = getActiveMarketId();
  const response = await apiRequest<{ data: CustomerNotificationPreferences }>('/notifications/preferences', {
    method: 'PATCH',
    body: {
      ...preferences,
      ...(lojaId ? { loja_id: lojaId } : {}),
    } as unknown as BodyInit,
  });
  return response.data;
}
