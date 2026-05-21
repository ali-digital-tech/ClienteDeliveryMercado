import { useNavigate } from "react-router";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Heart,
  HelpCircle,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShoppingBag,
  User,
} from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";
import { BottomNav } from "@/shared/components/BottomNav";

const menuItems = [
  { icon: MapPin, label: "Meus endereços", path: "addresses" },
  { icon: Heart, label: "Favoritos", path: "favorites" },
  { icon: CreditCard, label: "Métodos de pagamento", path: "payment" },
  { icon: ShoppingBag, label: "Meus pedidos", path: "orders" },
  { icon: Bell, label: "Notificações", path: "notifications-feed" },
  { icon: Shield, label: "Privacidade e segurança", path: "privacy" },
  { icon: HelpCircle, label: "Suporte", path: "support" },
];

export function ProfileScreen() {
  const navigate = useNavigate();
  const { logout, orders, favorites, tenantPath, currentUser, isLoggedIn } = useApp();

  const handleLogout = () => {
    logout();
    navigate(tenantPath("login"));
  };

  const handleLogin = () => {
    navigate(tenantPath("login"));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-4"
        style={{ background: "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)" }}
      >
        <h1 className="mb-3 text-white" style={{ fontSize: "18px", fontWeight: 800 }}>
          Meu Perfil
        </h1>

        <div className="flex items-center gap-4">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: "52px",
              height: "52px",
              backgroundColor: "rgba(255,255,255,0.16)",
              fontSize: "24px",
            }}
          >
            👤
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white truncate" style={{ fontSize: "16px", fontWeight: 800 }}>
              {currentUser?.nome || (isLoggedIn ? "Cliente" : "Visitante")}
            </p>

            <div className="mt-0.5 flex items-center gap-1.5">
              <Mail size={12} color="#c7d7ee" />
              <p className="truncate" style={{ fontSize: "12px", color: "#c7d7ee" }}>
                {currentUser?.email || "Entre para acessar sua conta"}
              </p>
            </div>

            {currentUser?.telefone && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <Phone size={12} color="#c7d7ee" />
                <p style={{ fontSize: "12px", color: "#c7d7ee" }}>{currentUser.telefone}</p>
              </div>
            )}
          </div>

          <button className="rounded-full p-2" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
            <User size={18} color="white" />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {[
            { label: "Pedidos", value: orders.length },
            { label: "Favoritos", value: favorites.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-xl py-1.5 px-3 text-center backdrop-blur-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
            >
              <p className="text-white" style={{ fontSize: "16px", fontWeight: 800 }}>
                {stat.value}
              </p>
              <p style={{ fontSize: "10px", color: "#c7d7ee" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4" style={{ background: "#f8fafc" }}>
        <div
          className="overflow-hidden rounded-2xl bg-white shadow-sm mb-4"
          style={{ border: "1px solid #d9e4f2" }}
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => navigate(tenantPath(item.path))}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-slate-50"
                style={{
                  borderBottom: index < menuItems.length - 1 ? "1px solid #eef2f7" : "none",
                }}
              >
                <div
                  className="rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}
                >
                  <Icon size={18} color="#122a4c" />
                </div>

                <span className="flex-1 text-left" style={{ fontSize: "14px", color: "#334155", fontWeight: 500 }}>
                  {item.label}
                </span>

                <ChevronRight size={16} color="#94a3b8" />
              </button>
            );
          })}
        </div>

        <button
          onClick={isLoggedIn ? handleLogout : handleLogin}
          className="w-full rounded-2xl p-4 flex items-center gap-3 shadow-sm transition-all active:bg-slate-50"
          style={{ backgroundColor: "#ffffff", border: "1px solid #d9e4f2" }}
        >
          <div
            className="rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ width: "38px", height: "38px", backgroundColor: "#eef4fb" }}
          >
            <LogOut size={18} color="#122a4c" />
          </div>

          <span style={{ fontSize: "14px", color: "#122a4c", fontWeight: 600 }}>
            {isLoggedIn ? "Sair da conta" : "Entrar na conta"}
          </span>
        </button>

        <p className="mt-4 pb-2 text-center" style={{ fontSize: "11px", color: "#94a3b8" }}>
          FrescaMart v2.1.0 · Termos de uso · Privacidade
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
