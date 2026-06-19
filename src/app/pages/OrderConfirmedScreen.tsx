import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, Home, Eye, KeyRound, CreditCard } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { PostPaymentPushPrompt } from "@/features/notifications";
import { formatBrasiliaDate } from '@/shared/lib/dateTime';

const statusLabels = {
  pendente: "Pendente",
  recebido: "Recebido",
  confirmado: "Confirmado",
  separacao: "Em separação",
  pronto: "Pronto",
  saiu: "Saiu para entrega",
  entregue: "Entregue",
  nao_entregue: "Não entregue",
  cancelado: "Cancelado",
};

const statusStepIds = ["recebido", "confirmado", "separacao", "saiu", "entregue"];

function getCurrentStepIndex(status: string | undefined) {
  if (status === "pendente") return 0;
  if (status === "pronto") return 3;

  const index = statusStepIds.indexOf(status || "recebido");
  return Math.max(index, 0);
}

export function OrderConfirmedScreen() {
  const navigate = useNavigate();
  const { cartTotal, currentMarket, discount, isLoggedIn, orders, tenantPath } = useApp();
  const [orderId, setOrderId] = useState("");
  const [rawOrderId, setRawOrderId] = useState("");
  const [show, setShow] = useState(false);
  const [savedTotal, setSavedTotal] = useState(0);
  const [savedScheduledFor, setSavedScheduledFor] = useState<string | null>(null);
  const [savedReceiptKey, setSavedReceiptKey] = useState<string | null>(null);
  const [savedPaymentMethod, setSavedPaymentMethod] = useState<string | null>(null);
  const [savedPaymentStatus, setSavedPaymentStatus] = useState<string | null>(null);
  const normalizedOrderId = (rawOrderId || orderId).replace(/^#/, "");
  const apiOrder = orders.find((order) => (
    [order.rawId, order.id, order.number]
      .filter(Boolean)
      .some((value) => value!.replace(/^#/, "") === normalizedOrderId)
  ));
  const displayedTotal = apiOrder?.total ?? savedTotal;
  const displayedScheduledFor = apiOrder?.scheduledFor ?? savedScheduledFor;
  const displayedReceiptKey = apiOrder?.receiptKey ?? savedReceiptKey;
  const displayedPaymentMethod = apiOrder?.payment?.method ?? savedPaymentMethod;
  const displayedPaymentStatus = apiOrder?.payment?.status ?? savedPaymentStatus;
  const hasPendingCashPayment = displayedPaymentMethod === "dinheiro" && displayedPaymentStatus === "pendente";
  const displayedStatus = apiOrder?.type === "pickup" && apiOrder.status === "entregue"
    ? "Retirado"
    : apiOrder ? statusLabels[apiOrder.status] : "Recebido";
  const currentStepIndex = getCurrentStepIndex(apiOrder?.status);
  const progressSteps = [
    "Recebido",
    "Confirmado",
    "Separação",
    apiOrder?.type === "pickup" ? "Retirada" : "Entrega",
    apiOrder?.type === "pickup" ? "Retirado" : "Entregue",
  ];

  useEffect(() => {
    const total = cartTotal - discount;
    let order: {
      id?: string;
      rawId?: string;
      total?: number | string;
      scheduledFor?: string | null;
      receiptKey?: string | null;
      paymentMethod?: string | null;
      paymentStatus?: string | null;
    } | null = null;

    try {
      const stored = sessionStorage.getItem('cliente_delivery_last_order');
      order = stored ? JSON.parse(stored) : null;
    } catch {
      order = null;
    }

    setSavedTotal(Number(order?.total || total || 0));
    setSavedScheduledFor(order?.scheduledFor || null);
    setSavedReceiptKey(order?.receiptKey || null);
    setSavedPaymentMethod(order?.paymentMethod || null);
    setSavedPaymentStatus(order?.paymentStatus || null);
    setOrderId(order?.id || "");
    setRawOrderId(order?.rawId || order?.id || "");
    setTimeout(() => setShow(true), 100);
  }, [cartTotal, discount]);

  const handleTrackOrder = () => {
    // Keep the orders screen behind tracking so browser back cannot reopen this confirmation.
    window.history.replaceState(window.history.state, "", tenantPath("orders"));
    navigate(tenantPath("order-tracking"), {
      state: { orderId: rawOrderId || orderId },
    });
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--market-primary-soft-color) 0%, #ffffff 60%)",
      }}
    >
      <div
        className="flex-1 min-h-0 flex flex-col items-center justify-start px-5 text-center"
        style={{
          gap: "clamp(6px, 1dvh, 12px)",
          paddingTop: "clamp(6px, 1.2dvh, 12px)",
        }}
      >
        {/* Success icon */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: "clamp(64px, 9dvh, 84px)",
            height: "clamp(64px, 9dvh, 84px)",
            background:
              "linear-gradient(135deg, var(--market-secondary-color), var(--market-primary-color))",
            boxShadow: "0 20px 60px color-mix(in srgb, var(--market-primary-color) 35%, transparent)",
            transform: show ? "scale(1)" : "scale(0)",
            transition:
              "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <CheckCircle2
            size={44}
            color="white"
            strokeWidth={2}
          />
        </div>

        <div
          style={{
            opacity: show ? 1 : 0,
            transform: show
              ? "translateY(0)"
              : "translateY(20px)",
            transition: "all 0.5s ease 0.3s",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(22px, 3.4dvh, 26px)",
              fontWeight: 800,
              lineHeight: 1.2,
              color: "var(--market-primary-color)",
            }}
          >
            Pedido confirmado!
          </h1>
          <p
            className="mt-1"
            style={{
              fontSize: "13px",
              lineHeight: 1.35,
              color: "#64748b",
            }}
          >
            Seu pedido foi recebido e está sendo processado
          </p>
        </div>

        {/* Order card */}
        <div
          className="bg-white rounded-[20px] p-3.5 w-full shadow-lg"
          style={{
            opacity: show ? 1 : 0,
            transform: show
              ? "translateY(0)"
              : "translateY(20px)",
            transition: "all 0.5s ease 0.5s",
            border: "1px solid var(--market-primary-border-color)",
          }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start gap-3">
              <span
                style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.25 }}
              >
                Número do pedido
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  lineHeight: 1.2,
                  color: "var(--market-primary-color)",
                  maxWidth: "190px",
                  overflowWrap: "anywhere",
                  textAlign: "right",
                }}
              >
                {orderId}
              </span>
            </div>

            <div
              className="h-px"
              style={{ backgroundColor: "#e2e8f0" }}
            />

            {displayedReceiptKey && (
              <>
                <div className="rounded-xl px-3 py-1.5 text-left" style={{ backgroundColor: "var(--market-primary-soft-color)" }}>
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} color="var(--market-primary-color)" />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--market-primary-color)" }}>
                      Chave de recebimento
                    </span>
                  </div>
                  <p className="mt-1" style={{ fontSize: "21px", fontWeight: 800, letterSpacing: "0.24em", lineHeight: 1.05, color: "var(--market-primary-color)" }}>
                    {displayedReceiptKey}
                  </p>
                  <p className="mt-1" style={{ fontSize: "10px", lineHeight: 1.25, color: "#64748b" }}>
                    Informe esta chave somente ao entregador no momento da entrega.
                  </p>
                </div>

                <div
                  className="h-px"
                  style={{ backgroundColor: "#e2e8f0" }}
                />
              </>
            )}

            <div className="flex justify-between items-center">
              <span
                style={{ fontSize: "12px", color: "#64748b" }}
              >
                Entrega
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: "#334155",
                  textAlign: "right",
                  maxWidth: "180px",
                }}
              >
                {displayedScheduledFor
                  ? `Agendada para ${formatBrasiliaDate(displayedScheduledFor, { dateStyle: "short", timeStyle: "short" })}`
                  : "Por ordem de pedido. Avisaremos quando sair!"}
              </span>
            </div>

            {displayedScheduledFor && (
              <div className="rounded-xl px-3 py-1.5 text-left" style={{ backgroundColor: "#fffbeb" }}>
                <p style={{ fontSize: "11px", color: "#92400e", lineHeight: 1.25, fontWeight: 600 }}>
                  Pedido feito fora do horário. A entrega será no próximo dia de atendimento.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span
                style={{ fontSize: "12px", color: "#64748b" }}
              >
                Status
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#334155",
                  textAlign: "right",
                  maxWidth: "150px",
                }}
              >
                {displayedStatus}
              </span>
            </div>

            {hasPendingCashPayment && (
              <div className="rounded-xl px-3 py-2 text-left" style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
                <div className="flex items-center gap-2">
                  <CreditCard size={15} color="#b45309" />
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#92400e" }}>
                    Pagamento pendente
                  </span>
                </div>
                <p className="mt-1" style={{ fontSize: "11px", lineHeight: 1.35, color: "#92400e" }}>
                  O pagamento em dinheiro será confirmado na entrega ou retirada.
                </p>
              </div>
            )}

            <div
              className="h-px"
              style={{ backgroundColor: "#e2e8f0" }}
            />

            <div className="flex justify-between items-center">
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                {hasPendingCashPayment ? "Total do pedido" : "Total pago"}
              </span>
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "var(--market-primary-color)",
                }}
              >
                R$ {displayedTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div
          className="bg-white rounded-2xl px-4 py-2.5 w-full shadow-sm"
          style={{
            opacity: show ? 1 : 0,
            transform: show
              ? "translateY(0)"
              : "translateY(20px)",
            transition: "all 0.5s ease 0.7s",
            border: "1px solid var(--market-primary-border-color)",
          }}
        >
          <p
            className="mb-2 text-left"
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Status atual
          </p>

          <div className="flex items-center gap-1.5">
            {progressSteps.map((step, i) => {
              const isDone = i <= currentStepIndex;

              return (
              <div
                key={i}
                className="flex items-center gap-1 flex-1"
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: "22px",
                      height: "22px",
                      backgroundColor:
                        isDone ? "var(--market-primary-color)" : "#e2e8f0",
                    }}
                  >
                    {isDone ? (
                      <span
                        style={{
                          color: "white",
                          fontSize: "12px",
                        }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#94a3b8",
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: "7px",
                      color: isDone ? "var(--market-primary-color)" : "#94a3b8",
                      fontWeight: isDone ? 700 : 400,
                      textAlign: "center",
                    }}
                  >
                    {step}
                  </span>
                </div>

                {i < 4 && (
                  <div
                    className="h-0.5 flex-1 -mt-4"
                    style={{ backgroundColor: i < currentStepIndex ? "var(--market-primary-color)" : "#e2e8f0" }}
                  />
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex-shrink-0 px-5 pt-2 flex flex-col gap-2"
        style={{
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          opacity: show ? 1 : 0,
          transition: "opacity 0.5s ease 0.9s",
        }}
      >
        <button
          onClick={handleTrackOrder}
          className="w-full rounded-2xl py-3 text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "var(--market-primary-color)" }}
        >
          <Eye size={18} color="white" />
          <span style={{ fontSize: "15px", fontWeight: 700 }}>
            Acompanhar pedido
          </span>
        </button>

        <button
          onClick={() => navigate(tenantPath(), { replace: true })}
          className="w-full rounded-2xl py-2.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "var(--market-primary-soft-color)" }}
        >
          <Home size={18} color="var(--market-primary-color)" />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--market-primary-color)",
            }}
          >
            Voltar ao início
          </span>
        </button>
      </div>
      <PostPaymentPushPrompt
        isLoggedIn={isLoggedIn}
        primaryColor={currentMarket.primaryColor || "var(--market-primary-color)"}
        delayMs={900}
      />
    </div>
  );
}
