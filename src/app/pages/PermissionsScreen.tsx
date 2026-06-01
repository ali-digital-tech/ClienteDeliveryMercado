import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronLeft,
  Crosshair,
  Info,
  MapPin,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useApp } from "@/app/providers/AppProvider";
import {
  disableCustomerPush,
  enableCustomerPush,
  fetchCustomerNotificationPreferences,
  hasCustomerPushRegistration,
  updateCustomerNotificationPreferences,
  type CustomerNotificationPreferences,
} from "@/features/notifications";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

type PushPermission = NotificationPermission | "unsupported";
type LocationPermission = PermissionState | "unknown" | "unsupported";

const PRIMARY = "#122a4c";

const statusConfig = {
  granted: { label: "Permitida", color: "#15803d", background: "#dcfce7" },
  denied: { label: "Bloqueada", color: "#b91c1c", background: "#fee2e2" },
  default: { label: "Não ativada", color: "#a16207", background: "#fef9c3" },
  prompt: { label: "Não ativada", color: "#a16207", background: "#fef9c3" },
  unknown: { label: "Verificar ao usar", color: "#475569", background: "#e2e8f0" },
  unsupported: { label: "Indisponível", color: "#475569", background: "#e2e8f0" },
} as const;

function getPushPermission(): PushPermission {
  return "Notification" in window ? Notification.permission : "unsupported";
}

function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];

  return (
    <span
      className="rounded-full px-2.5 py-1"
      style={{ color: config.color, backgroundColor: config.background, fontSize: 11, fontWeight: 800 }}
    >
      {config.label}
    </span>
  );
}

