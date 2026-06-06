import { useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Navigation, ChevronRight } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const { currentMarket, tenantPath } = useApp();
  const [cep, setCep] = useState("");
  const [locating, setLocating] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = currentMarket.logo && !logoFailed;

  const handleLocation = () => {
    setLocating(true);

    setTimeout(() => {
      setLocating(false);
      navigate(tenantPath());
    }, 1500);
  };

  const handleCep = () => {
    if (cep.length >= 8) {
      navigate(tenantPath());
    }
  };

  return (
    <div
      className="flex flex-1 flex-col px-[15px] py-[0px]"
      style={{ background: "#f8fafc" }}
    >
      {/* Header */}
      <div
        className="flex flex-col items-center pt-14 pb-8"
        style={{
          background: `linear-gradient(160deg, ${currentMarket.secondaryColor} 0%, ${currentMarket.primaryColor} 100%)`,
        }}
      >
        <div
          className="mb-4 flex items-center justify-center overflow-hidden"
          style={{
            width: "104px",
            height: "104px",
            borderRadius: "24px",
            backgroundColor: "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          {showLogo ? (
            <img
              src={currentMarket.logo}
              alt={currentMarket.name}
              className="h-full w-full object-cover"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span style={{ fontSize: "44px" }}>🛒</span>
          )}
        </div>

        <h1
          className="text-white"
          style={{ fontSize: "24px", fontWeight: 800, lineHeight: 1.1 }}
        >
          {currentMarket.name}
        </h1>
        <p
          className="mt-2 max-w-xs text-center"
          style={{
            fontSize: "14px",
            color: "var(--market-primary-muted-color)",
            lineHeight: 1.5,
          }}
        >
          {currentMarket.description}
        </p>
      </div>

      {/* Wave */}
      <div
        style={{
          height: "30px",
          background: `linear-gradient(160deg, ${currentMarket.secondaryColor} 0%, ${currentMarket.primaryColor} 100%)`,
          borderRadius: "0 0 30px 30px",
        }}
      />

      <div className="flex flex-1 flex-col gap-6 px-6 pt-8">
        <div className="text-center">
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--market-primary-color)",
            }}
          >
            Onde você está?
          </h2>
          <p
            className="mt-2"
            style={{
              fontSize: "14px",
              lineHeight: 1.5,
              color: "#5b6b80",
            }}
          >
            Informe sua localização para verificar a entrega do {currentMarket.name}
          </p>
        </div>

        <button
          onClick={handleLocation}
          className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition-transform active:scale-[0.98]"
          style={{
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            className="rounded-xl p-2.5"
            style={{ backgroundColor: "var(--market-primary-soft-color)" }}
          >
            <Navigation size={22} color="var(--market-primary-color)" />
          </div>

          <div className="flex-1 text-left">
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--market-primary-color)",
              }}
            >
              {locating
                ? "Localizando..."
                : "Usar minha localização atual"}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              Via GPS do celular
            </p>
          </div>

          <ChevronRight size={18} color="#94a3b8" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span
            style={{
              fontSize: "13px",
              color: "#94a3b8",
            }}
          >
            ou
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex flex-col gap-3">
          <div
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
            style={{
              border: "1px solid var(--market-primary-border-color)",
            }}
          >
            <MapPin size={20} color="var(--market-primary-color)" />
            <input
              type="text"
              placeholder="Digite seu CEP"
              value={cep}
              onChange={(e) =>
                setCep(
                  e.target.value.replace(/\D/g, "").slice(0, 8),
                )
              }
              className="flex-1 bg-transparent outline-none"
              style={{
                fontSize: "15px",
                color: "#334155",
              }}
            />
          </div>

          <button
            onClick={handleCep}
            disabled={cep.length < 8}
            className="rounded-2xl py-4 text-white transition-all active:scale-[0.98]"
            style={{
              backgroundColor:
                cep.length >= 8 ? "var(--market-primary-color)" : "#cbd5e1",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            Confirmar endereço
          </button>
        </div>

        <div
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{ backgroundColor: "var(--market-primary-soft-color)" }}
        >
          <MapPin
            size={18}
            color="var(--market-primary-color)"
            className="mt-0.5 flex-shrink-0"
          />
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.5,
              color: "var(--market-primary-color)",
            }}
          >
            Entregamos em {currentMarket.neighborhood}. As entregas são feitas por ordem de pedido.
            {currentMarket.minimumOrder > 0 && ` Pedido mínimo de R$ ${currentMarket.minimumOrder.toFixed(2).replace('.', ',')}.`}
          </p>
        </div>

        <button
          onClick={() => navigate(tenantPath())}
          className="pb-4 text-center underline"
          style={{
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          Pular por agora
        </button>
      </div>
    </div>
  );
}
