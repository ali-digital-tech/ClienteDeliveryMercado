import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, CreditCard, Plus } from "lucide-react";

const methods = [
  {
    id: "pix",
    label: "PIX",
    icon: "⚡",
    desc: "Aprovação instantânea",
    badge: "Mais rápido",
  },
  {
    id: "credit",
    label: "Cartão de crédito",
    icon: "💳",
    desc: "•••• 4242 — Visa",
    badge: "",
  },
  {
    id: "debit",
    label: "Cartão de débito",
    icon: "💳",
    desc: "•••• 9891 — Mastercard",
    badge: "",
  },
  {
    id: "cash",
    label: "Dinheiro",
    icon: "💵",
    desc: "Pague na entrega",
    badge: "",
  },
  {
    id: "pickup_pay",
    label: "Pagar na retirada",
    icon: "🏪",
    desc: "Qualquer forma na loja",
    badge: "",
  },
];

export function PaymentScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("pix");
  const [change, setChange] = useState("");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white px-4 pt-12 pb-4 border-b"
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
            Forma de Pagamento
          </h1>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        <div className="mb-4 flex flex-col gap-3">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border-2 text-left transition-all"
              style={{
                borderColor:
                  selected === m.id ? "#122a4c" : "#d9e4f2",
              }}
            >
              <div
                className="rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor:
                    selected === m.id ? "#eef4fb" : "#f8fafc",
                  fontSize: "22px",
                }}
              >
                {m.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#334155",
                    }}
                  >
                    {m.label}
                  </p>
                  {m.badge && (
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        backgroundColor: "#eef4fb",
                        color: "#122a4c",
                      }}
                    >
                      {m.badge}
                    </span>
                  )}
                </div>

                <p
                  style={{ fontSize: "12px", color: "#64748b" }}
                >
                  {m.desc}
                </p>
              </div>

              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: "20px",
                  height: "20px",
                  border: `2px solid ${selected === m.id ? "#122a4c" : "#cbd5e1"}`,
                  backgroundColor:
                    selected === m.id ? "#122a4c" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {selected === m.id && (
                  <span
                    style={{ color: "white", fontSize: "11px" }}
                  >
                    ✓
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* PIX QR code mockup */}
        {selected === "pix" && (
          <div
            className="bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center mb-4"
            style={{ border: "1px solid #d9e4f2" }}
          >
            <div
              className="rounded-2xl p-4 mb-3"
              style={{ backgroundColor: "#eef4fb" }}
            >
              <div
                className="grid grid-cols-7 gap-1"
                style={{ width: "100px", height: "100px" }}
              >
                {Array.from({ length: 49 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{
                      backgroundColor:
                        Math.random() > 0.5
                          ? "#122a4c"
                          : "white",
                    }}
                  />
                ))}
              </div>
            </div>

            <p
              style={{
                fontSize: "13px",
                color: "#334155",
                fontWeight: 600,
              }}
            >
              QR Code PIX
            </p>
            <p
              className="mt-1 text-center"
              style={{
                fontSize: "11px",
                lineHeight: 1.4,
                color: "#94a3b8",
              }}
            >
              Escaneie com o app do seu banco ou copie a chave
              abaixo
            </p>

            <button
              className="mt-3 rounded-xl px-4 py-2.5 text-white"
              style={{
                backgroundColor: "#122a4c",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              Copiar chave PIX
            </button>
          </div>
        )}

        {/* Dinheiro - troco */}
        {selected === "cash" && (
          <div
            className="bg-white rounded-2xl p-4 shadow-sm mb-4"
            style={{ border: "1px solid #d9e4f2" }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#334155",
                marginBottom: "8px",
              }}
            >
              Troco para quanto?
            </p>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: "#eef4fb" }}
            >
              <span
                style={{ fontSize: "14px", color: "#122a4c" }}
              >
                R$
              </span>
              <input
                type="number"
                placeholder="0,00"
                value={change}
                onChange={(e) => setChange(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
                style={{ fontSize: "14px", color: "#334155" }}
              />
            </div>
          </div>
        )}

        {/* Add new card */}
        <button
          className="w-full bg-white rounded-2xl p-4 border-2 border-dashed flex items-center justify-center gap-2 shadow-sm"
          style={{ borderColor: "#cbd5e1" }}
        >
          <Plus size={18} color="#122a4c" />
          <CreditCard size={18} color="#64748b" />
          <span
            style={{
              fontSize: "13px",
              color: "#334155",
              fontWeight: 600,
            }}
          >
            Adicionar novo cartão
          </span>
        </button>
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 bg-white px-4 py-4 border-t"
        style={{ borderColor: "#d9e4f2" }}
      >
        <button
          onClick={() => navigate("/checkout")}
          className="w-full rounded-2xl py-4 text-white transition-all active:scale-[0.98]"
          style={{
            backgroundColor: "#122a4c",
            fontSize: "15px",
            fontWeight: 700,
          }}
        >
          Confirmar pagamento →
        </button>
      </div>
    </div>
  );
}