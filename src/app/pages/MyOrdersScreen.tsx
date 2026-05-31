import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronRight,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";
import { BottomNav } from "@/shared/components/BottomNav";
import { showSystemNotice } from "@/shared/components/SystemNoticeModal";
import { formatCartQuantity } from "@/features/cart";
import { ProductImage } from "@/features/products";
import { loadOrderItems, type Order } from "@/features/orders";

const statusConfig: Record<Order["status"], { label: string; color: string; bg: string }> = {
  pendente: {
    label: "Pendente",
    color: "#92400e",
    bg: "#fffbeb",
  },
  recebido: {
    label: "Recebido",
    color: "#1b3d6d",
    bg: "#eef4fb",
  },
  confirmado: {
    label: "Confirmado",
    color: "#122a4c",
    bg: "#e8f0fb",
  },
  separacao: {
    label: "Em separação",
    color: "#2f5b93",
    bg: "#edf3fb",
  },
  pronto: {
    label: "Pronto",
    color: "#1e40af",
    bg: "#dbeafe",
  },
  saiu: {
    label: "Saiu para entrega",
    color: "#3f5f8a",
    bg: "#eff4fb",
  },
  entregue: {
    label: "Entregue",
    color: "#122a4c",
    bg: "#eef4fb",
  },
  nao_entregue: {
    label: "Não entregue",
    color: "#b91c1c",
    bg: "#fef2f2",
  },
  cancelado: {
    label: "Cancelado",
    color: "#b91c1c",
    bg: "#fef2f2",
  },
};

function formatCurrency(value: number | undefined) {
  return `R$ ${(value || 0).toFixed(2).replace(".", ",")}`;
}

function formatOrderCode(order: Order) {
  if (order.number) return `#${order.number}`;
  if (order.id.startsWith("#")) return order.id;
  return `#${order.id.slice(0, 8)}`;
}

function formatOrderType(order: Order) {
  return order.type === "delivery" ? "Entrega" : "Retirada";
}

function hasValidPixPayment(order: Order) {
  const payment = order.payment;
  return Boolean(
    payment?.method === "pix"
      && payment.qrCode
      && ["pendente", "em_processamento"].includes(payment.status)
      && payment.expiresAt
      && new Date(payment.expiresAt).getTime() > Date.now(),
  );
}

