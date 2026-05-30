import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  CircleX,
  CreditCard,
  Home,
  Loader2,
  KeyRound,
  MessageCircle,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Truck,
  User,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { getOrdersByMarketId, loadOrderItems, type Order } from "@/features/orders";
import { formatCartQuantity } from "@/features/cart";
import { ProductImage } from "@/features/products";
import { formatBrasiliaDate } from "@/shared/lib/dateTime";

const statusConfig: Record<Order["status"], { label: string; color: string; bg: string }> = {
  pendente: { label: "Pendente", color: "#92400e", bg: "#fffbeb" },
  recebido: { label: "Recebido", color: "#1b3d6d", bg: "#eef4fb" },
  confirmado: { label: "Confirmado", color: "#122a4c", bg: "#e8f0fb" },
  separacao: { label: "Em separação", color: "#2f5b93", bg: "#edf3fb" },
  pronto: { label: "Pronto", color: "#1e40af", bg: "#dbeafe" },
  saiu: { label: "Saiu para entrega", color: "#3f5f8a", bg: "#eff4fb" },
  entregue: { label: "Entregue", color: "#122a4c", bg: "#eef4fb" },
  nao_entregue: { label: "Não entregue", color: "#b91c1c", bg: "#fef2f2" },
  cancelado: { label: "Cancelado", color: "#b91c1c", bg: "#fef2f2" },
};

type ProgressStep = {
  id: string;
  label: string;
  desc: string;
  time: string;
  icon: LucideIcon;
  done: boolean;
  active: boolean;
  failed?: boolean;
};

function formatCurrency(value: number | undefined) {
  return `R$ ${(value || 0).toFixed(2).replace(".", ",")}`;
}

