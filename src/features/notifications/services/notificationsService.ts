import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { apiRequest } from '@/shared/lib/api';
import { firebaseVapidKey, firebaseWebConfig } from '@/shared/lib/firebaseConfig';
import { getFriendlyMessage } from '@/shared/lib/userMessages';

export interface CustomerNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read_at: string | null;
  created_at: string;
}

export interface CustomerNotificationPreferences {
  id?: string;
  orders_enabled: boolean;
  campaigns_enabled: boolean;
}

const DEVICE_TOKEN_STORAGE_KEY = 'customer_notification_fcm_token';
const PUSH_SERVICE_WORKER_URL = '/sw.js';
const SERVICE_WORKER_READY_TIMEOUT_MS = 30000;

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
  try {
    await apiRequest('/notifications/register-device', {
      method: 'POST',
      body: {
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

export async function disableCustomerPush() {
  const token = localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
  if (!token) return;
  try {
    await apiRequest('/notifications/deactivate-device', {
      method: 'POST',
      body: { fcm_token: token },
    });
  } finally {
    localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
  }
}

export async function listenForCustomerPush(callback: (payload: MessagePayload) => void) {
  const messaging = await getWebMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    window.dispatchEvent(new CustomEvent('notification-received', { detail: payload.data }));
    callback(payload);
  });
}

export async function fetchCustomerNotifications() {
  const response = await apiRequest<{ data: CustomerNotification[] }>('/notifications');
  return response.data || [];
}

export async function readCustomerNotification(id: string) {
  const response = await apiRequest<{ data: CustomerNotification }>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return response.data;
}

export async function fetchCustomerNotificationPreferences() {
  const response = await apiRequest<{ data: CustomerNotificationPreferences }>('/notifications/preferences');
  return response.data;
}

export async function updateCustomerNotificationPreferences(
  preferences: Partial<Pick<CustomerNotificationPreferences, 'orders_enabled' | 'campaigns_enabled'>>
) {
  const response = await apiRequest<{ data: CustomerNotificationPreferences }>('/notifications/preferences', {
    method: 'PATCH',
    body: preferences as unknown as BodyInit,
  });
  return response.data;
}
