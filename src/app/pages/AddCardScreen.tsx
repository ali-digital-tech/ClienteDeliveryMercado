import { type UIEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, ChevronLeft, CreditCard, Lock, Plus, QrCode, ShieldCheck, Trash2 } from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";
import {
  getStoredPaymentSelection,
  getSavedPaymentCards,
  removeCustomerPaymentCard,
  savePaymentSelection,
  selectionFromSavedCard,
  setPrincipalCustomerPaymentCard,
  type CardPaymentMethod,
  type PaymentMethod,
  type SavedPaymentCard,
  type StoredPaymentSelection,
} from "@/features/payments";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";

function getCardTypeLabel(method?: PaymentMethod) {
  return method === "cartao_debito" ? "Débito" : "Crédito";
}

type SavedPaymentCardGroup = SavedPaymentCard & {
  cards: SavedPaymentCard[];
  formas_pagamento: CardPaymentMethod[];
  group_key: string;
};

function getCardGroupLabel(group: SavedPaymentCardGroup) {
  const hasCredit = group.formas_pagamento.includes("cartao_credito");
  const hasDebit = group.formas_pagamento.includes("cartao_debito");

  if (hasCredit && hasDebit) return "Crédito e débito";
  return getCardTypeLabel(group.formas_pagamento[0]);
}

