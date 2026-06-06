import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell, ChevronLeft, ChevronRight, Package, RotateCcw, ShieldCheck, Tag, Truck } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import {
  fetchCustomerNotifications,
  readCustomerNotification,
  type CustomerNotification,
} from '@/features/notifications';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';
import { formatBrasiliaDate } from '@/shared/lib/dateTime';

function iconFor(notification: CustomerNotification) {
  if (notification.type === 'TENANT_CAMPAIGN') return { icon: Tag, bg: '#fef3c7', color: '#d97706' };
  if (notification.type === 'REFUND_APPROVED') return { icon: RotateCcw, bg: '#dbeafe', color: '#1d4ed8' };
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

  const load = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    try {
      const items = await fetchCustomerNotifications();
      setNotifications(items);
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

  const unread = notifications.filter((item) => !item.read_at);
  const earlier = notifications.filter((item) => item.read_at);

  const renderGroup = (items: CustomerNotification[]) => (
    <div className="space-y-2">
      {items.map((notification) => {
        const config = iconFor(notification);
        const Icon = config.icon;
        return (
          <button key={notification.id} onClick={() => void openNotification(notification)} className="w-full text-left rounded-lg bg-white p-4 flex items-start gap-3" style={{ border: '1px solid var(--market-primary-border-color)' }}>
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
      <div className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, var(--market-secondary-color) 0%, var(--market-primary-color) 100%)' }}>
        <button onClick={() => navigate(-1)} className="rounded-full p-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Bell size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: 18, fontWeight: 800 }}>Notificações</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <button
          onClick={() => navigate(tenantPath('privacy/permissions'))}
          className="mb-5 flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left"
          style={{ border: '1px solid var(--market-primary-border-color)' }}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--market-primary-soft-color)' }}>
            <ShieldCheck size={19} color="var(--market-primary-color)" />
          </div>
          <div className="flex-1">
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Gerenciar permissões</p>
            <p className="mt-0.5" style={{ fontSize: 12, color: '#64748b' }}>Configure push, categorias e localização exata.</p>
          </div>
          <ChevronRight size={17} color="#94a3b8" />
        </button>
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
