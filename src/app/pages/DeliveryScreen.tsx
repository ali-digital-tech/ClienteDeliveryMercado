import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  MapPin,
  Store,
  Clock,
  Truck,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';

export function DeliveryScreen() {
  const navigate = useNavigate();
  const { cartTotal, discount, currentMarket, tenantPath } = useApp();
  const [mode, setMode] = useState<"delivery" | "pickup">(
    "delivery",
  );

  const deliveryFee = cartTotal >= 89 ? 0 : 6.99;

  const schedules = [
    {
      id: "1",
      label: "Hoje, 14h - 16h",
      fee: 0,
      badge: "MAIS RÁPIDO",
    },
    { id: "2", label: "Hoje, 16h - 18h", fee: 0 },
    { id: "3", label: "Hoje, 18h - 20h", fee: 0 },
    { id: "4", label: "Amanhã, 08h - 10h", fee: 0 },
  ];
  const [selectedSchedule, setSelectedSchedule] = useState("1");

  const pickupStores = [
    {
      id: "1",
      name: currentMarket.name,
      address: currentMarket.neighborhood,
      time: "30 min",
      isOpen: true,
    },
    {
      id: "2",
      name: `${currentMarket.name} - Retirada`,
      address: currentMarket.neighborhood,
      time: "25 min",
      isOpen: true,
    },
  ];
  const [selectedStore, setSelectedStore] = useState("1");

  const total =
    cartTotal -
    discount +
    (mode === "delivery" ? deliveryFee : 0);

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
            Entrega ou Retirada
          </h1>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        {/* Mode selector */}
        <div
          className="rounded-2xl p-1.5 flex gap-1 mb-4 shadow-sm bg-white"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <button
            onClick={() => setMode("delivery")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all"
            style={{
              backgroundColor:
                mode === "delivery" ? "#122a4c" : "transparent",
              color: mode === "delivery" ? "white" : "#64748b",
            }}
          >
            <Truck size={16} />
            <span style={{ fontSize: "14px", fontWeight: 700 }}>
              Entrega em casa
            </span>
          </button>

          <button
            onClick={() => setMode("pickup")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all"
            style={{
              backgroundColor:
                mode === "pickup" ? "#122a4c" : "transparent",
              color: mode === "pickup" ? "white" : "#64748b",
            }}
          >
            <Store size={16} />
            <span style={{ fontSize: "14px", fontWeight: 700 }}>
              Retirar na loja
            </span>
          </button>
        </div>

        {mode === "delivery" ? (
          <>
            {/* Selected address */}
            <div
              className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
              style={{ border: "1px solid #d9e4f2" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  Endereço de entrega
                </span>
                <button
                  onClick={() => navigate(tenantPath("addresses"))}
                  style={{
                    fontSize: "12px",
                    color: "#122a4c",
                    fontWeight: 600,
                  }}
                >
                  Alterar
                </button>
              </div>

              <div className="flex items-start gap-3">
                <MapPin
                  size={18}
                  color="#122a4c"
                  className="flex-shrink-0 mt-0.5"
                />
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#122a4c",
                    }}
                  >
                    Casa
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      lineHeight: 1.4,
                    }}
                  >
                    Rua das Flores, 123
                    <br />
                    Jardim Paulista · São Paulo - SP
                  </p>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div
              className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
              style={{ border: "1px solid #d9e4f2" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} color="#122a4c" />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  Horário de entrega
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {schedules.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSchedule(s.id)}
                    className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all"
                    style={{
                      borderColor:
                        selectedSchedule === s.id
                          ? "#122a4c"
                          : "#e2e8f0",
                      backgroundColor:
                        selectedSchedule === s.id
                          ? "#f8fbff"
                          : "#ffffff",
                    }}
                  >
                    <div
                      className="rounded-full flex-shrink-0"
                      style={{
                        width: "18px",
                        height: "18px",
                        border: `2px solid ${selectedSchedule === s.id ? "#122a4c" : "#cbd5e1"}`,
                        backgroundColor:
                          selectedSchedule === s.id
                            ? "#122a4c"
                            : "white",
                      }}
                    />

                    <span
                      style={{
                        fontSize: "13px",
                        color: "#334155",
                        flex: 1,
                      }}
                    >
                      {s.label}
                    </span>

                    {s.badge && (
                      <span
                        className="rounded-full px-2 py-0.5"
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          backgroundColor: "#eef4fb",
                          color: "#122a4c",
                        }}
                      >
                        {s.badge}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: "13px",
                        color:
                          deliveryFee === 0
                            ? "#122a4c"
                            : "#334155",
                        fontWeight: 600,
                      }}
                    >
                      {deliveryFee === 0
                        ? "Grátis"
                        : `R$ ${deliveryFee.toFixed(2)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {pickupStores.map((store) => (
              <button
                key={store.id}
                onClick={() => setSelectedStore(store.id)}
                className="bg-white rounded-2xl p-4 shadow-sm text-left flex items-start gap-3 border-2 transition-all"
                style={{
                  borderColor:
                    selectedStore === store.id
                      ? "#122a4c"
                      : "#d9e4f2",
                }}
              >
                <div
                  className="rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: "#eef4fb",
                  }}
                >
                  <Store size={22} color="#122a4c" />
                </div>

                <div className="flex-1">
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#122a4c",
                    }}
                  >
                    {store.name}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    {store.address}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        backgroundColor: "#eef4fb",
                        color: "#1b3d6d",
                      }}
                    >
                      Pronta em {store.time}
                    </span>

                    <span
                      style={{
                        fontSize: "11px",
                        color: "#122a4c",
                        fontWeight: 600,
                      }}
                    >
                      Retirada grátis
                    </span>
                  </div>
                </div>

                {selectedStore === store.id && (
                  <div
                    className="rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      width: "22px",
                      height: "22px",
                      backgroundColor: "#122a4c",
                    }}
                  >
                    <span
                      style={{
                        color: "white",
                        fontSize: "12px",
                      }}
                    >
                      ✓
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Summary */}
        <div
          className="bg-white rounded-2xl p-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex justify-between mb-1">
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

          <div className="flex justify-between mb-1">
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
                  mode === "pickup" || deliveryFee === 0
                    ? "#122a4c"
                    : "#334155",
              }}
            >
              {mode === "pickup" || deliveryFee === 0
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
                fontSize: "14px",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              Total estimado
            </span>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "#122a4c",
              }}
            >
              R$ {total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 bg-white px-4 py-4"
        style={{ borderTop: "1px solid #d9e4f2" }}
      >
        <button
          onClick={() => navigate(tenantPath("checkout"))}
          className="w-full rounded-2xl py-4 text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#122a4c" }}
        >
          <span style={{ fontSize: "15px", fontWeight: 700 }}>
            Continuar para pagamento →
          </span>
        </button>
      </div>
    </div>
  );
}
