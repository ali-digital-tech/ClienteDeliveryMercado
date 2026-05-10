import { useNavigate } from "react-router";
import {
  ChevronLeft,
  Bell,
  ShoppingBag,
  Tag,
  Truck,
  Star,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

interface NotifGroup {
  title: string;
  items: {
    icon: React.ElementType;
    label: string;
    desc: string;
    key: string;
  }[];
}

const groups: NotifGroup[] = [
  {
    title: "Pedidos",
    items: [
      { icon: ShoppingBag, label: "Status do pedido", desc: "Atualizações de confirmação e preparo", key: "pedidoStatus" },
      { icon: Truck, label: "Entrega", desc: "Saiu para entrega e entregue", key: "entrega" },
    ],
  },
  {
    title: "Promoções",
    items: [
      { icon: Tag, label: "Ofertas e descontos", desc: "Cupons e preços especiais", key: "ofertas" },
      { icon: Star, label: "Novidades", desc: "Novos produtos e coleções", key: "novidades" },
    ],
  },
  {
    title: "Comunicação",
    items: [
      { icon: MessageSquare, label: "Mensagens de suporte", desc: "Respostas da equipe FrescaMart", key: "suporte" },
    ],
  },
];

export function NotificationsScreen() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<Record<string, boolean>>({
    pedidoStatus: true,
    entrega: true,
    ofertas: true,
    novidades: false,
    suporte: true,
  });

  const toggle = (key: string) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className="relative flex-shrink-0 transition-all"
      style={{
        width: "46px",
        height: "26px",
        borderRadius: "13px",
        backgroundColor: value ? "#122a4c" : "#cbd5e1",
      }}
    >
      <span
        className="absolute top-1 transition-all"
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          backgroundColor: "white",
          left: value ? "24px" : "4px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );

  const allOn = Object.values(settings).every(Boolean);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-12 md:pt-5 pb-5 flex items-center gap-3"
        style={{ background: "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)" }}
      >
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Ativar tudo */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #1b3d6d, #122a4c)" }}
        >
          <Bell size={22} color="white" className="flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white" style={{ fontSize: "14px", fontWeight: 700 }}>
              Ativar todas as notificações
            </p>
            <p style={{ fontSize: "12px", color: "#c7d7ee" }}>
              {allOn ? "Tudo ativo" : "Algumas notificações estão desativadas"}
            </p>
          </div>
          <Toggle
            value={allOn}
            onChange={() => {
              const newVal = !allOn;
              setSettings((prev) =>
                Object.fromEntries(Object.keys(prev).map((k) => [k, newVal]))
              );
            }}
          />
        </div>

        {/* Grupos por tipo */}
        {groups.map((group) => (
          <div key={group.title}>
            <p
              className="mb-2 px-1"
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {group.title}
            </p>
            <div
              className="rounded-2xl bg-white shadow-sm overflow-hidden"
              style={{ border: "1px solid #d9e4f2" }}
            >
              {group.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{
                      borderBottom:
                        i < group.items.length - 1 ? "1px solid #eef2f7" : "none",
                    }}
                  >
                    <div
                      className="rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}
                    >
                      <Icon size={18} color="#122a4c" />
                    </div>
                    <div className="flex-1">
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: "12px", color: "#64748b" }}>{item.desc}</p>
                    </div>
                    <Toggle
                      value={settings[item.key]}
                      onChange={() => toggle(item.key)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pb-4" />
      </div>
    </div>
  );
}