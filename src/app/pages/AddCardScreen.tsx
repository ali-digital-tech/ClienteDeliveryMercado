import { useNavigate } from "react-router";
import { ChevronLeft, CreditCard, Lock, Check } from "lucide-react";
import { useState } from "react";

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

function detectBrand(number: string): "visa" | "mastercard" | "elo" | "amex" | null {
  const n = number.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^5[1-5]|^2[2-7]/.test(n)) return "mastercard";
  if (/^(4011|4312|4389|4514|4576|5041|5066|5090|6277|6362|6516|6550)/.test(n)) return "elo";
  if (/^3[47]/.test(n)) return "amex";
  return null;
}

function BrandLogo({ brand }: { brand: "visa" | "mastercard" | "elo" | "amex" | null }) {
  if (brand === "visa") {
    return (
      <svg width="44" height="14" viewBox="0 0 44 14" fill="none">
        <text x="0" y="13" fontFamily="Arial" fontWeight="800" fontSize="14" fill="white" letterSpacing="-0.5">VISA</text>
      </svg>
    );
  }
  if (brand === "mastercard") {
    return (
      <div className="flex items-center gap-[-4px]">
        <div className="rounded-full" style={{ width: 20, height: 20, backgroundColor: "#EB001B", opacity: 0.95 }} />
        <div className="rounded-full -ml-2" style={{ width: 20, height: 20, backgroundColor: "#F79E1B", opacity: 0.95 }} />
      </div>
    );
  }
  if (brand === "elo") {
    return <span style={{ fontSize: "13px", fontWeight: 900, color: "white", letterSpacing: 1 }}>ELO</span>;
  }
  if (brand === "amex") {
    return <span style={{ fontSize: "12px", fontWeight: 900, color: "white", letterSpacing: 0.5 }}>AMEX</span>;
  }
  return <CreditCard size={22} color="rgba(255,255,255,0.5)" />;
}

