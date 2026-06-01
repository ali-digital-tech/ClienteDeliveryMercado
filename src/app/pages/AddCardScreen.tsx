import { useNavigate } from "react-router";
import { ChevronLeft, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";

export function AddCardScreen() {
  const navigate = useNavigate();
  const { tenantPath } = useApp();

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
        >
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: "18px", fontWeight: 800 }}>
            Cartão seguro
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div
          className="relative mx-auto mb-5 rounded-3xl overflow-hidden p-5 text-white"
          style={{
            width: "100%",
            maxWidth: "330px",
            minHeight: "190px",
            background: "linear-gradient(135deg, #1b3d6d 0%, #122a4c 100%)",
            boxShadow: "0 16px 40px rgba(18,42,76,0.35)",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: "180px",
              height: "180px",
              background: "rgba(255,255,255,0.06)",
              top: "-60px",
              right: "-40px",
            }}
          />
          <div className="relative flex h-full min-h-[150px] flex-col justify-between">
            <div className="flex items-start justify-between">
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

            <div>
              <p style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.08em" }}>
                CARTÃO SEGURO
              </p>
              <p className="mt-2" style={{ fontSize: "20px", fontWeight: 900 }}>
                Dados protegidos
              </p>
              <p className="mt-1" style={{ fontSize: "12px", color: "rgba(255,255,255,0.72)" }}>
                Seus dados são protegidos durante o pagamento.
              </p>
            </div>
          </div>
        </div>

        <div
          className="mx-auto max-w-md rounded-2xl bg-white p-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="mb-3 flex items-start gap-3">
            <div
              className="rounded-2xl p-3"
              style={{ backgroundColor: "#f0fdf4" }}
            >
              <Lock size={20} color="#15803d" />
            </div>
            <div>
              <h2 style={{ fontSize: "15px", fontWeight: 900, color: "#122a4c" }}>
                Cadastro de cartão pelo checkout seguro
              </h2>
              <p className="mt-1" style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                Cadastre o cartão na tela de pagamento. A criptografia é feita pelo Mercado Pago para proteger suas informações.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(tenantPath("payment"))}
            className="mt-2 w-full rounded-2xl py-4 text-white transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#122a4c", fontSize: "15px", fontWeight: 800 }}
          >
            Abrir formulário seguro
          </button>
        </div>
      </div>
    </div>
  );
}