function PreferenceSwitch({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full p-1 transition-colors disabled:opacity-45"
      style={{ width: 46, backgroundColor: active ? PRIMARY : "#cbd5e1" }}
    >
      <span
        className="block rounded-full bg-white transition-transform"
        style={{ width: 18, height: 18, transform: active ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

export function PermissionsScreen() {
  const navigate = useNavigate();
  const { isLoggedIn, tenantPath } = useApp();
  const [pushPermission, setPushPermission] = useState<PushPermission>(() => getPushPermission());
  const [pushRegistered, setPushRegistered] = useState(() => hasCustomerPushRegistration());
  const [locationPermission, setLocationPermission] = useState<LocationPermission>("unknown");
  const [preferences, setPreferences] = useState<CustomerNotificationPreferences | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [changingPush, setChangingPush] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);

  useEffect(() => {
    const syncPushState = () => {
      setPushPermission(getPushPermission());
      setPushRegistered(hasCustomerPushRegistration());
    };

    window.addEventListener("focus", syncPushState);
    document.addEventListener("visibilitychange", syncPushState);

    return () => {
      window.removeEventListener("focus", syncPushState);
      document.removeEventListener("visibilitychange", syncPushState);
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    let browserPermission: PermissionStatus | null = null;

    const loadLocationPermission = async () => {
      if (!navigator.geolocation) {
        setLocationPermission("unsupported");
        return;
      }

      if (!navigator.permissions?.query) {
        setLocationPermission("unknown");
        return;
      }

      try {
        browserPermission = await navigator.permissions.query({ name: "geolocation" });
        if (!isActive) return;

        const syncLocationState = () => {
          if (browserPermission) setLocationPermission(browserPermission.state);
        };

        syncLocationState();
        browserPermission.onchange = syncLocationState;
      } catch {
        setLocationPermission("unknown");
      }
    };

    void loadLocationPermission();

    return () => {
      isActive = false;
      if (browserPermission) browserPermission.onchange = null;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setPreferences(null);
      return;
    }

    let isActive = true;
    setLoadingPreferences(true);

    fetchCustomerNotificationPreferences()
      .then((data) => {
        if (isActive) setPreferences(data);
      })
      .catch((error: any) => {
        if (isActive) showSystemNotice(error?.message || "Não foi possível carregar suas preferências.");
      })
      .finally(() => {
        if (isActive) setLoadingPreferences(false);
      });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn]);

  const handleEnablePush = async () => {
    if (!isLoggedIn) {
      navigate(tenantPath("login"), { state: { redirectTo: tenantPath("privacy/permissions") } });
      return;
    }

    setChangingPush(true);
    try {
      const token = await enableCustomerPush();
      setPushPermission(getPushPermission());
      setPushRegistered(Boolean(token));

      if (token) {
        setPreferences(await fetchCustomerNotificationPreferences());
      }

      showSystemNotice(token ? "Notificações ativadas neste dispositivo." : "Permissão de notificações não concedida.");
    } catch (error: any) {
      setPushPermission(getPushPermission());
      showSystemNotice(error?.message || "Não foi possível ativar notificações.");
    } finally {
      setChangingPush(false);
    }
  };

  const handleDisablePush = async () => {
    setChangingPush(true);
    try {
      await disableCustomerPush({ clearLocalOnError: false });
      setPushRegistered(false);
      showSystemNotice("Notificações push desativadas neste dispositivo.");
    } catch (error: any) {
      showSystemNotice(error?.message || "Não foi possível desativar notificações.");
    } finally {
      setPushRegistered(hasCustomerPushRegistration());
      setChangingPush(false);
    }
  };

  const handleTogglePreference = async (field: "orders_enabled" | "campaigns_enabled") => {
    if (!preferences?.id) {
      showSystemNotice("Ative as notificações push para escolher as categorias.");
      return;
    }

    setSavingPreference(true);
    try {
      const updated = await updateCustomerNotificationPreferences({ [field]: !preferences[field] });
      setPreferences(updated);
      showSystemNotice("Preferências de notificações atualizadas.");
    } catch (error: any) {
      showSystemNotice(error?.message || "Não foi possível atualizar suas preferências.");
    } finally {
      setSavingPreference(false);
    }
  };

  const handleCheckLocation = () => {
    if (!navigator.geolocation) {
      setLocationPermission("unsupported");
      showSystemNotice("Seu navegador não permite capturar localização.");
      return;
    }

    setCheckingLocation(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPermission("granted");
        setCheckingLocation(false);
        showSystemNotice("Acesso à localização exata permitido.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationPermission("denied");
          showSystemNotice("A localização foi bloqueada. Libere o acesso nas configurações do navegador ou do app instalado.");
        } else {
          showSystemNotice("Não foi possível confirmar sua localização agora. Tente novamente em alguns instantes.");
        }
        setCheckingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  const pushBlocked = pushPermission === "denied";
  const locationBlocked = locationPermission === "denied";
  const canEnablePush = pushPermission !== "unsupported" && !pushBlocked;
  const hasPreferences = Boolean(preferences?.id);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 flex items-center gap-3"
        style={{ background: "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)" }}
      >
        <button onClick={() => navigate(-1)} className="rounded-full p-2 flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: 18, fontWeight: 800 }}>Gerenciar permissões</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <section className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl flex h-10 w-10 flex-shrink-0 items-center justify-center" style={{ backgroundColor: "#eef4fb" }}>
              <Bell size={19} color={PRIMARY} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 style={{ fontSize: 14, fontWeight: 800, color: PRIMARY }}>Notificações push</h2>
                <StatusBadge status={pushPermission} />
              </div>
              <p className="mt-1" style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                Receba avisos mesmo quando o app não estiver aberto.
              </p>
              {pushPermission === "granted" && !pushRegistered && (
                <p className="mt-2" style={{ fontSize: 12, color: "#a16207", fontWeight: 700 }}>
                  Permitida no navegador, mas ainda não ativada neste dispositivo.
                </p>
              )}
              {pushRegistered && (
                <p className="mt-2 flex items-center gap-1.5" style={{ fontSize: 12, color: "#15803d", fontWeight: 700 }}>
                  <CheckCircle2 size={14} /> Dispositivo cadastrado para receber push.
                </p>
              )}
            </div>
          </div>

          {pushRegistered ? (
            <button
              onClick={() => void handleDisablePush()}
              disabled={changingPush}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 disabled:opacity-60"
              style={{ borderColor: "#fecaca", color: "#b91c1c", fontSize: 13, fontWeight: 800 }}
            >
              <BellOff size={17} /> {changingPush ? "Desativando..." : "Desativar neste dispositivo"}
            </button>
          ) : (
            <button
              onClick={() => void handleEnablePush()}
              disabled={changingPush || !canEnablePush}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY, fontSize: 13, fontWeight: 800 }}
            >
              <Smartphone size={17} /> {changingPush ? "Ativando..." : isLoggedIn ? "Ativar notificações" : "Entrar para ativar push"}
            </button>
          )}

          <p className="mt-3 flex items-start gap-1.5" style={{ fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            Desativar aqui remove este dispositivo do envio de push, mas não revoga a autorização salva pelo navegador.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: PRIMARY }}>O que receber por push</h2>
          <p className="mt-1 mb-2" style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
            O histórico dentro do app continua disponível mesmo quando o push estiver desligado.
          </p>

          {[
            { field: "orders_enabled" as const, title: "Atualizações de pedidos", description: "Confirmação, separação, entrega ou retirada e demais mudanças do pedido." },
            { field: "campaigns_enabled" as const, title: "Campanhas e promoções", description: "Ofertas e campanhas enviadas pela loja para o seu perfil." },
          ].map((option) => {
            const active = Boolean(preferences?.[option.field]);
            return (
              <div key={option.field} className="flex items-center gap-3 py-3" style={{ borderTop: "1px solid #eef2f7" }}>
                <div className="flex-1">
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{option.title}</p>
                  <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.35 }}>{option.description}</p>
                </div>
                <PreferenceSwitch
                  label={option.title}
                  active={active}
                  disabled={!hasPreferences || savingPreference}
                  onClick={() => void handleTogglePreference(option.field)}
                />
              </div>
            );
          })}

          {!isLoggedIn && (
            <p className="pt-1" style={{ fontSize: 12, color: "#64748b" }}>Entre na sua conta e ative o push para escolher as categorias.</p>
          )}
          {isLoggedIn && !loadingPreferences && !hasPreferences && (
            <p className="pt-1" style={{ fontSize: 12, color: "#64748b" }}>Ative o push neste dispositivo para liberar suas escolhas.</p>
          )}
          {loadingPreferences && <p className="pt-1" style={{ fontSize: 12, color: "#64748b" }}>Carregando preferências...</p>}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl flex h-10 w-10 flex-shrink-0 items-center justify-center" style={{ backgroundColor: "#eef4fb" }}>
              <MapPin size={19} color={PRIMARY} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 style={{ fontSize: 14, fontWeight: 800, color: PRIMARY }}>Localização exata</h2>
                <StatusBadge status={locationPermission} />
              </div>
              <p className="mt-1" style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                Usada somente quando você solicita o preenchimento do endereço pela sua localização atual.
              </p>
            </div>
          </div>
          <button
            onClick={handleCheckLocation}
            disabled={checkingLocation || locationPermission === "unsupported"}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 disabled:opacity-50"
            style={{ borderColor: "#bfd3ee", color: PRIMARY, fontSize: 13, fontWeight: 800 }}
          >
            <Crosshair size={17} /> {checkingLocation ? "Verificando..." : "Permitir ou testar localização"}
          </button>
        </section>

        {(pushBlocked || locationBlocked) && (
          <section className="rounded-2xl p-4" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} color="#c2410c" className="mt-0.5 flex-shrink-0" />
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: "#9a3412" }}>Como liberar o acesso</h2>
                <p className="mt-1" style={{ fontSize: 12, color: "#9a3412", lineHeight: 1.5 }}>
                  Abra as configurações do navegador ou do app instalado, procure as permissões deste site e permita
                  {pushBlocked && locationBlocked ? " notificações e localização" : pushBlocked ? " notificações" : " localização"}.
                  Depois, volte a esta tela para verificar novamente.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
