import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, ChevronLeft, CreditCard, Lock, Plus, QrCode, ShieldCheck, Trash2 } from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";
import {
  getStoredPaymentSelection,
  getSavedPaymentCards,
  removeCustomerPaymentCard,
  savePaymentSelection,
  selectionFromSavedCard,
  type PaymentMethod,
  type SavedPaymentCard,
  type StoredPaymentSelection,
} from "@/features/payments";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

function getCardTypeLabel(method?: PaymentMethod) {
  return method === "cartao_debito" ? "Débito" : "Crédito";
}

function getBrandLabel(paymentMethodId?: string) {
  const id = String(paymentMethodId || "").toLowerCase();

  if (id.includes("visa")) return "Visa";
  if (id.includes("master")) return "Mastercard";
  if (id.includes("amex")) return "American Express";
  if (id.includes("elo")) return "Elo";
  if (id.includes("hipercard")) return "Hipercard";
  if (id.includes("hiper")) return "Hiper";
  return "Cartão";
}

export function AddCardScreen() {
  const navigate = useNavigate();
  const { marketId, tenantPath } = useApp();
  const [selection, setSelection] = useState<StoredPaymentSelection>(() => getStoredPaymentSelection());
  const [savedCards, setSavedCards] = useState<SavedPaymentCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [isRemovingCard, setIsRemovingCard] = useState(false);
  const savedCard = savedCards.find((card) => card.principal) || savedCards[0] || null;
  const savedCardLastFour = savedCard?.ultimos_quatro || "";
  const savedCardHolder = savedCard?.nome_impresso || "Cartão cadastrado";
  const savedCardPaymentMethodId = savedCard?.payment_method_id;
  const savedCardMethod = savedCard?.forma_pagamento;

  useEffect(() => {
    let active = true;
    setIsLoadingCards(true);

    getSavedPaymentCards(marketId)
      .then((cards) => {
        if (!active) return;
        setSavedCards(cards);
        const defaultCard = cards.find((card) => card.principal) || cards[0] || null;
        if (defaultCard) {
          const nextSelection = selectionFromSavedCard(defaultCard);
          setSelection(nextSelection);
          savePaymentSelection(nextSelection);
          return;
        }

        if (selection.saved_card_id) {
          const nextSelection: StoredPaymentSelection = { method: "pix" };
          setSelection(nextSelection);
          savePaymentSelection(nextSelection);
        }
      })
      .catch((error) => {
        console.error("Erro ao carregar cartões salvos:", error);
      })
      .finally(() => {
        if (active) setIsLoadingCards(false);
      });

    return () => {
      active = false;
    };
  }, [marketId, selection.saved_card_id]);

  const openCardForm = () => {
    const initialMethod = savedCard?.forma_pagamento === "cartao_debito" ? "cartao_debito" : "cartao_credito";

    navigate(tenantPath("payment"), {
      state: {
        mode: "profilePaymentMethods",
        redirectTo: tenantPath("add-card"),
        initialMethod,
      },
    });
  };

  const removeCard = async () => {
    if (!savedCard) return;

    setIsRemovingCard(true);
    try {
      await removeCustomerPaymentCard(savedCard.id);
      const nextSelection: StoredPaymentSelection = { method: "pix" };
      savePaymentSelection(nextSelection);
      setSelection(nextSelection);
      setSavedCards([]);
      showSystemNotice("Cartão removido dos métodos de pagamento.", "Cartão removido");
    } catch (error) {
      showSystemNotice(error || "Não foi possível remover o cartão.");
    } finally {
      setIsRemovingCard(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 flex items-center gap-3"
        style={{ background: "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)" }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-full p-2 flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          aria-label="Voltar"
        >
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: "18px", fontWeight: 800 }}>
            Métodos de pagamento
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div
          className="mx-auto mb-4 max-w-md rounded-2xl bg-white p-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="rounded-2xl p-3"
                style={{ backgroundColor: "#eef4fb" }}
              >
                <CreditCard size={20} color="#122a4c" />
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 900, color: "#122a4c" }}>
                  Cartões
                </h2>
                <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                  Gerencie o cartão que ficará disponível nas próximas compras.
                </p>
              </div>
            </div>
            {savedCard && <CheckCircle2 size={19} color="#16a34a" className="flex-shrink-0" />}
          </div>

          {savedCard ? (
            <div
              className="overflow-hidden rounded-2xl p-4 text-white"
              style={{
                background: "linear-gradient(135deg, #1b3d6d 0%, #122a4c 100%)",
                boxShadow: "0 14px 32px rgba(18,42,76,0.24)",
              }}
            >
              <div className="mb-7 flex items-start justify-between">
                <div
                  className="rounded-md"
                  style={{
                    width: "36px",
                    height: "28px",
                    background: "linear-gradient(135deg, #d4a843 0%, #f0c060 50%, #c89a30 100%)",
                  }}
                />
                <ShieldCheck size={24} color="white" />
              </div>

              <p style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "0.08em" }}>
                {savedCardLastFour ? `•••• •••• •••• ${savedCardLastFour}` : "•••• •••• •••• ••••"}
              </p>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.66)", fontWeight: 800 }}>
                    TITULAR
                  </p>
                  <p className="truncate" style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>
                    {savedCardHolder}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.66)", fontWeight: 800 }}>
                    BANDEIRA
                  </p>
                  <p style={{ fontSize: "12px", fontWeight: 800 }}>
                    {getBrandLabel(savedCardPaymentMethodId)} · {getCardTypeLabel(savedCardMethod)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl px-4 py-5 text-center"
              style={{ backgroundColor: "#f8fafc", border: "1px dashed #cbd5e1" }}
            >
              <CreditCard size={28} color="#94a3b8" className="mx-auto mb-2" />
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#334155" }}>
                Nenhum cartão cadastrado
              </p>
              <p className="mt-1" style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
                Adicione um cartão para deixá-lo pronto nos próximos pedidos.
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={openCardForm}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-white transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#122a4c", fontSize: "15px", fontWeight: 800 }}
            >
              <Plus size={18} />
              {isLoadingCards ? "Carregando..." : savedCard ? "Atualizar cartão" : "Adicionar cartão"}
            </button>

            {savedCard && (
              <button
                type="button"
                onClick={removeCard}
                disabled={isRemovingCard}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 transition-all active:scale-[0.98]"
                style={{ backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "14px", fontWeight: 800 }}
              >
                <Trash2 size={17} />
                {isRemovingCard ? "Removendo..." : "Remover cartão"}
              </button>
            )}
          </div>
        </div>

        <div
          className="mx-auto mb-4 max-w-md rounded-2xl bg-white p-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3" style={{ backgroundColor: "#f0fdf4" }}>
              <QrCode size={20} color="#15803d" />
            </div>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 900, color: "#122a4c" }}>
                PIX
              </h2>
              <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                Disponível na finalização do pedido quando a loja aceitar pagamento online.
              </p>
            </div>
          </div>
        </div>

        <div
          className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-2xl p-3" style={{ backgroundColor: "#f0fdf4" }}>
              <Lock size={20} color="#15803d" />
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.5 }}>
              Os dados completos do cartão são digitados em campos seguros do Mercado Pago. O app mantém apenas a forma escolhida e dados de identificação seguros.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
