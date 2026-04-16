import { useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Navigation, ChevronRight } from "lucide-react";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [cep, setCep] = useState("");
  const [locating, setLocating] = useState(false);

  const handleLocation = () => {
    setLocating(true);

    setTimeout(() => {
      setLocating(false);
      navigate("/home");
    }, 1500);
  };

  const handleCep = () => {
    if (cep.length >= 8) {
      navigate("/home");
    }
  };

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ background: "#f8fafc" }}
    >
      {/* Header */}
      <div
        className="flex flex-col items-center pt-14 pb-8"
        style={{
          background:
            "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)",
        }}
      >
        <div
          className="mb-4 flex items-center justify-center"
          style={{
            width: "240px",
            height: "100px",
          }}
        >
          <img
            src="https://wfmxfnwbmzetzygoanjh.supabase.co/storage/v1/object/public/ALI%20Digital/ALI%20Agenda/ChatGPT%20Image%2015%20abr%202026,%2008_39_58.png"
            alt="Logo FrescaMart"
            className="h-full w-full object-contain"
          />
        </div>

        <p
          style={{
            fontSize: "14px",
            color: "#c7d7ee",
          }}
        >
          Supermercado Digital
        </p>
      </div>

      {/* Wave */}
      <div
        style={{
          height: "30px",
          background:
            "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)",
          borderRadius: "0 0 30px 30px",
        }}
      />

      <div className="flex flex-1 flex-col gap-6 px-6 pt-8">
        <div className="text-center">
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#122a4c",
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
            Informe sua localização para vermos se entregamos na
            sua área
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
            style={{ backgroundColor: "#eef4fb" }}
          >
            <Navigation size={22} color="#122a4c" />
          </div>

          <div className="flex-1 text-left">
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#122a4c",
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
              border: "1px solid #d9e4f2",
            }}
          >
            <MapPin size={20} color="#122a4c" />
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
                cep.length >= 8 ? "#122a4c" : "#cbd5e1",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            Confirmar endereço
          </button>
        </div>

        <div
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{ backgroundColor: "#eef4fb" }}
        >
          <MapPin
            size={18}
            color="#122a4c"
            className="mt-0.5 flex-shrink-0"
          />
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.5,
              color: "#1e3a5f",
            }}
          >
            Entregamos em Floriano e cidades vizinhas. Entrega
            em até 2h disponível em regiões selecionadas.
          </p>
        </div>

        <button
          onClick={() => navigate("/home")}
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