function formatOrderCode(order: Order) {
  if (order.number) return `#${order.number}`;
  if (order.id.startsWith("#")) return order.id;
  return `#${order.id.slice(0, 8)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";

  return formatBrasiliaDate(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVehicle(order: Order) {
  const vehicle = order.deliveryInfo?.vehicle;
  if (!vehicle) return null;

  const name = [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || vehicle.type || "Automóvel";
  const details = [vehicle.color, vehicle.plate].filter(Boolean).join(" · ");
  return details ? `${name} (${details})` : name;
}

function getWhatsappPhone(phone: string | null | undefined) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildWhatsappUrl(phone: string | null | undefined, message: string) {
  const normalizedPhone = getWhatsappPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function getStoredOrderId() {
  try {
    const stored = sessionStorage.getItem("cliente_delivery_last_order");
    const order = stored ? JSON.parse(stored) : null;
    return order?.rawId || order?.id || "";
  } catch {
    return "";
  }
}

function matchesOrder(order: Order, orderId: string) {
  const normalized = orderId.replace(/^#/, "");
  return [
    order.rawId,
    order.id,
    order.id.replace(/^#/, ""),
    order.number,
  ].some((value) => value && value.replace(/^#/, "") === normalized);
}

function buildSteps(order: Order): ProgressStep[] {
  const isPickup = order.type === "pickup";
  const isNotDelivered = order.status === "nao_entregue";

  if (order.status === "cancelado") {
    return [
      {
        id: "recebido",
        label: "Pedido recebido",
        desc: "Pedido registrado no sistema",
        time: formatDateTime(order.createdAt),
        icon: Package,
        done: true,
        active: false,
      },
      {
        id: "cancelado",
        label: "Pedido cancelado",
        desc: "Pedido cancelado",
        time: formatDateTime(order.canceledAt),
        icon: CircleX,
        done: false,
        active: true,
        failed: true,
      },
    ];
  }

  const definitions = [
    {
      id: "recebido",
      label: "Pedido recebido",
      desc: "Pedido registrado no sistema",
      time: formatDateTime(order.createdAt),
      icon: Package,
    },
    {
      id: "confirmado",
      label: "Pedido confirmado",
      desc: "Confirmação do mercado",
      time: formatDateTime(order.confirmedAt),
      icon: CheckCircle2,
    },
    {
      id: "separacao",
      label: "Em separação",
      desc: "Produtos em preparação",
      time: formatDateTime(order.separationAt),
      icon: ShoppingBag,
    },
    {
      id: "pronto",
      label: isPickup ? "Pronto para retirada" : "Pedido pronto para envio",
      desc: isPickup ? "Disponível para retirada no mercado" : "Aguardando saída para entrega",
      time: formatDateTime(order.readyAt),
      icon: Package,
    },
    ...(!isPickup ? [{
      id: "saiu",
      label: "Saiu para entrega",
      desc: "Pedido em rota de entrega",
      time: formatDateTime(order.outForDeliveryAt || order.deliveryInfo?.outForDeliveryAt),
      icon: Truck,
    }] : []),
    {
      id: isNotDelivered ? "nao_entregue" : "entregue",
      label: isNotDelivered ? "Não entregue" : isPickup ? "Retirado" : "Entregue",
      desc: isNotDelivered
        ? "Entrega não concluída pelo entregador"
        : isPickup ? "Pedido retirado no mercado" : "Pedido entregue ao cliente",
      time: formatDateTime(isNotDelivered ? order.deliveryInfo?.failedAt : order.deliveredAt),
      icon: isNotDelivered ? AlertTriangle : Home,
      failed: isNotDelivered,
    },
  ];
  const currentStepId = order.status === "pendente" ? "recebido" : order.status;
  const currentIndex = Math.max(definitions.findIndex((step) => step.id === currentStepId), 0);

  return definitions.map((step, index) => ({
    ...step,
    done: index < currentIndex || order.status === "entregue",
    active: index === currentIndex && order.status !== "entregue",
  }));
}

export function OrderTrackingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { marketId, currentMarket, orders, isLoggedIn, tenantPath } = useApp();
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isRefreshingOrder, setIsRefreshingOrder] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<Order["items"]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);

  const selectedOrderId = useMemo(() => {
    const state = location.state as { orderId?: string } | null;
    return searchParams.get('orderId') || state?.orderId || getStoredOrderId();
  }, [location.state, searchParams]);

  const contextSelectedOrder = useMemo(() => {
    if (selectedOrderId) {
      const order = orders.find((item) => matchesOrder(item, selectedOrderId));
      if (order) return order;
    }

    return orders.find((order) => !["entregue", "nao_entregue", "cancelado"].includes(order.status)) || orders[0] || null;
  }, [orders, selectedOrderId]);

  const selectedOrder = trackedOrder || contextSelectedOrder;

  const refreshOrderInfo = useCallback(async (showSpinner = true) => {
    if (!isLoggedIn || refreshingRef.current) return null;

    refreshingRef.current = true;
    if (showSpinner) setIsRefreshingOrder(true);

    try {
      const latestOrders = await getOrdersByMarketId(marketId);
      const nextOrder = selectedOrderId
        ? latestOrders.find((item) => matchesOrder(item, selectedOrderId)) || null
        : latestOrders.find((order) => !["entregue", "nao_entregue", "cancelado"].includes(order.status)) || latestOrders[0] || null;

      setTrackedOrder(nextOrder);
      return nextOrder;
    } finally {
      refreshingRef.current = false;
      if (showSpinner) setIsRefreshingOrder(false);
    }
  }, [isLoggedIn, marketId, selectedOrderId]);

  useEffect(() => {
    setTrackedOrder(contextSelectedOrder);
  }, [contextSelectedOrder]);

  useEffect(() => {
    if (!isLoggedIn) return;

    let isActive = true;
    setIsLoadingOrders(true);

    refreshOrderInfo(false).finally(() => {
      if (isActive) setIsLoadingOrders(false);
    });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn, refreshOrderInfo]);

  useEffect(() => {
    if (!isLoggedIn || !selectedOrder || ["entregue", "nao_entregue", "cancelado"].includes(selectedOrder.status)) return;

    const intervalId = window.setInterval(() => {
      void refreshOrderInfo(false);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [isLoggedIn, refreshOrderInfo, selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) {
      setOrderItems([]);
      return;
    }

    let isActive = true;
    setIsLoadingItems(true);

    loadOrderItems(selectedOrder)
      .then((items) => {
        if (isActive) setOrderItems(items);
      })
      .catch((error) => {
        console.error("Erro ao carregar itens do pedido:", error);
        if (isActive) setOrderItems(selectedOrder.items);
      })
      .finally(() => {
        if (isActive) setIsLoadingItems(false);
      });

    return () => {
      isActive = false;
    };
  }, [selectedOrder]);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (event.currentTarget.scrollTop > 0) {
      touchStartYRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (isRefreshingOrder || touchStartYRef.current === null) return;

    const deltaY = (event.touches[0]?.clientY ?? 0) - touchStartYRef.current;
    const isAtTop = event.currentTarget.scrollTop <= 0;

    if (!isAtTop || deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    if (deltaY > 8) {
      event.preventDefault();
      setPullDistance(Math.min(deltaY * 0.45, 64));
    }
  }, [isRefreshingOrder]);

  const handleTouchEnd = useCallback(() => {
    const shouldRefresh = pullDistance >= 52;
    touchStartYRef.current = null;
    setPullDistance(0);

    if (shouldRefresh) {
      void refreshOrderInfo(true);
    }
  }, [pullDistance, refreshOrderInfo]);

  if (isLoadingOrders && orders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: "#f8fafc" }}>
        <Loader2 className="animate-spin" size={28} color="#122a4c" />
        <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>
          Carregando pedido...
        </p>
      </div>
    );
  }

  if (!selectedOrder) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
        <div className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 border-b bg-white" style={{ borderColor: "#d9e4f2" }}>
          <button onClick={() => navigate(-1)} className="rounded-full p-2" style={{ backgroundColor: "#eef4fb" }}>
            <ChevronLeft size={20} color="#122a4c" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
          <ReceiptText size={44} color="#94a3b8" />
          <p style={{ fontSize: "16px", fontWeight: 800, color: "#334155" }}>
            Pedido não encontrado
          </p>
          <button
            onClick={() => navigate(tenantPath("orders"))}
            className="rounded-2xl px-5 py-3 text-white"
            style={{ backgroundColor: "#122a4c", fontSize: "14px", fontWeight: 700 }}
          >
            Ver meus pedidos
          </button>
        </div>
      </div>
    );
  }

  const defaultStatus = statusConfig[selectedOrder.status] ?? statusConfig.recebido;
  const status = selectedOrder.type === "pickup" && selectedOrder.status === "entregue"
    ? { ...defaultStatus, label: "Retirado" }
    : defaultStatus;
  const steps = buildSteps(selectedOrder);
  const hasDiscount = Boolean(selectedOrder.discount && selectedOrder.discount > 0);
  const hasDeliveryFee = Boolean(selectedOrder.deliveryFee && selectedOrder.deliveryFee > 0);
  const isFinished = ["entregue", "nao_entregue", "cancelado"].includes(selectedOrder.status);
  const assignedDriver = selectedOrder.type === "delivery" ? selectedOrder.deliveryInfo?.driver : null;
  const assignedVehicle = selectedOrder.type === "delivery" ? formatVehicle(selectedOrder) : null;
  const deliveryFailureReason = selectedOrder.deliveryInfo?.failureReason || "";
  const marketWhatsappUrl = buildWhatsappUrl(
    currentMarket.whatsappSupport || currentMarket.phone,
    `Olá, ${currentMarket.name}! Preciso de ajuda com o pedido ${formatOrderCode(selectedOrder)}, que consta como não entregue.`,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 border-b"
        style={{
          background: "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2"
            style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
          >
            <ChevronLeft size={20} color="white" />
          </button>

          <div className="text-center min-w-0 px-3">
            <h1 className="text-white" style={{ fontSize: "16px", fontWeight: 800 }}>
              {isFinished ? "Detalhes do pedido" : "Acompanhando pedido"}
            </h1>
            <p className="truncate" style={{ fontSize: "12px", color: "#c7d7ee" }}>
              {formatOrderCode(selectedOrder)}
            </p>
          </div>

          <div className="rounded-full p-2" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
            <ReceiptText size={20} color="white" />
          </div>
        </div>

        <div
          className="rounded-2xl p-3 flex items-center gap-3 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <div className="rounded-xl p-2" style={{ backgroundColor: "rgba(255,255,255,0.95)" }}>
            <Package size={20} color="#122a4c" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white" style={{ fontSize: "13px", fontWeight: 700 }}>
              {selectedOrder.type === "delivery" ? "Entrega por ordem de pedido" : "Retirada no mercado"}
            </p>
            <p className="truncate" style={{ fontSize: "12px", color: "#c7d7ee" }}>
              Realizado em {formatDateTime(selectedOrder.createdAt)}
            </p>
          </div>

          <div className="rounded-xl px-2 py-1" style={{ backgroundColor: status.bg }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: status.color }}>
              {status.label}
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ background: "#f8fafc", overscrollBehaviorY: "contain" }}
      >
        {(pullDistance > 0 || isRefreshingOrder) && (
          <div
            className="mb-2 flex items-center justify-center overflow-hidden transition-[height]"
            style={{ height: isRefreshingOrder ? "36px" : `${pullDistance}px` }}
          >
            <div className="flex items-center justify-center rounded-full bg-white shadow-sm" style={{ width: "30px", height: "30px", border: "1px solid #d9e4f2" }}>
              <RefreshCw className={isRefreshingOrder ? "animate-spin" : ""} size={15} color="#122a4c" />
            </div>
          </div>
        )}

        {selectedOrder.type === "delivery" && selectedOrder.receiptKey && !isFinished && (
          <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ border: "1px solid #bfd3ee", backgroundColor: "#eef4fb" }}>
            <div className="flex items-center gap-2">
              <KeyRound size={18} color="#122a4c" />
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#122a4c" }}>
                Chave de recebimento
              </p>
            </div>
            <p className="mt-2" style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "0.3em", color: "#122a4c" }}>
              {selectedOrder.receiptKey}
            </p>
            <p className="mt-1" style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
              Informe esta chave somente ao entregador no momento da entrega.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
          <h3 className="mb-4" style={{ fontSize: "14px", fontWeight: 700, color: "#122a4c" }}>
            {isFinished ? "Histórico do pedido" : "Progresso do pedido"}
          </h3>

          <div className="flex flex-col">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isFailedStep = Boolean(step.failed);
              const nextStepFailed = Boolean(steps[index + 1]?.failed);
              const stepDoneColor = isFailedStep ? "#dc2626" : "#122a4c";
              const stepActiveBg = isFailedStep ? "#fef2f2" : "#eef4fb";
              const stepActiveColor = isFailedStep ? "#b91c1c" : "#122a4c";

              return (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: step.done || isFailedStep ? stepDoneColor : step.active ? stepActiveBg : "#f1f5f9",
                        border: step.active ? `2px solid ${stepDoneColor}` : "none",
                      }}
                    >
                      <Icon size={16} color={step.done || isFailedStep ? "white" : step.active ? stepActiveColor : "#94a3b8"} />
                    </div>

                    {index < steps.length - 1 && (
                      <div
                        className="w-0.5 flex-1 my-1"
                        style={{
                          backgroundColor: step.done ? (nextStepFailed ? "#dc2626" : stepDoneColor) : "#e2e8f0",
                          minHeight: "24px",
                        }}
                      />
                    )}
                  </div>

                  <div className="pb-4 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: step.active || step.done ? 700 : 500,
                          color: isFailedStep ? "#991b1b" : step.active || step.done ? "#334155" : "#94a3b8",
                        }}
                      >
                        {step.label}
                      </p>
                      <p style={{ fontSize: "11px", color: step.done || step.active ? "#64748b" : "#94a3b8" }}>
                        {step.time}
                      </p>
                    </div>

                    <p
                      style={{
                        fontSize: "11px",
                        color: isFailedStep ? "#b91c1c" : step.active ? "#1b3d6d" : step.done ? "#64748b" : "#cbd5e1",
                        lineHeight: 1.4,
                      }}
                    >
                      {step.desc}
                    </p>

                    {step.active && (
                      <div className="mt-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ backgroundColor: stepActiveBg }}>
                        <div className="rounded-full animate-pulse" style={{ width: "6px", height: "6px", backgroundColor: stepActiveColor }} />
                        <span style={{ fontSize: "10px", color: stepActiveColor, fontWeight: 600 }}>
                          Status atual
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedOrder.status === "nao_entregue" && (
          <div className="rounded-2xl p-4 mb-4 shadow-sm" style={{ border: "1px solid #fecaca", backgroundColor: "#fef2f2" }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} color="#b91c1c" className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#991b1b" }}>
                  Houve um problema na entrega
                </p>
                <p className="mt-1" style={{ fontSize: "13px", color: "#b91c1c", lineHeight: 1.45 }}>
                  {deliveryFailureReason
                    ? `Motivo: ${deliveryFailureReason}. `
                    : ""}
                  Entre em contato com o mercado para combinar os próximos passos.
                </p>
                {marketWhatsappUrl ? (
                  <a
                    href={marketWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-white"
                    style={{ backgroundColor: "#16a34a", fontSize: "13px", fontWeight: 800 }}
                  >
                    <MessageCircle size={16} />
                    Falar com o mercado no WhatsApp
                  </a>
                ) : (
                  <div className="mt-3 rounded-xl border border-red-200 bg-white/70 px-3 py-2" style={{ fontSize: "12px", color: "#991b1b", fontWeight: 700 }}>
                    WhatsApp do mercado não configurado.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {assignedDriver && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
            <p className="mb-3" style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
              Entrega
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <User size={18} color="#122a4c" />
                <div>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>Entregador</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    {assignedDriver.name || "Entregador atribuído"}
                  </p>
                </div>
              </div>
              {assignedVehicle && (
                <div className="flex items-center gap-3">
                  <Truck size={18} color="#122a4c" />
                  <div>
                    <p style={{ fontSize: "12px", color: "#64748b" }}>Automóvel</p>
                    <p style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      {assignedVehicle}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
          <p className="mb-3" style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
            Dados do pedido
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CalendarClock size={18} color="#122a4c" />
              <div>
                <p style={{ fontSize: "12px", color: "#64748b" }}>Criado em</p>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>
            </div>

            {selectedOrder.scheduledFor && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#fffbeb" }}>
                <CalendarClock size={18} color="#b45309" />
                <div>
                  <p style={{ fontSize: "12px", color: "#b45309" }}>Entrega agendada</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#92400e" }}>
                    {formatDateTime(selectedOrder.scheduledFor)}
                  </p>
                  <p style={{ fontSize: "11px", color: "#b45309", lineHeight: 1.35 }}>
                    Pedido feito fora do horário. A entrega será no próximo dia de mercado aberto.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Truck size={18} color="#122a4c" />
              <div>
                <p style={{ fontSize: "12px", color: "#64748b" }}>Tipo</p>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  {selectedOrder.type === "delivery" ? "Entrega" : "Retirada"}
                </p>
              </div>
            </div>

            {selectedOrder.backendStatus && (
              <div className="flex items-center gap-3">
                <ReceiptText size={18} color="#122a4c" />
                <div>
                  <p style={{ fontSize: "12px", color: "#64748b" }}>Status do pedido</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                    {selectedOrder.backendStatus}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
          <p className="mb-3" style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
            Itens do pedido
          </p>

          {isLoadingItems ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="animate-spin" size={16} color="#122a4c" />
              <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
                Carregando itens...
              </span>
            </div>
          ) : orderItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              {orderItems.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    className="rounded-xl object-cover border flex-shrink-0"
                    style={{
                      width: "46px",
                      height: "46px",
                      borderColor: "#e2e8f0",
                    }}
                    iconSize={18}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate" style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                      {product.name}
                    </p>
                    <p style={{ fontSize: "12px", color: "#64748b" }}>
                      {formatCartQuantity(qty)} {qty === 1 ? "item" : "itens"} · {formatCurrency(product.price)}
                    </p>
                  </div>

                  <p style={{ fontSize: "13px", fontWeight: 800, color: "#122a4c" }}>
                    {formatCurrency(product.price * qty)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
              Os itens deste pedido não vieram detalhados na listagem atual.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: "1px solid #d9e4f2" }}>
          <div className="flex justify-between items-center">
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
              Resumo do pedido
            </p>
            <button
              onClick={() => navigate(tenantPath("orders"))}
              style={{ fontSize: "12px", color: "#122a4c", fontWeight: 600 }}
            >
              Ver pedidos
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <div className="flex justify-between">
              <span style={{ fontSize: "13px", color: "#64748b" }}>Subtotal</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                {formatCurrency(selectedOrder.subtotal)}
              </span>
            </div>

            <div className="flex justify-between">
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                {selectedOrder.type === "delivery" ? "Entrega" : "Retirada"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                {selectedOrder.type === "delivery"
                  ? (hasDeliveryFee ? formatCurrency(selectedOrder.deliveryFee) : "Grátis")
                  : "No mercado"}
              </span>
            </div>

            {hasDiscount && (
              <div className="flex justify-between">
                <span style={{ fontSize: "13px", color: "#64748b" }}>Desconto</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#15803d" }}>
                  -{formatCurrency(selectedOrder.discount)}
                </span>
              </div>
            )}

            {selectedOrder.cpfNaNota && (
              <div className="flex justify-between">
                <span style={{ fontSize: "13px", color: "#64748b" }}>CPF na nota</span>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>
                  {selectedOrder.cpfNaNotaCpf || "Solicitado"}
                </span>
              </div>
            )}

            <div className="h-px my-1" style={{ backgroundColor: "#e2e8f0" }} />

            <div className="flex justify-between items-center">
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Total
              </span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#122a4c" }}>
                {formatCurrency(selectedOrder.total)}
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: "#eef4fb" }}>
            <CreditCard size={15} color="#122a4c" />
            <p style={{ fontSize: "11px", color: "#1b3d6d", fontWeight: 600 }}>
              Pagamento registrado com segurança.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
