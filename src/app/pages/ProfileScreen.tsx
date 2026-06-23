import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Heart,
  HelpCircle,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";
import { BottomNav } from "@/shared/components/BottomNav";
import { authService } from "@/features/auth";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

const menuItems = [
  { icon: MapPin, label: "Meus endereços", path: "addresses" },
  { icon: Heart, label: "Favoritos", path: "favorites" },
  { icon: CreditCard, label: "Métodos de pagamento", path: "add-card" },
  { icon: ShoppingBag, label: "Meus pedidos", path: "orders" },
  { icon: Bell, label: "Notificações", path: "notifications-feed" },
  { icon: Shield, label: "Privacidade e segurança", path: "privacy" },
  { icon: HelpCircle, label: "Suporte", path: "support" },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const { logout, orders, favorites, tenantPath, currentMarket, currentUser, isLoggedIn, updateCurrentUser } = useApp();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [phone, setPhone] = useState(formatPhone(currentUser?.telefone || ""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const appVersion = import.meta.env.VITE_APP_VERSION?.trim();
  const footerParts = [
    currentMarket.name,
    appVersion ? `v${appVersion}` : null,
  ].filter(Boolean);

  useEffect(() => {
    setPhone(formatPhone(currentUser?.telefone || ""));
  }, [currentUser?.telefone]);

  const handleLogout = () => {
    logout();
    navigate(tenantPath("login"));
  };

  const handleLogin = () => {
    navigate(tenantPath("login"));
  };

  const handleProfileIconClick = () => {
    if (!isLoggedIn) {
      handleLogin();
      return;
    }

    setIsEditingProfile((current) => !current);
  };

  const handleSavePhone = async (event: FormEvent) => {
    event.preventDefault();

    const digits = onlyDigits(phone);

    if (digits.length < 8) {
      showSystemNotice("Informe um telefone válido.");
      return;
    }

    setIsSavingPhone(true);

    try {
      const updatedProfile = await authService.updateCurrentCustomer({
        telefone: phone.trim(),
      });
      updateCurrentUser(updatedProfile);
      setPhone(formatPhone(updatedProfile.telefone || phone));
      showSystemNotice("Telefone atualizado com sucesso.");
    } catch (error: any) {
      showSystemNotice(error?.message || "Não foi possível atualizar o telefone.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 6) {
      showSystemNotice("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showSystemNotice("As senhas não conferem.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await authService.changePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      showSystemNotice("Senha alterada com sucesso.");
    } catch (error: any) {
      showSystemNotice(error?.message || "Não foi possível alterar sua senha.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-4"
        style={{ background: "linear-gradient(160deg, var(--market-secondary-color) 0%, var(--market-primary-color) 100%)" }}
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
              <Mail size={12} color="var(--market-primary-muted-color)" />
              <p className="truncate" style={{ fontSize: "12px", color: "var(--market-primary-muted-color)" }}>
                {currentUser?.email || "Entre para acessar sua conta"}
              </p>
            </div>

            {currentUser?.telefone && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <Phone size={12} color="var(--market-primary-muted-color)" />
                <p style={{ fontSize: "12px", color: "var(--market-primary-muted-color)" }}>{currentUser.telefone}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleProfileIconClick}
            className="rounded-full p-2"
            style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
            aria-label="Editar perfil"
          >
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
              <p style={{ fontSize: "10px", color: "var(--market-primary-muted-color)" }}>{stat.label}</p>
            </div>
          ))}
        </div>

      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4" style={{ background: "#f8fafc" }}>
        {isEditingProfile && isLoggedIn && (
          <div
            className="mb-4 rounded-2xl bg-white p-4 shadow-sm"
            style={{ border: "1px solid var(--market-primary-border-color)" }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <User size={17} color="var(--market-primary-color)" />
                <h2 className="truncate" style={{ fontSize: "15px", fontWeight: 800, color: "var(--market-primary-color)" }}>
                  Editar perfil
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="rounded-full p-2"
                style={{ backgroundColor: "var(--market-primary-soft-color)" }}
                aria-label="Fechar edição"
              >
                <X size={16} color="var(--market-primary-color)" />
              </button>
            </div>

            <form onSubmit={handleSavePhone} className="mb-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Telefone</span>
                <div
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                  style={{ border: "1px solid var(--market-primary-border-color)", backgroundColor: "#f8fafc" }}
                >
                  <Phone size={18} color="var(--market-primary-color)" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(event) => setPhone(formatPhone(event.target.value))}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isSavingPhone}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-white transition-all active:scale-[0.98] disabled:cursor-wait"
                style={{
                  background: "linear-gradient(135deg, var(--market-primary-color), var(--market-secondary-color))",
                  fontSize: "14px",
                  fontWeight: 700,
                  opacity: isSavingPhone ? 0.7 : 1,
                }}
              >
                <Save size={17} />
                {isSavingPhone ? "Salvando..." : "Salvar telefone"}
              </button>
            </form>

            <div className="h-px" style={{ backgroundColor: "#eef2f7" }} />

            <form onSubmit={handleChangePassword} className="mt-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Nova senha</span>
                <div
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                  style={{ border: "1px solid var(--market-primary-border-color)", backgroundColor: "#f8fafc" }}
                >
                  <Lock size={18} color="var(--market-primary-color)" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Mínimo de 6 caracteres"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
                  </button>
                </div>
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Confirmar senha</span>
                <div
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                  style={{ border: "1px solid var(--market-primary-border-color)", backgroundColor: "#f8fafc" }}
                >
                  <Lock size={18} color="var(--market-primary-color)" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-white transition-all active:scale-[0.98] disabled:cursor-wait"
                style={{
                  background: "linear-gradient(135deg, var(--market-primary-color), var(--market-secondary-color))",
                  fontSize: "14px",
                  fontWeight: 700,
                  opacity: isChangingPassword ? 0.7 : 1,
                }}
              >
                <Lock size={17} />
                {isChangingPassword ? "Alterando..." : "Alterar senha"}
              </button>
            </form>
          </div>
        )}

        <div
          className="overflow-hidden rounded-2xl bg-white shadow-sm mb-4"
          style={{ border: "1px solid var(--market-primary-border-color)" }}
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
                  style={{ width: "38px", height: "38px", backgroundColor: "var(--market-primary-soft-color)" }}
                >
                  <Icon size={18} color="var(--market-primary-color)" />
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
          style={{ backgroundColor: "#ffffff", border: "1px solid var(--market-primary-border-color)" }}
        >
          <div
            className="rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ width: "38px", height: "38px", backgroundColor: "var(--market-primary-soft-color)" }}
          >
            <LogOut size={18} color="var(--market-primary-color)" />
          </div>

          <span style={{ fontSize: "14px", color: "var(--market-primary-color)", fontWeight: 600 }}>
            {isLoggedIn ? "Sair da conta" : "Entrar na conta"}
          </span>
        </button>

        <div
          className="mt-4 pb-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center"
          style={{ fontSize: "11px", color: "#94a3b8" }}
        >
          <span>{footerParts.join(" ")}</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => navigate(tenantPath("privacy/policy"))}
            className="underline-offset-2 active:text-slate-600"
          >
            Termos e privacidade
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