export function AddCardScreen() {
  const navigate = useNavigate();

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardType, setCardType] = useState<"credit" | "debit">("credit");
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(false);

  const brand = detectBrand(cardNumber);

  const displayNumber = cardNumber
    ? cardNumber.padEnd(19, " ").split("").map((c, i) => {
        if ([4, 9, 14].includes(i)) return " ";
        if (cardNumber.replace(/\s/g, "").length <= Math.floor(i * 0.8)) return "•";
        return c;
      }).join("")
    : "•••• •••• •••• ••••";

  const maskedNumber = cardNumber
    ? cardNumber
        .replace(/\s/g, "")
        .padEnd(16, "•")
        .replace(/(.{4})/g, "$1 ")
        .trim()
    : "•••• •••• •••• ••••";

  const gradients: Record<string, string> = {
    visa: "linear-gradient(135deg, #1a1f6e 0%, #2d3561 100%)",
    mastercard: "linear-gradient(135deg, #1b1b2f 0%, #2c2c54 100%)",
    elo: "linear-gradient(135deg, #1a3a2a 0%, #0f5132 100%)",
    amex: "linear-gradient(135deg, #1a3a5c 0%, #2a5298 100%)",
    default: "linear-gradient(135deg, #1b3d6d 0%, #122a4c 100%)",
  };

  const cardGradient = brand ? gradients[brand] : gradients.default;

  const isValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardName.trim().length >= 3 &&
    expiry.length === 5 &&
    cvv.length >= 3;

  const handleSave = () => {
    if (!isValid) return;
    setSaved(true);
    setTimeout(() => navigate(-1), 1200);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f8fafc" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-12 md:pt-5 pb-5 flex items-center gap-3"
        style={{ background: "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 flex items-center justify-center"
          style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
        >
          <ChevronLeft size={20} color="white" />
        </button>
        <div className="flex items-center gap-2">
          <CreditCard size={20} color="white" />
          <h1 className="text-white" style={{ fontSize: "18px", fontWeight: 800 }}>
            Adicionar cartão
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Card Preview */}
        <div
          className="relative mx-auto rounded-3xl overflow-hidden"
          style={{
            width: "100%",
            maxWidth: "320px",
            height: "185px",
            background: cardGradient,
            boxShadow: "0 16px 40px rgba(18,42,76,0.35)",
            transition: "background 0.4s",
          }}
        >
          {/* Glossy overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)",
            }}
          />
          {/* Circle decorations */}
          <div
            className="absolute rounded-full"
            style={{
              width: "180px",
              height: "180px",
              background: "rgba(255,255,255,0.05)",
              top: "-60px",
              right: "-40px",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: "120px",
              height: "120px",
              background: "rgba(255,255,255,0.04)",
              bottom: "-30px",
              left: "-30px",
            }}
          />

          {!flipped ? (
            /* Front */
            <div className="relative flex flex-col justify-between h-full p-5">
              <div className="flex items-start justify-between">
                {/* Chip */}
                <div
                  className="rounded-md"
                  style={{
                    width: "36px",
                    height: "28px",
                    background:
                      "linear-gradient(135deg, #d4a843 0%, #f0c060 50%, #c89a30 100%)",
                    boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3)",
                  }}
                >
                  <div
                    className="w-full h-full rounded-md"
                    style={{
                      background:
                        "repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 6px)",
                    }}
                  />
                </div>
                {/* Brand */}
                <BrandLogo brand={brand} />
              </div>

              {/* Number */}
              <div>
                <p
                  className="tracking-widest text-white mb-3"
                  style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "0.15em" }}
                >
                  {maskedNumber}
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Titular
                    </p>
                    <p
                      className="text-white uppercase"
                      style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.05em" }}
                    >
                      {cardName || "SEU NOME"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Validade
                    </p>
                    <p
                      className="text-white"
                      style={{ fontSize: "13px", fontWeight: 600 }}
                    >
                      {expiry || "MM/AA"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Back */
            <div className="relative flex flex-col justify-between h-full">
              {/* Magnetic stripe */}
              <div
                className="w-full mt-7"
                style={{ height: "38px", backgroundColor: "rgba(0,0,0,0.55)" }}
              />
              <div className="px-5 pb-5">
                <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                  CVV
                </p>
                <div
                  className="rounded-lg flex items-center justify-end px-3"
                  style={{
                    height: "36px",
                    backgroundColor: "rgba(255,255,255,0.9)",
                  }}
                >
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#334155", letterSpacing: "0.2em" }}>
                    {cvv ? cvv.replace(/./g, "•") : "•••"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tipo: Crédito / Débito */}
        <div
          className="flex rounded-2xl p-1"
          style={{ backgroundColor: "#e8eef6" }}
        >
          {(["credit", "debit"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setCardType(type)}
              className="flex-1 rounded-xl py-2.5 transition-all"
              style={{
                backgroundColor: cardType === type ? "#122a4c" : "transparent",
                fontSize: "13px",
                fontWeight: 700,
                color: cardType === type ? "white" : "#64748b",
              }}
            >
              {type === "credit" ? "Crédito" : "Débito"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-3">
          {/* Número do cartão */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Número do cartão
            </label>
            <div
              className="mt-1.5 flex items-center gap-3 rounded-2xl px-4"
              style={{
                height: "52px",
                backgroundColor: "white",
                border: `1.5px solid ${cardNumber ? "#122a4c" : "#d9e4f2"}`,
                boxShadow: cardNumber ? "0 0 0 3px rgba(18,42,76,0.08)" : "none",
              }}
            >
              <CreditCard size={18} color={cardNumber ? "#122a4c" : "#94a3b8"} />
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: "15px", color: "#1e293b", letterSpacing: "0.05em" }}
              />
            </div>
          </div>

          {/* Nome */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nome do titular
            </label>
            <input
              type="text"
              placeholder="Como está no cartão"
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              className="mt-1.5 w-full rounded-2xl px-4 outline-none"
              style={{
                height: "52px",
                backgroundColor: "white",
                border: `1.5px solid ${cardName ? "#122a4c" : "#d9e4f2"}`,
                boxShadow: cardName ? "0 0 0 3px rgba(18,42,76,0.08)" : "none",
                fontSize: "14px",
                color: "#1e293b",
              }}
            />
          </div>

          {/* Validade + CVV */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Validade
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="mt-1.5 w-full rounded-2xl px-4 outline-none"
                style={{
                  height: "52px",
                  backgroundColor: "white",
                  border: `1.5px solid ${expiry ? "#122a4c" : "#d9e4f2"}`,
                  boxShadow: expiry ? "0 0 0 3px rgba(18,42,76,0.08)" : "none",
                  fontSize: "14px",
                  color: "#1e293b",
                }}
              />
            </div>
            <div className="flex-1">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                CVV
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="•••"
                maxLength={4}
                value={cvv}
                onFocus={() => setFlipped(true)}
                onBlur={() => setFlipped(false)}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1.5 w-full rounded-2xl px-4 outline-none"
                style={{
                  height: "52px",
                  backgroundColor: "white",
                  border: `1.5px solid ${cvv ? "#122a4c" : "#d9e4f2"}`,
                  boxShadow: cvv ? "0 0 0 3px rgba(18,42,76,0.08)" : "none",
                  fontSize: "14px",
                  color: "#1e293b",
                  letterSpacing: "0.2em",
                }}
              />
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
        >
          <Lock size={14} color="#16a34a" className="flex-shrink-0" />
          <p style={{ fontSize: "12px", color: "#15803d" }}>
            Seus dados são protegidos com criptografia de ponta a ponta.
          </p>
        </div>

        <div className="pb-2" />
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 bg-white px-4 py-4"
        style={{ borderTop: "1px solid #d9e4f2" }}
      >
        <button
          onClick={handleSave}
          disabled={!isValid}
          className="w-full rounded-2xl py-4 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            backgroundColor: isValid ? "#122a4c" : "#cbd5e1",
            fontSize: "15px",
            fontWeight: 700,
            color: isValid ? "white" : "#94a3b8",
          }}
        >
          {saved ? (
            <>
              <Check size={18} color="white" />
              Cartão salvo!
            </>
          ) : (
            "Salvar cartão"
          )}
        </button>
      </div>
    </div>
  );
}