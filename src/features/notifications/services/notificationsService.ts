import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging';
import { apiRequest } from '@/shared/lib/api';
import { firebaseVapidKey, firebaseWebConfig } from '@/shared/lib/firebaseConfig';

export interface CustomerNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read_at: string | null;
  created_at: string;
}

const DEVICE_TOKEN_STORAGE_KEY = 'customer_notification_fcm_token';

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
    throw new Error(`Token FCM obtido, mas o backend não registrou o dispositivo: ${error?.message || 'erro desconhecido'}`);
  }
  localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
}

export async function enableCustomerPush(requestPermission = true) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('Este navegador não suporta notificações push.');
  }

  if (!firebaseVapidKey) {
    throw new Error('A chave VITE_FIREBASE_VAPID_KEY não foi incluída no build do app do cliente.');
  }

  const messaging = await getWebMessaging();
  if (!messaging) {
    throw new Error('FCM Web Push requer um navegador compatível e execução em HTTPS ou localhost.');
  }

  const permission = requestPermission ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  let token: string;
  try {
    token = await getToken(messaging, {
      vapidKey: firebaseVapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (error: any) {
    const detail = error?.code || error?.message || 'erro desconhecido';
    throw new Error(`Permissão concedida, mas o Firebase não gerou o token push: ${detail}`);
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
