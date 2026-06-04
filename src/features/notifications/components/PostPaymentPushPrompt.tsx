import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Loader2, X } from "lucide-react";
import {
  enableCustomerPush,
  hasCustomerPushRegistration,
  updateCustomerNotificationPreferences,
} from "@/features/notifications/services/notificationsService";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

const PROMPT_LAST_SEEN_STORAGE_KEY = "customer_post_payment_push_prompt_last_seen_at";
const PAYMENT_RECOVERY_PROMPT_SESSION_KEY = "customer_post_payment_push_prompt_from_recovery";
const PROMPT_REPEAT_INTERVAL_MS = 24 * 60 * 60 * 1000;

function readLastSeenAt() {
  try {
    return Number(localStorage.getItem(PROMPT_LAST_SEEN_STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function registerPromptSeen() {
  try {
    localStorage.setItem(PROMPT_LAST_SEEN_STORAGE_KEY, String(Date.now()));
  } catch {
    // If localStorage is unavailable, the prompt still works for the current render.
  }
}

function canShowPostPaymentPushPrompt(isLoggedIn: boolean) {
  if (!isLoggedIn) return false;
  if (hasCustomerPushRegistration()) return false;
  if ("Notification" in window && Notification.permission === "denied") return false;

  const lastSeenAt = readLastSeenAt();
  if (lastSeenAt && Date.now() - lastSeenAt < PROMPT_REPEAT_INTERVAL_MS) return false;

  return true;
}

export function markPostPaymentPushPromptFromRecovery() {
  try {
    sessionStorage.setItem(PAYMENT_RECOVERY_PROMPT_SESSION_KEY, "1");
  } catch {
    // Session flag is only a UX hint; payment flow should continue without it.
  }
}

export function consumePostPaymentPushPromptFromRecovery() {
  try {
    const shouldShow = sessionStorage.getItem(PAYMENT_RECOVERY_PROMPT_SESSION_KEY) === "1";
    if (shouldShow) sessionStorage.removeItem(PAYMENT_RECOVERY_PROMPT_SESSION_KEY);
    return shouldShow;
  } catch {
    return false;
  }
}

type PostPaymentPushPromptProps = {
  isLoggedIn: boolean;
  primaryColor?: string;
  delayMs?: number;
  requireRecoverySignal?: boolean;
};

export function PostPaymentPushPrompt({
  isLoggedIn,
  primaryColor = "#122a4c",
  delayMs = 0,
  requireRecoverySignal = false,
}: PostPaymentPushPromptProps) {
  const [visible, setVisible] = useState(false);
  const [activating, setActivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const hasRecoverySignal = requireRecoverySignal
      ? consumePostPaymentPushPromptFromRecovery()
      : true;

    if (!hasRecoverySignal || !canShowPostPaymentPushPrompt(isLoggedIn)) return;

    const timerId = window.setTimeout(() => {
      registerPromptSeen();
      setVisible(true);
    }, delayMs);

    return () => window.clearTimeout(timerId);
  }, [delayMs, isLoggedIn, requireRecoverySignal]);

  const handleEnable = async () => {
    setActivating(true);
    setErrorMessage("");

    try {
      const token = await enableCustomerPush(true);

      if (!token) {
        setErrorMessage("Permissão de notificações não concedida. Você pode ativar depois nas configurações.");
        return;
      }

      await updateCustomerNotificationPreferences({
        orders_enabled: true,
        campaigns_enabled: true,
      });

      setVisible(false);
      showSystemNotice("Notificações ativadas para pedidos, campanhas e promoções.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Não foi possível ativar notificações neste dispositivo.");
    } finally {
      setActivating(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true" aria-labelledby="post-payment-push-title">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ border: "1px solid #d9e4f2" }}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: "#eef4fb" }}>
              <Bell size={20} color={primaryColor} />
            </div>
            <div>
              <h3 id="post-payment-push-title" style={{ color: "#122a4c", fontSize: 16, fontWeight: 900 }}>
                Receba atualizações do seu pedido
              </h3>
              <p className="mt-1" style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                Avisaremos sobre confirmação, separação, entrega ou retirada, além de campanhas e promoções.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-full p-1.5 text-slate-400 active:bg-slate-100"
            aria-label="Fechar convite de notificações"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <p className="flex items-start gap-2" style={{ color: "#15803d", fontSize: 12, lineHeight: 1.45, fontWeight: 700 }}>
              <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
              As duas categorias serão ativadas automaticamente. Você pode mudar isso depois em permissões.
            </p>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
              {errorMessage}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={activating}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-white disabled:opacity-60"
              style={{ backgroundColor: primaryColor, fontSize: 13, fontWeight: 900 }}
            >
              {activating && <Loader2 className="animate-spin" size={16} />}
              {activating ? "Ativando..." : "Ativar notificações"}
            </button>
            <button
              type="button"
              onClick={() => setVisible(false)}
              disabled={activating}
              className="w-full rounded-xl px-4 py-3 disabled:opacity-60"
              style={{ backgroundColor: "#eef4fb", color: "#122a4c", fontSize: 13, fontWeight: 800 }}
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
