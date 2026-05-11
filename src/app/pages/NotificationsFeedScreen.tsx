import { useNavigate } from "react-router";
import {
  ChevronLeft,
  Bell,
  ShoppingBag,
  Tag,
  Truck,
  Package,
  Star,
  Settings,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';

interface Notification {
  id: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  time: string;
  isNew: boolean;
}

const notifications: Notification[] = [
  {
    id: "1",
    icon: Truck,
    iconBg: "#dbeafe",
    iconColor: "#1e40af",
    title: "Pedido #3482 saiu para entrega",
    desc: "Seu pedido está a caminho e deve chegar em 20 minutos",
    time: "há 5 min",
    isNew: true,
  },
  {
    id: "2",
    icon: Tag,
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    title: "Oferta Especial: 40% OFF",
    desc: "Hortifruti selecionados com desconto até domingo",
    time: "há 1 hora",
    isNew: true,
  },
  {
    id: "3",
    icon: Package,
    iconBg: "#d1fae5",
    iconColor: "#059669",
    title: "Pedido #3481 entregue",
    desc: "Seu pedido foi entregue com sucesso. Obrigado!",
    time: "ontem às 18:30",
    isNew: false,
  },
  {
    id: "4",
    icon: Star,
    iconBg: "#ede9fe",
    iconColor: "#7c3aed",
    title: "Novos produtos orgânicos",
    desc: "Confira nossa nova linha de produtos orgânicos certificados",
    time: "há 2 dias",
    isNew: false,
  },
  {
    id: "5",
    icon: ShoppingBag,
    iconBg: "#dbeafe",
    iconColor: "#1e40af",
    title: "Pedido #3480 confirmado",
    desc: "Seu pedido foi confirmado e está sendo preparado",
    time: "há 3 dias",
    isNew: false,
  },
  {
    id: "6",
    icon: Tag,
    iconBg: "#fef3c7",
    iconColor: "#d97706",
    title: "Cupom de R$ 15 disponível",
    desc: "Use o cupom FRESCAMART15 em compras acima de R$ 100",
    time: "há 4 dias",
    isNew: false,
  },
];

export function NotificationsFeedScreen() {
  const navigate = useNavigate();
  const { tenantPath } = useApp();

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-12 md:pt-5 pb-5 flex items-center justify-between"
        style={{ background: "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          >
            <ChevronLeft size={20} color="white" />
          </button>
          <div className="flex items-center gap-2">
            <Bell size={20} color="white" />
            <h1 className="text-white" style={{ fontSize: "18px", fontWeight: 800 }}>
              Notificações
            </h1>
          </div>
        </div>
        <button
          onClick={() => navigate(tenantPath("notifications"))}
          className="rounded-full p-2 flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
        >
          <Settings size={18} color="white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* New notifications */}
        {notifications.filter((n) => n.isNew).length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <p
              className="mb-3 px-1"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Novas
            </p>
            <div className="space-y-2">
              {notifications
                .filter((n) => n.isNew)
                .map((notif) => {
                  const Icon = notif.icon;
                  return (
                    <div
                      key={notif.id}
                      className="rounded-2xl bg-white shadow-sm p-4 flex items-start gap-3"
                      style={{ border: "1px solid #d9e4f2" }}
                    >
                      <div
                        className="rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          width: "42px",
                          height: "42px",
                          backgroundColor: notif.iconBg,
                        }}
                      >
                        <Icon size={20} color={notif.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
                          {notif.title}
                        </p>
                        <p
                          className="mt-0.5"
                          style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}
                        >
                          {notif.desc}
                        </p>
                        <p
                          className="mt-1.5"
                          style={{ fontSize: "11px", color: "#94a3b8" }}
                        >
                          {notif.time}
                        </p>
                      </div>
                      <div
                        className="flex-shrink-0 rounded-full"
                        style={{
                          width: "8px",
                          height: "8px",
                          backgroundColor: "#3b82f6",
                          marginTop: "4px",
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Earlier notifications */}
        {notifications.filter((n) => !n.isNew).length > 0 && (
          <div className="px-4 pt-4 pb-6">
            <p
              className="mb-3 px-1"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Anteriores
            </p>
            <div className="space-y-2">
              {notifications
                .filter((n) => !n.isNew)
                .map((notif) => {
                  const Icon = notif.icon;
                  return (
                    <div
                      key={notif.id}
                      className="rounded-2xl bg-white shadow-sm p-4 flex items-start gap-3"
                      style={{ border: "1px solid #e2e8f0" }}
                    >
                      <div
                        className="rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          width: "42px",
                          height: "42px",
                          backgroundColor: notif.iconBg,
                        }}
                      >
                        <Icon size={20} color={notif.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                          {notif.title}
                        </p>
                        <p
                          className="mt-0.5"
                          style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}
                        >
                          {notif.desc}
                        </p>
                        <p
                          className="mt-1.5"
                          style={{ fontSize: "11px", color: "#94a3b8" }}
                        >
                          {notif.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
