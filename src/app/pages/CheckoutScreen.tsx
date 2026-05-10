import { useNavigate } from "react-router";
import {
  ChevronLeft,
  MapPin,
  Truck,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";

export function CheckoutScreen() {
  const navigate = useNavigate();
  const { cart, cartTotal, discount } = useApp();

  const deliveryFee = cartTotal >= 89 ? 0 : 6.99;
  const total = cartTotal - discount + deliveryFee;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white px-4 pt-12 md:pt-5 pb-4 border-b"
        style={{ borderColor: "#d9e4f2" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2"
            style={{ backgroundColor: "#eef4fb" }}
          >
            <ChevronLeft size={20} color="#122a4c" />
          </button>

          <h1
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#122a4c",
            }}
          >
            Finalizar Pedido
          </h1>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        {/* Itens */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#122a4c",
            }}
            className="mb-3"
          >
            Itens do pedido (
            {cart.reduce((s, i) => s + i.qty, 0)})
          </h3>

          <div className="flex flex-col gap-2">
            {cart.slice(0, 3).map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="rounded-xl object-cover flex-shrink-0"
                  style={{ width: "42px", height: "42px" }}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className="truncate"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  >
                    {item.product.name}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    Qtd: {item.qty}
                  </p>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#122a4c",
                  }}
                >
                  R${" "}
                  {(item.product.price * item.qty).toFixed(2)}
                </p>
              </div>
            ))}

            {cart.length > 3 && (
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                + {cart.length - 3} outros itens
              </p>
            )}
          </div>

          <button
            onClick={() => navigate("/cart")}
            className="mt-3 flex items-center gap-1"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#122a4c",
            }}
          >
            Ver carrinho completo{" "}
            <ChevronRight size={14} color="#122a4c" />
          </button>
        </div>

        {/* Endereço */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin size={15} color="#122a4c" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Endereço de entrega
              </span>
            </div>

            <button
              onClick={() => navigate("/addresses")}
              style={{
                fontSize: "12px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Alterar
            </button>
          </div>

          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.5,
              color: "#64748b",
            }}
          >
            Rua das Flores, 123
            <br />
            Jardim Paulista · São Paulo - SP
          </p>
        </div>

        {/* Entrega */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Truck size={15} color="#122a4c" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Entrega
              </span>
            </div>

            <button
              onClick={() => navigate("/delivery")}
              style={{
                fontSize: "12px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Alterar
            </button>
          </div>

          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Hoje, 14h - 16h
          </p>

          <span
            className="rounded-full px-2 py-0.5 mt-1 inline-block"
            style={{
              fontSize: "10px",
              fontWeight: 600,
              backgroundColor: "#eef4fb",
              color: "#122a4c",
            }}
          >
            MAIS RÁPIDO
          </span>
        </div>

        {/* Pagamento */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard size={15} color="#122a4c" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Pagamento
              </span>
            </div>

            <button
              onClick={() => navigate("/payment")}
              style={{
                fontSize: "12px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Alterar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="rounded-lg p-1.5"
              style={{ backgroundColor: "#eef4fb" }}
            >
              <CreditCard size={14} color="#122a4c" />
            </div>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Cartão de crédito •••• 4242
            </p>
          </div>
        </div>

        {/* Totals */}
        <div
          className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span
                style={{ fontSize: "13px", color: "#64748b" }}
              >
                Subtotal
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                R$ {cartTotal.toFixed(2)}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between">
                <span
                  style={{ fontSize: "13px", color: "#1b3d6d" }}
                >
                  Desconto
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#122a4c",
                  }}
                >
                  -R$ {discount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span
                style={{ fontSize: "13px", color: "#64748b" }}
              >
                Taxa de entrega
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color:
                    deliveryFee === 0 ? "#122a4c" : "#334155",
                }}
              >
                {deliveryFee === 0
                  ? "Grátis"
                  : `R$ ${deliveryFee.toFixed(2)}`}
              </span>
            </div>

            <div
              className="pt-2 flex justify-between"
              style={{ borderTop: "1px solid #e2e8f0" }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#122a4c",
                }}
              >
                R$ {total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 bg-white px-4 py-4"
        style={{ borderTop: "1px solid #d9e4f2" }}
      >
        <button
          onClick={() => navigate("/order-confirmed")}
          className="w-full rounded-2xl py-4 text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#122a4c" }}
        >
          <span style={{ fontSize: "16px", fontWeight: 800 }}>
            Finalizar pedido · R$ {total.toFixed(2)}
          </span>
        </button>

        <p
          className="text-center mt-2"
          style={{ fontSize: "11px", color: "#94a3b8" }}
        >
          Ao finalizar, você concorda com nossos termos de uso
        </p>
      </div>
    </div>
  );
}