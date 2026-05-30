import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, Home, Eye, KeyRound } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
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

export function OrderConfirmedScreen() {
  const navigate = useNavigate();
  const { cartTotal, discount, orders, tenantPath } = useApp();
  const [orderId, setOrderId] = useState("");
  const [rawOrderId, setRawOrderId] = useState("");
  const [show, setShow] = useState(false);
  const [savedTotal, setSavedTotal] = useState(0);
  const [savedScheduledFor, setSavedScheduledFor] = useState<string | null>(null);
  const [savedReceiptKey, setSavedReceiptKey] = useState<string | null>(null);
  const normalizedOrderId = (rawOrderId || orderId).replace(/^#/, "");
  const apiOrder = orders.find((order) => (
    [order.rawId, order.id, order.number]
      .filter(Boolean)
      .some((value) => value!.replace(/^#/, "") === normalizedOrderId)
  ));
  const displayedTotal = apiOrder?.total ?? savedTotal;
  const displayedScheduledFor = apiOrder?.scheduledFor ?? savedScheduledFor;
  const displayedReceiptKey = apiOrder?.receiptKey ?? savedReceiptKey;
  const displayedStatus = apiOrder?.type === "pickup" && apiOrder.status === "entregue"
    ? "Retirado"
    : apiOrder ? statusLabels[apiOrder.status] : "Recebido";

  useEffect(() => {
    const total = cartTotal - discount;
    let order: { id?: string; rawId?: string; total?: number | string; scheduledFor?: string | null; receiptKey?: string | null } | null = null;

    try {
      const stored = sessionStorage.getItem('cliente_delivery_last_order');
      order = stored ? JSON.parse(stored) : null;
    } catch {
      order = null;
    }

    setSavedTotal(Number(order?.total || total || 0));
    setSavedScheduledFor(order?.scheduledFor || null);
    setSavedReceiptKey(order?.receiptKey || null);
    setOrderId(order?.id || "");
    setRawOrderId(order?.rawId || order?.id || "");
    setTimeout(() => setShow(true), 100);
  }, [cartTotal, discount]);

  return (
    <div
      className="flex-1 flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, #eef4fb 0%, #ffffff 60%)",
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
        {/* Success icon */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: "100px",
            height: "100px",
            background:
              "linear-gradient(135deg, #1b3d6d, #122a4c)",
            boxShadow: "0 20px 60px rgba(18,42,76,0.35)",
            transform: show ? "scale(1)" : "scale(0)",
            transition:
              "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <CheckCircle2
            size={52}
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
              fontSize: "26px",
              fontWeight: 800,
              lineHeight: 1.2,
              color: "#122a4c",
            }}
          >
            Pedido confirmado!
          </h1>
          <p
            className="mt-2"
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#64748b",
            }}
          >
            Seu pedido foi recebido e
            <br />
            está sendo processado
          </p>
        </div>

        {/* Order card */}
        <div
          className="bg-white rounded-3xl p-6 w-full shadow-lg"
          style={{
            opacity: show ? 1 : 0,
            transform: show
              ? "translateY(0)"
              : "translateY(20px)",
            transition: "all 0.5s ease 0.5s",
            border: "1px solid #d9e4f2",
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span
                style={{ fontSize: "13px", color: "#64748b" }}
              >
                Número do pedido
              </span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 800,
                  color: "#122a4c",
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
                <div className="rounded-xl px-3 py-3 text-left" style={{ backgroundColor: "#eef4fb" }}>
                  <div className="flex items-center gap-2">
                    <KeyRound size={17} color="#122a4c" />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#122a4c" }}>
                      Chave de recebimento
                    </span>
                  </div>
                  <p className="mt-1" style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "0.28em", color: "#122a4c" }}>
                    {displayedReceiptKey}
                  </p>
                  <p className="mt-1" style={{ fontSize: "11px", color: "#64748b" }}>
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
                style={{ fontSize: "13px", color: "#64748b" }}
              >
                Entrega
              </span>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
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
              <div className="rounded-xl px-3 py-2 text-left" style={{ backgroundColor: "#fffbeb" }}>
                <p style={{ fontSize: "12px", color: "#92400e", lineHeight: 1.4, fontWeight: 600 }}>
                  Pedido feito fora do horário. A entrega será no próximo dia de mercado aberto.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span
                style={{ fontSize: "13px", color: "#64748b" }}
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

            <div
              className="h-px"
              style={{ backgroundColor: "#e2e8f0" }}
            />

            <div className="flex justify-between items-center">
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Total pago
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#122a4c",
                }}
              >
                R$ {displayedTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div
          className="bg-white rounded-2xl p-4 w-full shadow-sm"
          style={{
            opacity: show ? 1 : 0,
            transform: show
              ? "translateY(0)"
              : "translateY(20px)",
            transition: "all 0.5s ease 0.7s",
            border: "1px solid #d9e4f2",
          }}
        >
          <p
            className="mb-3 text-left"
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#334155",
            }}
          >
            Status atual
          </p>

          <div className="flex items-center gap-2">
            {[
              "Recebido",
              "Confirmado",
              "Separação",
              "Entrega",
              "Entregue",
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-1 flex-1"
              >
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: "24px",
                      height: "24px",
                      backgroundColor:
                        i === 0 ? "#122a4c" : "#e2e8f0",
                    }}
                  >
                    {i === 0 ? (
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
                      fontSize: "8px",
                      color: i === 0 ? "#122a4c" : "#94a3b8",
                      fontWeight: i === 0 ? 700 : 400,
                      textAlign: "center",
                    }}
                  >
                    {step}
                  </span>
                </div>

                {i < 4 && (
                  <div
                    className="h-0.5 flex-1 -mt-4"
                    style={{ backgroundColor: "#e2e8f0" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex-shrink-0 px-6 pb-10 pt-4 flex flex-col gap-3"
        style={{
          opacity: show ? 1 : 0,
          transition: "opacity 0.5s ease 0.9s",
        }}
      >
        <button
          onClick={() => navigate(tenantPath("order-tracking"), {
            state: { orderId: rawOrderId || orderId },
          })}
          className="w-full rounded-2xl py-4 text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#122a4c" }}
        >
          <Eye size={18} color="white" />
          <span style={{ fontSize: "15px", fontWeight: 700 }}>
            Acompanhar pedido
          </span>
        </button>

        <button
          onClick={() => navigate(tenantPath())}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#eef4fb" }}
        >
          <Home size={18} color="#122a4c" />
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#122a4c",
            }}
          >
            Voltar ao início
          </span>
        </button>
      </div>
    </div>
  );
}