export function MyOrdersScreen() {
  const navigate = useNavigate();
  const { orders, addToCart, cartCount, isLoggedIn, refreshOrders, tenantPath } = useApp();
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [repeatingOrderId, setRepeatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    let isActive = true;
    setIsLoadingOrders(true);

    refreshOrders().finally(() => {
      if (isActive) setIsLoadingOrders(false);
    });

    return () => {
      isActive = false;
    };
  }, [isLoggedIn, refreshOrders]);

  const handleRepeat = async (order: Order) => {
    const orderId = order.rawId || order.id;
    setRepeatingOrderId(orderId);

    try {
      const items = await loadOrderItems(order, { forceRefresh: true });
      if (items.length === 0) {
        showSystemNotice(
          "Nenhum produto deste pedido está disponível com preço nesta loja.",
          "Não foi possível repetir"
        );
        return;
      }

      for (const { product, qty } of items) {
        await addToCart(product, qty);
      }

      const repeatedQuantity = items.reduce((sum, item) => sum + item.qty, 0);
      if (order.itemCount && repeatedQuantity < order.itemCount) {
        showSystemNotice(
          "Alguns produtos do pedido não foram adicionados porque não estão disponíveis com preço nesta loja."
        );
      }

      navigate(tenantPath("carrinho"));
    } catch (error) {
      console.error("Erro ao repetir pedido", error);
    } finally {
      setRepeatingOrderId(null);
    }
  };

  const handleOpenOrderDetails = (order: Order) => {
    const orderId = order.rawId || order.id;

    if (!order.isPaid) {
      navigate(`${tenantPath("payment-recovery")}?orderId=${encodeURIComponent(orderId)}`);
      return;
    }

    try {
      sessionStorage.setItem(
        "cliente_delivery_last_order",
        JSON.stringify({
          id: order.id,
          rawId: order.rawId || order.id,
          total: order.total,
        })
      );
    } catch {
      // Navigation state still carries the selected order for the current session.
    }

    navigate(tenantPath("order-tracking"), {
      state: { orderId },
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex-shrink-0 bg-white px-4 pt-8 md:pt-4 pb-3 border-b"
        style={{ borderColor: "#d9e4f2" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 800,
                color: "#122a4c",
              }}
            >
              Meus Pedidos
            </h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              {orders.length} pedidos
            </p>
          </div>

          <button
            className="relative rounded-full p-2"
            style={{ backgroundColor: "#eef4fb" }}
            onClick={() => navigate(tenantPath("carrinho"))}
          >
            <ShoppingCart size={20} color="#122a4c" />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 text-white rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "#122a4c",
                  width: "18px",
                  height: "18px",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        {isLoadingOrders && orders.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="animate-spin" size={28} color="#122a4c" />
            <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>
              Carregando pedidos...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <PackageSearch size={52} color="#94a3b8" />
            <p
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              Nenhum pedido ainda
            </p>
            <button
              onClick={() => navigate(tenantPath())}
              className="rounded-2xl px-6 py-3 text-white"
              style={{
                backgroundColor: "#122a4c",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Fazer primeira compra
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const defaultStatus = statusConfig[order.status] ?? statusConfig.recebido;
              const status = order.type === "pickup" && order.status === "entregue"
                ? { ...defaultStatus, label: "Retirado" }
                : !order.isPaid
                  ? { color: "#92400e", bg: "#fffbeb", label: "Aguardando pagamento" }
                : defaultStatus;
              const isActive = !["entregue", "nao_entregue", "cancelado"].includes(order.status);
              const itemCount = order.itemCount ?? order.items.reduce((sum, item) => sum + item.qty, 0);
              const hasItems = order.items.length > 0;
              const canRepeat = Boolean(order.cartId) || itemCount > 0 || hasItems;
              const isRepeating = repeatingOrderId === (order.rawId || order.id);
              const hasDiscount = Boolean(order.discount && order.discount > 0);
              const hasDeliveryFee = Boolean(order.deliveryFee && order.deliveryFee > 0);

              return (
                <div
                  key={order.rawId || order.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  style={{ border: "1px solid #d9e4f2" }}
                >
                  <div
                    className="px-4 pt-4 pb-3"
                    style={{ borderBottom: "1px solid #eef2f7" }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                          className="block truncate"
                          style={{
                            fontSize: "15px",
                            fontWeight: 800,
                            color: "#334155",
                          }}
                        >
                          {formatOrderCode(order)}
                        </span>
                        {isActive && (
                          <div
                            className="rounded-full animate-pulse flex-shrink-0"
                            style={{
                              width: "8px",
                              height: "8px",
                              backgroundColor: "#2f5b93",
                            }}
                          />
                        )}
                      </div>

                      <span
                        className="flex-shrink-0 rounded-full px-3 py-1"
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: status.color,
                          backgroundColor: status.bg,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>

                    <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                      {order.date}
                    </p>
                  </div>

                  <div className="px-4 py-3">
                    {hasItems && (
                      <div className="flex gap-2 mb-2">
                        {order.items.slice(0, 3).map(({ product }) => (
                          <ProductImage
                            key={product.id}
                            src={product.image}
                            alt={product.name}
                            className="rounded-xl object-cover border"
                            style={{
                              width: "44px",
                              height: "44px",
                              borderColor: "#e2e8f0",
                            }}
                            iconSize={18}
                          />
                        ))}

                        {order.items.length > 3 && (
                          <div
                            className="rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              width: "44px",
                              height: "44px",
                              backgroundColor: "#eef4fb",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                fontWeight: 600,
                              }}
                            >
                              +{order.items.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <p style={{ fontSize: "12px", color: "#64748b" }}>
                      {itemCount > 0
                        ? `${formatCartQuantity(itemCount)} ite${itemCount !== 1 ? "ns" : "m"}`
                        : "Itens não detalhados"}{" "}
                      - {formatOrderType(order)}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {order.subtotal !== undefined && (
                        <span
                          className="rounded-full px-2.5 py-1"
                          style={{
                            backgroundColor: "#f1f5f9",
                            color: "#64748b",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          Subtotal {formatCurrency(order.subtotal)}
                        </span>
                      )}
                      <span
                        className="rounded-full px-2.5 py-1"
                        style={{
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        {hasDeliveryFee ? `Entrega ${formatCurrency(order.deliveryFee)}` : "Entrega grátis"}
                      </span>
                      {hasDiscount && (
                        <span
                          className="rounded-full px-2.5 py-1"
                          style={{
                            backgroundColor: "#f0fdf4",
                            color: "#15803d",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          Desconto {formatCurrency(order.discount)}
                        </span>
                      )}
                      {order.cpfNaNota && (
                        <span
                          className="rounded-full px-2.5 py-1"
                          style={{
                            backgroundColor: "#eef4fb",
                            color: "#122a4c",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          CPF na nota
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex items-center justify-between gap-3">
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#122a4c",
                      }}
                    >
                      {formatCurrency(order.total)}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRepeat(order)}
                        disabled={!canRepeat || isRepeating}
                        title={canRepeat ? "Repetir pedido" : "Itens do pedido não vieram na listagem"}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-2 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: "#eef4fb",
                          opacity: canRepeat && !isRepeating ? 1 : 0.55,
                        }}
                      >
                        {isRepeating ? (
                          <Loader2 className="animate-spin" size={13} color="#122a4c" />
                        ) : (
                          <RefreshCw size={13} color="#122a4c" />
                        )}
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#122a4c",
                            fontWeight: 600,
                          }}
                        >
                          {isRepeating ? "Carregando" : "Repetir"}
                        </span>
                      </button>

                      <button
                        onClick={() => handleOpenOrderDetails(order)}
                        className="flex items-center gap-1 rounded-xl px-3 py-2"
                        style={{ backgroundColor: "#f1f5f9" }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#334155",
                            fontWeight: 600,
                          }}
                        >
                          {!order.isPaid
                            ? hasValidPixPayment(order) ? "Pagar PIX" : "Concluir pagamento"
                            : isActive ? "Acompanhar" : "Ver detalhes"}
                        </span>
                        <ChevronRight size={13} color="#334155" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
