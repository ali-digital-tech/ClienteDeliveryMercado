import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, ChevronLeft, Package, Smartphone, Tag, Truck } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import {
  enableCustomerPush,
  fetchCustomerNotificationPreferences,
  fetchCustomerNotifications,
  hasCustomerPushRegistration,
  readCustomerNotification,
  updateCustomerNotificationPreferences,
  type CustomerNotification,
  type CustomerNotificationPreferences,
} from '@/features/notifications';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';

function iconFor(notification: CustomerNotification) {
  if (notification.type === 'TENANT_CAMPAIGN') return { icon: Tag, bg: '#fef3c7', color: '#d97706' };
  if (notification.data?.status === 'saiu_para_entrega') return { icon: Truck, bg: '#dbeafe', color: '#1e40af' };
  return { icon: Package, bg: '#d1fae5', color: '#059669' };
}

function formatDate(value: string) {
  return formatBrasiliaDate(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function NotificationsFeedScreen() {
  const navigate = useNavigate();
  const { isLoggedIn, tenantPath } = useApp();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(() => hasCustomerPushRegistration());
  const [preferences, setPreferences] = useState<CustomerNotificationPreferences | null>(null);
  const [savingPreference, setSavingPreference] = useState(false);

  const load = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    try {
      setPushEnabled(hasCustomerPushRegistration());
      const [items, pushPreferences] = await Promise.all([
        fetchCustomerNotifications(),
        fetchCustomerNotificationPreferences(),
      ]);
      setNotifications(items);
      setPreferences(pushPreferences);
    } catch (error: any) {
      showSystemNotice(error?.message || 'Não foi possível carregar notificações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('notification-received', refresh);
    return () => window.removeEventListener('notification-received', refresh);
  }, [isLoggedIn]);

  const openNotification = async (notification: CustomerNotification) => {
    try {
      if (!notification.read_at) {
        const updated = await readCustomerNotification(notification.id);
        setNotifications((items) => items.map((item) => item.id === updated.id ? updated : item));
      }

      if (notification.data?.route) {
        navigate(notification.data.route.startsWith('/mercado/') ? notification.data.route : tenantPath(notification.data.route));
      }
    } catch (error: any) {
      showSystemNotice(error?.message || 'Não foi possível abrir a notificação.');
    }
  };

  const activatePush = async () => {
    if (!isLoggedIn) {
      navigate(tenantPath('login'));
      return;
    }
    try {
      const token = await enableCustomerPush();
      setPushEnabled(Boolean(token));
      if (token) {
        setPreferences(await fetchCustomerNotificationPreferences());
      }
      showSystemNotice(token ? 'Notificações ativadas neste dispositivo.' : 'Permissão de notificações não concedida.');
    } catch (error: any) {
      showSystemNotice(error?.message || 'Não foi possível ativar notificações.');
    }
  };

  const togglePreference = async (field: 'orders_enabled' | 'campaigns_enabled') => {
    if (!preferences?.id) {
      showSystemNotice('Ative as notificações push para escolher as categorias.');
      return;
    }
    setSavingPreference(true);
    try {
      const updated = await updateCustomerNotificationPreferences({ [field]: !preferences[field] });
      setPreferences(updated);
      showSystemNotice('Preferências de notificações atualizadas.');
    } catch (error: any) {
      showSystemNotice(error?.message || 'Não foi possível atualizar suas preferências.');
    } finally {
      setSavingPreference(false);
    }
  };

  const unread = notifications.filter((item) => !item.read_at);
  const earlier = notifications.filter((item) => item.read_at);

  const renderGroup = (items: CustomerNotification[]) => (
    <div className="space-y-2">
      {items.map((notification) => {
        const config = iconFor(notification);
        const Icon = config.icon;
        return (
          <button key={notification.id} onClick={() => void openNotification(notification)} className="w-full text-left rounded-lg bg-white p-4 flex items-start gap-3" style={{ border: '1px solid #d9e4f2' }}>
            <div className="rounded-md flex items-center justify-center flex-shrink-0" style={{ width: 42, height: 42, backgroundColor: config.bg }}>
              <Icon size={20} color={config.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{notification.title}</p>
              <p className="mt-0.5" style={{ fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>{notification.body}</p>
              <p className="mt-1.5" style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(notification.created_at)}</p>
            </div>
            {!notification.read_at && <div className="flex-shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: '#3b82f6', marginTop: 4 }} />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#f8fafc' }}>
      <div className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)' }}>
        <button onClick={() => navigate(-1)} className="rounded-full p-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Bell size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: 18, fontWeight: 800 }}>Notificações</h1>
        </div>
        <button onClick={activatePush} title="Ativar notificações" className="rounded-full p-2" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <Smartphone size={18} color="white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoggedIn && !pushEnabled && (
          <button onClick={activatePush} className="mb-4 w-full rounded-md px-4 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: '#122a4c' }}>
            <Smartphone size={18} /> Ativar notificações push
          </button>
        )}
        {isLoggedIn && (
          <section className="mb-5 rounded-xl bg-white p-4" style={{ border: '1px solid #d9e4f2' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Configurações de notificações</h2>
            <p className="mt-1 mb-3" style={{ fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>
              Escolha o que deseja receber por push. Ao ativar as notificações, as duas categorias começam habilitadas.
            </p>
            {[
              { field: 'orders_enabled' as const, title: 'Informações sobre pedidos', description: 'Recebido, confirmado, em separação, pronto e conclusão da entrega ou retirada.' },
              { field: 'campaigns_enabled' as const, title: 'Campanhas e promoções', description: 'Ofertas enviadas pela loja para o seu perfil.' },
            ].map((option) => {
              const active = Boolean(preferences?.[option.field]);
              return (
                <div key={option.field} className="flex items-center gap-3 py-3" style={{ borderTop: '1px solid #eef2f7' }}>
                  <div className="flex-1">
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{option.title}</p>
                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.35 }}>{option.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-label={option.title}
                    disabled={!preferences?.id || savingPreference}
                    onClick={() => void togglePreference(option.field)}
                    className="rounded-full p-1 transition-colors disabled:opacity-45"
                    style={{ width: 46, backgroundColor: active ? '#122a4c' : '#cbd5e1' }}
                  >
                    <span className="block rounded-full bg-white transition-transform" style={{ width: 18, height: 18, transform: active ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </div>
              );
            })}
            {!preferences?.id && (
              <p className="pt-1" style={{ fontSize: 12, color: '#64748b' }}>
                Ative o push neste dispositivo para liberar suas escolhas.
              </p>
            )}
          </section>
        )}
        {!isLoggedIn && <p className="text-sm text-center py-10" style={{ color: '#64748b' }}>Entre na sua conta para ver suas notificações.</p>}
        {isLoggedIn && loading && <p className="text-sm text-center py-10" style={{ color: '#64748b' }}>Carregando...</p>}
        {!loading && isLoggedIn && !notifications.length && <p className="text-sm text-center py-10" style={{ color: '#64748b' }}>Nenhuma notificação.</p>}
        {unread.length > 0 && (
          <section className="mb-5">
            <p className="mb-3 px-1 uppercase" style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Novas</p>
            {renderGroup(unread)}
          </section>
        )}
        {earlier.length > 0 && (
          <section>
            <p className="mb-3 px-1 uppercase" style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Anteriores</p>
            {renderGroup(earlier)}
          </section>
        )}
      </div>
    </div>
  );
}
