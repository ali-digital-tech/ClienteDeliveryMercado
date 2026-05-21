import { useNavigate } from "react-router";
import {
  ChevronLeft,
  Phone,
  MessageCircle,
  MapPin,
  Package,
  CheckCircle2,
  Truck,
  ShoppingBag,
  Home,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';

const steps = [
  {
    id: "recebido",
    label: "Pedido recebido",
    desc: "Seu pedido foi recebido com sucesso",
    time: "14:03",
    icon: Package,
    done: true,
    active: false,
  },
  {
    id: "confirmado",
    label: "Pedido confirmado",
    desc: "O supermercado confirmou seu pedido",
    time: "14:05",
    icon: CheckCircle2,
    done: true,
    active: false,
  },
  {
    id: "separacao",
    label: "Em separação",
    desc: "Estamos separando seus produtos",
    time: "14:12",
    icon: ShoppingBag,
    done: false,
    active: true,
  },
  {
    id: "saiu",
    label: "Saiu para entrega",
    desc: "O entregador está a caminho",
    time: "--",
    icon: Truck,
    done: false,
    active: false,
  },
  {
    id: "entregue",
    label: "Entregue",
    desc: "Pedido entregue com sucesso",
    time: "--",
    icon: Home,
    done: false,
    active: false,
  },
];

export function OrderTrackingScreen() {
  const navigate = useNavigate();
  const { tenantPath } = useApp();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 border-b"
        style={{
          background:
            "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2"
            style={{
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          >
            <ChevronLeft size={20} color="white" />
          </button>

          <div className="text-center">
            <h1
              className="text-white"
              style={{ fontSize: "16px", fontWeight: 800 }}
            >
              Acompanhando pedido
            </h1>
            <p style={{ fontSize: "12px", color: "#c7d7ee" }}>
              #12999
            </p>
          </div>

          <button
            className="rounded-full p-2"
            style={{
              backgroundColor: "rgba(255,255,255,0.14)",
            }}
          >
            <Phone size={20} color="white" />
          </button>
        </div>

        {/* ETA card */}
        <div
          className="rounded-2xl p-3 flex items-center gap-3 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          <div
            className="rounded-xl p-2"
            style={{
              backgroundColor: "rgba(255,255,255,0.95)",
            }}
          >
            <Truck size={20} color="#122a4c" />
          </div>

          <div className="flex-1">
            <p
              className="text-white"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              Entrega por ordem de pedido
            </p>
            <p style={{ fontSize: "12px", color: "#c7d7ee" }}>
              Avisaremos quando o entregador sair
            </p>
          </div>

          <div
            className="rounded-xl px-2 py-1"
            style={{
              backgroundColor: "rgba(255,255,255,0.18)",
            }}
          >
            <p
              className="text-white"
              style={{ fontSize: "12px", fontWeight: 700 }}
            >
              Em separação
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        {/* Map placeholder */}
        <div
          className="rounded-2xl overflow-hidden mb-4 relative"
          style={{
            height: "150px",
            border: "1px solid #d9e4f2",
            background:
              "linear-gradient(135deg, #eef4fb, #dbe8f7)",
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-full p-3 bg-white shadow-lg">
                <MapPin size={24} color="#122a4c" />
              </div>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#1b3d6d",
                }}
              >
                Rua das Flores, 123
              </p>
            </div>
          </div>

          {/* Delivery marker */}
          <div className="absolute top-4 right-6">
            <div className="bg-white rounded-full p-2 shadow-lg">
              <Truck size={16} color="#122a4c" />
            </div>
          </div>

          <div
            className="absolute bottom-3 right-3 rounded-xl px-3 py-1.5 backdrop-blur-sm"
            style={{
              backgroundColor: "rgba(255,255,255,0.88)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              📍 Localização em tempo real
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div
          className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#122a4c",
            }}
            className="mb-4"
          >
            Progresso do pedido
          </h3>

          <div className="flex flex-col">
            {steps.map((step, i) => {
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex gap-4">
                  {/* Left - icon & line */}
                  <div className="flex flex-col items-center">
                    <div
                      className="rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        width: "36px",
                        height: "36px",
                        backgroundColor: step.done
                          ? "#122a4c"
                          : step.active
                            ? "#eef4fb"
                            : "#f1f5f9",
                        border: step.active
                          ? "2px solid #122a4c"
                          : "none",
                      }}
                    >
                      <Icon
                        size={16}
                        color={
                          step.done
                            ? "white"
                            : step.active
                              ? "#122a4c"
                              : "#94a3b8"
                        }
                      />
                    </div>

                    {i < steps.length - 1 && (
                      <div
                        className="w-0.5 flex-1 my-1"
                        style={{
                          backgroundColor: step.done
                            ? "#122a4c"
                            : "#e2e8f0",
                          minHeight: "24px",
                        }}
                      />
                    )}
                  </div>

                  {/* Right - content */}
                  <div className="pb-4 flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight:
                            step.active || step.done
                              ? 700
                              : 500,
                          color:
                            step.active || step.done
                              ? "#334155"
                              : "#94a3b8",
                        }}
                      >
                        {step.label}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: step.done
                            ? "#64748b"
                            : "#94a3b8",
                        }}
                      >
                        {step.time}
                      </p>
                    </div>

                    <p
                      style={{
                        fontSize: "11px",
                        color: step.active
                          ? "#1b3d6d"
                          : step.done
                            ? "#64748b"
                            : "#cbd5e1",
                        lineHeight: 1.4,
                      }}
                    >
                      {step.desc}
                    </p>

                    {step.active && (
                      <div
                        className="mt-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1"
                        style={{ backgroundColor: "#eef4fb" }}
                      >
                        <div
                          className="rounded-full animate-pulse"
                          style={{
                            width: "6px",
                            height: "6px",
                            backgroundColor: "#122a4c",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#122a4c",
                            fontWeight: 600,
                          }}
                        >
                          Em andamento...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Entregador */}
        <div
          className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <p
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#334155",
            }}
            className="mb-3"
          >
            Entregador
          </p>

          <div className="flex items-center gap-3">
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0 text-xl"
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "#eef4fb",
              }}
            >
              👨‍💼
            </div>

            <div className="flex-1">
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Carlos Silva
              </p>
              <p style={{ fontSize: "12px", color: "#64748b" }}>
                ⭐ 4.9 · 1.240 entregas
              </p>
            </div>

            <div className="flex gap-2">
              <button
                className="rounded-full p-2.5"
                style={{ backgroundColor: "#eef4fb" }}
              >
                <MessageCircle size={18} color="#122a4c" />
              </button>
              <button
                className="rounded-full p-2.5"
                style={{ backgroundColor: "#eef4fb" }}
              >
                <Phone size={18} color="#122a4c" />
              </button>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div
          className="bg-white rounded-2xl p-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex justify-between items-center">
            <p
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              Resumo do pedido
            </p>
            <button
              onClick={() => navigate(tenantPath("orders"))}
              style={{
                fontSize: "12px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Ver detalhes
            </button>
          </div>

          <div className="mt-2 flex justify-between">
            <span
              style={{ fontSize: "13px", color: "#64748b" }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#122a4c",
              }}
            >
              R$ 64,83
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
