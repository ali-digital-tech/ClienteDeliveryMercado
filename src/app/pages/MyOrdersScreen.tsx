import { useNavigate } from "react-router";
import {
  ShoppingCart,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { BottomNav } from "../components/BottomNav";

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
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
};

export function MyOrdersScreen() {
  const navigate = useNavigate();
  const { orders, addToCart, cartCount } = useApp();

  const handleRepeat = (order: (typeof orders)[0]) => {
    order.items.forEach(({ product, qty }) => {
      for (let i = 0; i < qty; i++) addToCart(product);
    });
    navigate("/cart");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white px-4 pt-12 pb-4 border-b"
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
            onClick={() => navigate("/cart")}
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
        {orders.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <span style={{ fontSize: "52px" }}>📦</span>
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
              onClick={() => navigate("/home")}
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
              const status = statusConfig[order.status];
              const isActive = order.status !== "entregue";

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                  style={{ border: "1px solid #d9e4f2" }}
                >
                  {/* Header */}
                  <div
                    className="px-4 pt-4 pb-3"
                    style={{
                      borderBottom: "1px solid #eef2f7",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 800,
                            color: "#334155",
                          }}
                        >
                          {order.id}
                        </span>
                        {isActive && (
                          <div
                            className="rounded-full animate-pulse"
                            style={{
                              width: "8px",
                              height: "8px",
                              backgroundColor: "#2f5b93",
                            }}
                          />
                        )}
                      </div>

                      <span
                        className="rounded-full px-3 py-1"
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

                    <p
                      style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                      }}
                    >
                      {order.date}
                    </p>
                  </div>

                  {/* Items preview */}
                  <div className="px-4 py-3">
                    <div className="flex gap-2 mb-2">
                      {order.items
                        .slice(0, 3)
                        .map(({ product }) => (
                          <img
                            key={product.id}
                            src={product.image}
                            alt={product.name}
                            className="rounded-xl object-cover border"
                            style={{
                              width: "44px",
                              height: "44px",
                              borderColor: "#e2e8f0",
                            }}
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

                    <p
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      {order.items.reduce(
                        (s, i) => s + i.qty,
                        0,
                      )}{" "}
                      ite
                      {order.items.reduce(
                        (s, i) => s + i.qty,
                        0,
                      ) !== 1
                        ? "ns"
                        : "m"}{" "}
                      ·{" "}
                      {order.type === "delivery"
                        ? "🚚 Entrega"
                        : "🏪 Retirada"}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="px-4 pb-4 flex items-center justify-between">
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "#122a4c",
                      }}
                    >
                      R$ {order.total.toFixed(2)}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRepeat(order)}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-2"
                        style={{ backgroundColor: "#eef4fb" }}
                      >
                        <RefreshCw size={13} color="#122a4c" />
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#122a4c",
                            fontWeight: 600,
                          }}
                        >
                          Repetir
                        </span>
                      </button>

                      <button
                        onClick={() =>
                          isActive
                            ? navigate("/order-tracking")
                            : undefined
                        }
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
                          {isActive
                            ? "Acompanhar"
                            : "Ver detalhes"}
                        </span>
                        <ChevronRight
                          size={13}
                          color="#334155"
                        />
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