function groupSavedCards(cards: SavedPaymentCard[]): SavedPaymentCardGroup[] {
  const groups = new Map<string, SavedPaymentCard[]>();

  cards.forEach((card) => {
    const key = card.gateway_card_id || card.id;
    groups.set(key, [...(groups.get(key) || []), card]);
  });

  return Array.from(groups.entries()).map(([groupKey, groupCards]) => {
    const representative = groupCards.find((card) => card.principal) || groupCards[0];
    const formasPagamento = Array.from(
      new Set(groupCards.map((card) => card.forma_pagamento))
    ) as CardPaymentMethod[];

    return {
      ...representative,
      principal: groupCards.some((card) => card.principal),
      cards: groupCards,
      formas_pagamento: formasPagamento,
      group_key: groupKey,
    };
  });
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
  const [processingCardId, setProcessingCardId] = useState("");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const groupedCards = groupSavedCards(savedCards);
  const principalCard = savedCards.find((card) => card.principal) || savedCards[0] || null;

  const syncStoredSelection = useCallback((cards: SavedPaymentCard[]) => {
    const hasSelectedCard = selection.saved_card_id
      ? cards.some((card) => card.id === selection.saved_card_id)
      : false;

    if (cards.length === 0 && selection.saved_card_id) {
      const nextSelection: StoredPaymentSelection = { method: "pix" };
      setSelection(nextSelection);
      savePaymentSelection(nextSelection);
      return;
    }

    if (selection.saved_card_id && !hasSelectedCard) {
      const fallbackCard = cards.find((card) => card.principal) || cards[0] || null;
      const nextSelection = fallbackCard ? selectionFromSavedCard(fallbackCard) : { method: "pix" as const };
      setSelection(nextSelection);
      savePaymentSelection(nextSelection);
    }
  }, [selection.saved_card_id]);

  const loadSavedCards = useCallback(async () => {
    setIsLoadingCards(true);

    try {
      const cards = await getSavedPaymentCards(marketId);
      setSavedCards(cards);
      syncStoredSelection(cards);
    } catch (error) {
      console.error("Erro ao carregar cartões salvos:", error);
    } finally {
      setIsLoadingCards(false);
    }
  }, [marketId, syncStoredSelection]);

  useEffect(() => {
    void loadSavedCards();
  }, [loadSavedCards]);

  useEffect(() => {
    setActiveCardIndex((currentIndex) => (
      groupedCards.length > 0 ? Math.min(currentIndex, groupedCards.length - 1) : 0
    ));
  }, [groupedCards.length]);

  const handleCardsScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const carousel = event.currentTarget;
    const slides = Array.from(
      carousel.querySelectorAll<HTMLElement>("[data-payment-card-slide='true']")
    );

    if (slides.length === 0) return;

    const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    const closestIndex = slides.reduce((closest, slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - carouselCenter);

      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;

    setActiveCardIndex((currentIndex) => (
      currentIndex === closestIndex ? currentIndex : closestIndex
    ));
  }, []);

  const openCardForm = () => {
    const initialMethod = principalCard?.forma_pagamento === "cartao_debito" ? "cartao_debito" : "cartao_credito";

    navigate(tenantPath("payment"), {
      state: {
        mode: "profilePaymentMethods",
        redirectTo: tenantPath("add-card"),
        initialMethod,
      },
    });
  };

  const makePrincipal = async (card: SavedPaymentCardGroup) => {
    if (card.principal) return;

    setProcessingCardId(card.group_key);
    try {
      const updatedCard = await setPrincipalCustomerPaymentCard(card.id);
      const nextSelection = selectionFromSavedCard(updatedCard);
      savePaymentSelection(nextSelection);
      setSelection(nextSelection);
      await loadSavedCards();
      showSystemNotice("Cartão principal atualizado.", "Cartão principal");
    } catch (error) {
      showSystemNotice(error || "Não foi possível definir o cartão principal.");
    } finally {
      setProcessingCardId("");
    }
  };

  const removeCard = async (card: SavedPaymentCardGroup) => {
    setProcessingCardId(card.group_key);

    try {
      for (const cardToRemove of card.cards) {
        await removeCustomerPaymentCard(cardToRemove.id);
      }
      const remainingCards = await getSavedPaymentCards(marketId);
      setSavedCards(remainingCards);

      const fallbackCard = remainingCards.find((item) => item.principal) || remainingCards[0] || null;
      const nextSelection = fallbackCard ? selectionFromSavedCard(fallbackCard) : { method: "pix" as const };
      savePaymentSelection(nextSelection);
      setSelection(nextSelection);
      showSystemNotice("Cartão removido dos métodos de pagamento.", "Cartão removido");
    } catch (error) {
      showSystemNotice(error || "Não foi possível remover o cartão.");
    } finally {
      setProcessingCardId("");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 flex items-center gap-3"
        style={{ background: "linear-gradient(160deg, var(--market-secondary-color) 0%, var(--market-primary-color) 100%)" }}
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
          style={{ border: "1px solid var(--market-primary-border-color)" }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="rounded-2xl p-3"
                style={{ backgroundColor: "var(--market-primary-soft-color)" }}
              >
                <CreditCard size={20} color="var(--market-primary-color)" />
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 900, color: "var(--market-primary-color)" }}>
                  Cartões
                </h2>
                <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                  Gerencie os cartões que ficarão disponíveis nas próximas compras.
                </p>
              </div>
            </div>
            {principalCard && <CheckCircle2 size={19} color="#16a34a" className="flex-shrink-0" />}
          </div>

          {groupedCards.length > 0 ? (
            <div className="space-y-2">
              <div
                onScroll={handleCardsScroll}
                className="-mx-4 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-1 scrollbar-hide scroll-smooth"
                style={{
                  scrollSnapType: "x mandatory",
                  WebkitOverflowScrolling: "touch",
                }}
                aria-label="Cartões salvos"
              >
                <div className="flex gap-3">
                  {groupedCards.map((card, index) => {
                    const isActiveCard = index === activeCardIndex;

                    return (
                      <div
                        key={card.group_key}
                        data-payment-card-slide="true"
                        className="min-w-[88%] max-w-[88%] flex-shrink-0"
                        style={{
                          scrollSnapAlign: "center",
                          transform: isActiveCard ? "translateY(0) scale(1)" : "translateY(4px) scale(0.96)",
                          opacity: isActiveCard ? 1 : 0.82,
                          transition: "transform 180ms ease, opacity 180ms ease",
                        }}
                      >
                        <div
                          className="overflow-hidden rounded-2xl p-4 text-white"
                          style={{
                            background: card.principal
                              ? "linear-gradient(135deg, var(--market-secondary-color) 0%, var(--market-primary-color) 100%)"
                              : "linear-gradient(135deg, #475569 0%, #334155 100%)",
                            boxShadow: isActiveCard
                              ? "0 16px 36px rgba(18,42,76,0.22)"
                              : "0 10px 24px rgba(18,42,76,0.12)",
                            transition: "box-shadow 180ms ease",
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
                            {card.principal ? <ShieldCheck size={24} color="white" /> : <CreditCard size={24} color="rgba(255,255,255,0.82)" />}
                          </div>

                          <p style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "0.08em" }}>
                            {card.ultimos_quatro ? `•••• •••• •••• ${card.ultimos_quatro}` : "•••• •••• •••• ••••"}
                          </p>

                          <div className="mt-5 flex items-end justify-between gap-4">
                            <div className="min-w-0">
                              <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.66)", fontWeight: 800 }}>
                                TITULAR
                              </p>
                              <p className="truncate" style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>
                                {card.nome_impresso || "Cartão cadastrado"}
                              </p>
                            </div>
                            <div className="min-w-0 text-right">
                              <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.66)", fontWeight: 800 }}>
                                BANDEIRA
                              </p>
                              <p className="truncate" style={{ fontSize: "12px", fontWeight: 800 }}>
                                {getBrandLabel(card.payment_method_id)} · {getCardGroupLabel(card)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => void makePrincipal(card)}
                              disabled={card.principal || processingCardId === card.group_key}
                              className="rounded-xl px-3 py-2.5 disabled:opacity-60"
                              style={{ backgroundColor: "rgba(255,255,255,0.14)", color: "white", fontSize: "12px", fontWeight: 800 }}
                            >
                              {card.principal ? "Principal" : "Tornar principal"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeCard(card)}
                              disabled={processingCardId === card.group_key}
                              className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 disabled:opacity-60"
                              style={{ backgroundColor: "rgba(254,242,242,0.96)", color: "#dc2626", fontSize: "12px", fontWeight: 800 }}
                            >
                              <Trash2 size={14} />
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {groupedCards.length > 1 && (
                <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
                  {groupedCards.map((card, index) => (
                    <span
                      key={card.group_key}
                      className="rounded-full transition-all"
                      style={{
                        width: index === activeCardIndex ? "18px" : "6px",
                        height: "6px",
                        backgroundColor: index === activeCardIndex
                          ? "var(--market-primary-color)"
                          : "var(--market-primary-border-color)",
                      }}
                    />
                  ))}
                </div>
              )}
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
              style={{ backgroundColor: "var(--market-primary-color)", fontSize: "15px", fontWeight: 800 }}
            >
              <Plus size={18} />
              {isLoadingCards ? "Carregando..." : "Adicionar cartão"}
            </button>
          </div>
        </div>

        <div
          className="mx-auto mb-4 max-w-md rounded-2xl bg-white p-4 shadow-sm"
          style={{ border: "1px solid var(--market-primary-border-color)" }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3" style={{ backgroundColor: "#f0fdf4" }}>
              <QrCode size={20} color="#15803d" />
            </div>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 900, color: "var(--market-primary-color)" }}>
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
          style={{ border: "1px solid var(--market-primary-border-color)" }}
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
