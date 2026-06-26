import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, ChevronLeft, Copy, CreditCard, Loader2, QrCode, RefreshCw } from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";
import {
  createCashPayment,
  createCardPayment,
  createPixPayment,
  getSavedPaymentCards,
  getStoredPayerData,
  getStoredPaymentSelection,
  hasFreshCardToken,
  PayerDataForm,
  refreshPaymentById,
  resolvePixExpiration,
  savePayerData,
  savePaymentSelection,
  selectionFromSavedCard,
  splitPayerFullName,
  stripPaymentAttemptData,
  validatePayerData,
  type LocalPayment,
  type MercadoPagoPaymentResult,
  type PayerData,
  type StoredPaymentSelection,
} from "@/features/payments";
import { markPostPaymentPushPromptFromRecovery } from "@/features/notifications";
import type { Order, OrderPayment } from "@/features/orders";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

const PAYMENT_POLL_INTERVAL_MS = 5000;
const PENDING_STATUSES = new Set(["pendente", "em_processamento"]);
type SubmittingPaymentAction = "pix" | "selected-method" | null;

function matchesOrder(order: Order, orderId: string) {
  const normalized = orderId.replace(/^#/, "");
  return [order.rawId, order.id, order.number]
    .filter(Boolean)
    .some((value) => value!.replace(/^#/, "") === normalized);
}

function formatCurrency(value: number | undefined) {
  return `R$ ${(value || 0).toFixed(2).replace(".", ",")}`;
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function toOrderPayment(payment: LocalPayment): OrderPayment {
  return {
    id: payment.id,
    method: payment.forma_pagamento,
    status: payment.status,
    value: Number(payment.valor || 0),
    gatewayPaymentId: payment.gateway_pagamento_id || null,
    qrCode: payment.qr_code || null,
    qrCodeBase64: payment.qr_code_base64 || null,
    paymentLink: payment.link_pagamento || null,
    expiresAt: payment.forma_pagamento === "pix"
      ? resolvePixExpiration(payment.data_expiracao, payment.criado_em)
      : payment.data_expiracao || null,
    paidAt: payment.pago_em || null,
    createdAt: payment.criado_em || null,
  };
}

function resultToOrderPayment(result: MercadoPagoPaymentResult): OrderPayment {
  return {
    id: result.payment.id,
    method: result.payment.forma_pagamento,
    status: result.payment.status,
    value: Number(result.payment.valor || 0),
    gatewayPaymentId: result.payment.gateway_pagamento_id || null,
    qrCode: result.qr_code || null,
    qrCodeBase64: result.qr_code_base64 || null,
    paymentLink: result.ticket_url || null,
    expiresAt: result.payment.forma_pagamento === "pix"
      ? resolvePixExpiration(result.date_of_expiration)
      : result.date_of_expiration || null,
    paidAt: result.payment.status === "aprovado" ? new Date().toISOString() : null,
  };
}

function resolvePayerData(payer: Partial<PayerData>): PayerData {
  const validation = validatePayerData(payer);

  if (!validation.isValid) {
    throw new Error(
      validation.errors.full_name ||
      validation.errors.payer_email ||
      validation.errors.doc_number ||
      "Revise os dados do pagador."
    );
  }

  return validation.data;
}

export function PaymentRecoveryScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentMarket, currentUser, marketId, orders, refreshOrders, tenantPath } = useApp();
  const orderId = searchParams.get("orderId") || "";
  const storedPayer = useMemo(() => getStoredPayerData(), []);
  const nameParts = splitPayerFullName(currentUser?.nome);
  const order = useMemo(
    () => orders.find((item) => matchesOrder(item, orderId)) || null,
    [orderId, orders],
  );
  const [payer, setPayer] = useState<PayerData>({
    payer_email: storedPayer.payer_email || currentUser?.email || "",
    payer_first_name: storedPayer.payer_first_name || nameParts.firstName,
    payer_last_name: storedPayer.payer_last_name || nameParts.lastName,
    doc_type: storedPayer.doc_type || "CPF",
    doc_number: storedPayer.doc_number || "",
  });
  const [payment, setPayment] = useState<OrderPayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<SubmittingPaymentAction>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [paymentSelection, setPaymentSelection] = useState<StoredPaymentSelection>(() => getStoredPaymentSelection());

  const expiresAt = payment?.expiresAt ? new Date(payment.expiresAt).getTime() : 0;
  const isCanceled = order?.status === "cancelado";
  const isPaid = Boolean(order?.isPaid || payment?.paidAt || payment?.status === "aprovado");
  const isPending = Boolean(payment && PENDING_STATUSES.has(payment.status));
  const hasValidPix = Boolean(
    payment?.method === "pix"
      && payment.qrCode
      && isPending,
  );
  const hasExpiredPix = Boolean(
    payment?.method === "pix"
      && payment.qrCode
      && !isPending,
  );
  const selectedMethod = paymentSelection.method;
  const isCashPayment = selectedMethod === "dinheiro";
  const selectedMethodLabel =
    selectedMethod === "pix"
      ? "PIX"
      : selectedMethod === "dinheiro"
        ? "Dinheiro"
      : selectedMethod === "cartao_debito"
        ? "Cartão de débito"
        : "Cartão de crédito";
  const needsSavedCardCvv = Boolean(
    selectedMethod !== "pix" && !isCashPayment && paymentSelection.saved_card_id && !hasFreshCardToken(paymentSelection)
  );
  const needsCardConfirmation = Boolean(
    selectedMethod !== "pix" && !isCashPayment && !paymentSelection.saved_card_id && !hasFreshCardToken(paymentSelection)
  );
  const primaryColor = currentMarket?.primaryColor || "var(--market-primary-color)";
  const payerValidation = validatePayerData(payer);
  const pixActionDisabled = Boolean(submittingAction) || !payerValidation.isValid;
  const selectedMethodActionDisabled = Boolean(submittingAction) || (!isCashPayment && !payerValidation.isValid);

  const openTracking = useCallback(() => {
    navigate(`${tenantPath("order-tracking")}?orderId=${encodeURIComponent(orderId)}`, { replace: true });
  }, [navigate, orderId, tenantPath]);

  const updatePaymentStatus = useCallback(async () => {
    if (!payment?.id) return;

    setIsRefreshing(true);
    try {
      const updated = await refreshPaymentById(payment.id);
      setPayment(toOrderPayment(updated));

      if (updated.status === "aprovado") {
        markPostPaymentPushPromptFromRecovery();
        await refreshOrders();
        openTracking();
      }
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [openTracking, payment?.id, refreshOrders]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    refreshOrders()
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshOrders]);

  useEffect(() => {
    if (order?.payment) {
      setPayment(order.payment);
    }
  }, [order?.payment]);

  useEffect(() => {
    if (!marketId || paymentSelection.method === "pix" || paymentSelection.method === "dinheiro") return;

    let active = true;
    getSavedPaymentCards(marketId)
      .then((cards) => {
        if (!active || paymentSelection.saved_card_id || hasFreshCardToken(paymentSelection)) return;
        const savedCard = cards.find((card) => card.principal) || cards[0] || null;
        if (!savedCard) return;
        const selection = selectionFromSavedCard(savedCard);
        setPaymentSelection(selection);
        savePaymentSelection(selection);
      })
      .catch((error) => {
        console.error("Erro ao carregar cartão salvo:", error);
      });

    return () => {
      active = false;
    };
  }, [marketId, paymentSelection]);

  useEffect(() => {
    if (isPaid || isCanceled) {
      if (isPaid && !isCanceled) markPostPaymentPushPromptFromRecovery();
      openTracking();
    }
  }, [isCanceled, isPaid, openTracking]);

  useEffect(() => {
    if (!hasValidPix) {
      setSecondsRemaining(0);
      return;
    }

    const tick = () => setSecondsRemaining(
      expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 0
    );
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [expiresAt, hasValidPix]);

  useEffect(() => {
    if (!payment?.id || !isPending || isCanceled) return;
    const intervalId = window.setInterval(() => void updatePaymentStatus(), PAYMENT_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isCanceled, isPending, payment?.id, updatePaymentStatus]);

  const choosePaymentMethod = () => {
    if (isCanceled) {
      openTracking();
      return;
    }

    navigate(tenantPath("payment"), {
      state: {
        redirectTo: `${tenantPath("payment-recovery")}?orderId=${encodeURIComponent(orderId)}`,
      },
    });
  };

  const createPayment = async (forcePix = false) => {
    if (!order) return;
    if (isCanceled) {
      openTracking();
      return;
    }

    setSubmittingAction(forcePix ? "pix" : "selected-method");
    try {
      const selection = forcePix ? { method: "pix" as const } : paymentSelection;
      const payerData = selection.method === "dinheiro" ? null : resolvePayerData(payer);
      if (payerData) {
        savePayerData(payerData);
        setPayer(payerData);
      }

      if (forcePix) {
        savePaymentSelection(selection);
        setPaymentSelection(selection);
      }

      if (!forcePix && selection.method !== "pix" && selection.method !== "dinheiro" && !hasFreshCardToken(selection)) {
        savePaymentSelection(selection);
        choosePaymentMethod();
        return;
      }

      const result = selection.method === "pix"
        ? await createPixPayment(order.rawId || order.id, payerData as PayerData)
        : selection.method === "dinheiro"
          ? await createCashPayment(order.rawId || order.id, selection)
          : await createCardPayment(order.rawId || order.id, payerData as PayerData, selection);

      if (selection.method !== "pix" && selection.method !== "dinheiro") {
        setPaymentSelection(stripPaymentAttemptData(selection));
      }

      setPayment(resultToOrderPayment(result));
      await refreshOrders();

      if (selection.method === "dinheiro" || result.payment.status === "aprovado") {
        markPostPaymentPushPromptFromRecovery();
        openTracking();
      }
    } catch (error) {
      showSystemNotice(error || "Não foi possível iniciar o pagamento.");
    } finally {
      setSubmittingAction(null);
    }
  };

  const copyPixCode = async () => {
    if (!payment?.qrCode) return;

    try {
      await navigator.clipboard.writeText(payment.qrCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      showSystemNotice("Não foi possível copiar o código PIX.");
    }
  };

  if (isLoading && !order) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3" style={{ background: "#f8fafc" }}>
        <Loader2 className="animate-spin" size={26} color="var(--market-primary-color)" />
        <span style={{ color: "#64748b", fontSize: "14px", fontWeight: 700 }}>Carregando pedido...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: "#f8fafc" }}>
        <CreditCard size={42} color="#94a3b8" />
        <p style={{ color: "#334155", fontSize: "16px", fontWeight: 800 }}>Pedido não encontrado</p>
        <button onClick={() => navigate(tenantPath("orders"))} className="rounded-xl px-5 py-3 text-white" style={{ backgroundColor: "var(--market-primary-color)", fontSize: "13px", fontWeight: 800 }}>
          Ver meus pedidos
        </button>
      </div>
    );
  }

  if (isCanceled) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: "#f8fafc" }}>
        <CreditCard size={42} color="#94a3b8" />
        <p style={{ color: "#334155", fontSize: "16px", fontWeight: 800 }}>Pedido cancelado</p>
        <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.45 }}>
          Este pedido foi cancelado e não pode receber pagamento.
        </p>
        <button onClick={openTracking} className="rounded-xl px-5 py-3 text-white" style={{ backgroundColor: "var(--market-primary-color)", fontSize: "13px", fontWeight: 800 }}>
          Ver detalhes
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-6 pt-8 md:pt-4" style={{ background: "#f8fafc" }}>
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => navigate(tenantPath("orders"))} className="rounded-full p-2" style={{ backgroundColor: "var(--market-primary-soft-color)" }}>
            <ChevronLeft size={20} color="var(--market-primary-color)" />
          </button>
          <div>
            <h1 style={{ color: "var(--market-primary-color)", fontSize: "18px", fontWeight: 800 }}>Concluir pagamento</h1>
            <p style={{ color: "#64748b", fontSize: "12px" }}>{order.number ? `#${order.number}` : order.id}</p>
          </div>
        </div>

        <div className="mb-3 rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid var(--market-primary-border-color)" }}>
          <p style={{ color: "#64748b", fontSize: "12px" }}>Total do pedido</p>
          <p style={{ color: "var(--market-primary-color)", fontSize: "24px", fontWeight: 900 }}>{formatCurrency(order.total)}</p>
        </div>

        <div className="mb-3">
          <PayerDataForm
            value={payer}
            onChange={setPayer}
            primaryColor={primaryColor}
            description={payerValidation.isValid ? "Dados prontos para o pagamento." : "Preencha uma vez para gerar Pix ou pagar com cartão."}
          />
        </div>

        {hasValidPix ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #bbf7d0" }}>
            <div className="mb-3 flex items-center gap-2">
              <QrCode size={20} color="#15803d" />
              <div>
                <p style={{ color: "#15803d", fontSize: "14px", fontWeight: 800 }}>PIX aguardando pagamento</p>
                <p style={{ color: "#166534", fontSize: "12px" }}>QR válido por {formatCountdown(secondsRemaining)}</p>
              </div>
            </div>

            {payment?.qrCodeBase64 && (
              <img src={`data:image/png;base64,${payment.qrCodeBase64}`} alt="QR Code PIX" className="mx-auto mb-3 rounded-xl" style={{ height: "190px", width: "190px" }} />
            )}

            <textarea readOnly value={payment?.qrCode || ""} rows={4} className="w-full resize-none rounded-xl border px-3 py-2 text-xs" style={{ borderColor: "var(--market-primary-border-color)", color: "#334155" }} />
            <button onClick={copyPixCode} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-white" style={{ backgroundColor: "var(--market-primary-color)", fontSize: "13px", fontWeight: 800 }}>
              <Copy size={16} />
              {copied ? "Código copiado" : "Copiar código PIX"}
            </button>
            <button onClick={() => void updatePaymentStatus()} disabled={isRefreshing} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: "var(--market-primary-soft-color)", color: "var(--market-primary-color)", fontSize: "13px", fontWeight: 800 }}>
              <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={16} />
              Já paguei, atualizar
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #fde68a" }}>
            <div className="mb-3 flex items-center gap-2">
              {hasExpiredPix ? <QrCode size={20} color="#b45309" /> : <CreditCard size={20} color="#b45309" />}
              <div>
                <p style={{ color: "#92400e", fontSize: "14px", fontWeight: 800 }}>
                  {hasExpiredPix ? "O PIX anterior não está mais válido" : isPending ? "Pagamento ainda pendente" : "Pagamento não concluído"}
                </p>
                <p style={{ color: "#92400e", fontSize: "12px", lineHeight: 1.45 }}>
                  Gere um novo PIX ou escolha outra forma de pagamento para resgatar este pedido.
                </p>
              </div>
            </div>

            <button onClick={() => void createPayment(true)} disabled={pixActionDisabled} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-white disabled:opacity-60" style={{ backgroundColor: "var(--market-primary-color)", fontSize: "13px", fontWeight: 800 }}>
              {submittingAction === "pix" ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
              {payerValidation.isValid ? "Gerar novo PIX" : "Complete os dados do pagador"}
            </button>
            <button onClick={choosePaymentMethod} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: "var(--market-primary-soft-color)", color: "var(--market-primary-color)", fontSize: "13px", fontWeight: 800 }}>
              <CreditCard size={16} />
              Alterar forma de pagamento
            </button>

            {selectedMethod !== "pix" && (
              <button onClick={() => void createPayment()} disabled={selectedMethodActionDisabled} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 disabled:opacity-60" style={{ borderColor: "var(--market-primary-border-color)", color: "var(--market-primary-color)", fontSize: "13px", fontWeight: 800 }}>
                {submittingAction === "selected-method" ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {needsSavedCardCvv
                  ? "Informar CVV do cartão salvo"
                  : needsCardConfirmation
                    ? "Confirmar dados do cartão"
                    : isCashPayment
                      ? "Finalizar com Dinheiro"
                      : `Tentar com ${selectedMethodLabel}`}
              </button>
            )}
          </div>
        )}

        <button onClick={openTracking} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3" style={{ borderColor: "#fecaca", color: "#b91c1c", backgroundColor: "#fff", fontSize: "13px", fontWeight: 800 }}>
          Ver detalhes ou cancelar pedido
        </button>
      </div>
    </div>
  );
}
