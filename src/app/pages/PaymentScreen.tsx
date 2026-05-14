import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, CreditCard, QrCode, Smartphone } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import {
  getMercadoPagoCheckoutConfig,
  getStoredPayerData,
  getStoredPaymentSelection,
  savePayerData,
  savePaymentSelection,
  type PaymentMethod,
  type PayerData,
} from '@/features/payments';

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

const methodOptions: Array<{
  id: PaymentMethod;
  label: string;
  desc: string;
  badge?: string;
  Icon: typeof QrCode;
}> = [
  {
    id: "pix",
    label: "PIX",
    desc: "QR Code e copia e cola gerados pelo Mercado Pago",
    badge: "Mais rápido",
    Icon: QrCode,
  },
  {
    id: "cartao_credito",
    label: "Cartão de crédito",
    desc: "Tokenizado pelo MercadoPago.js",
    Icon: CreditCard,
  },
  {
    id: "cartao_debito",
    label: "Cartão de débito",
    desc: "Tokenizado pelo MercadoPago.js",
    Icon: Smartphone,
  },
];

const cardBrands = [
  { value: "visa", label: "Visa crédito" },
  { value: "master", label: "Mastercard crédito" },
  { value: "elo", label: "Elo crédito" },
  { value: "debvisa", label: "Visa débito" },
  { value: "debmaster", label: "Mastercard débito" },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function splitName(name?: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.mercadopago.com/js/v2"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Nao foi possivel carregar MercadoPago.js.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Nao foi possivel carregar MercadoPago.js."));
    document.head.appendChild(script);
  });
}

export function PaymentScreen() {
  const navigate = useNavigate();
  const { tenantPath, marketId, currentUser } = useApp();
  const storedSelection = useMemo(() => getStoredPaymentSelection(), []);
  const storedPayer = useMemo(() => getStoredPayerData(), []);
  const nameParts = splitName(currentUser?.nome);

  const [selected, setSelected] = useState<PaymentMethod>(storedSelection.method || "pix");
  const [payer, setPayer] = useState<PayerData>({
    payer_email: storedPayer.payer_email || currentUser?.email || "",
    payer_first_name: storedPayer.payer_first_name || nameParts.firstName,
    payer_last_name: storedPayer.payer_last_name || nameParts.lastName,
    doc_type: storedPayer.doc_type || "CPF",
    doc_number: storedPayer.doc_number || "",
  });
  const [publicKey, setPublicKey] = useState("");
  const [cardholderName, setCardholderName] = useState(currentUser?.nome || "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState(
    storedSelection.payment_method_id || "visa"
  );
  const [installments, setInstallments] = useState(storedSelection.installments || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    getMercadoPagoCheckoutConfig(marketId)
      .then((config) => {
        if (!isActive) return;
        if (!config.connected) {
          setError("Esta loja ainda nao esta conectada ao Mercado Pago.");
        }
        setPublicKey(config.public_key || "");
      })
      .catch((err) => {
        if (isActive) setError(err instanceof Error ? err.message : "Nao foi possivel carregar Mercado Pago.");
      });

    return () => {
      isActive = false;
    };
  }, [marketId]);

  const updatePayer = (field: keyof PayerData, value: string) => {
    setPayer((prev) => ({ ...prev, [field]: value }));
  };

  const validatePayer = () => {
    if (!payer.payer_email || !payer.payer_first_name || !payer.payer_last_name) {
      throw new Error("Informe nome, sobrenome e e-mail do pagador.");
    }

    const doc = onlyDigits(payer.doc_number);
    if (payer.doc_type === "CPF" && doc.length !== 11) {
      throw new Error("Informe um CPF com 11 digitos.");
    }
    if (payer.doc_type === "CNPJ" && doc.length !== 14) {
      throw new Error("Informe um CNPJ com 14 digitos.");
    }

    return { ...payer, doc_number: doc };
  };

  const createCardToken = async (normalizedPayer: PayerData) => {
    if (!publicKey) throw new Error("Public key do Mercado Pago nao configurada.");

    const [month, year] = expiry.split("/").map((part) => part.trim());
    if (!month || !year || !cardholderName || !cardNumber || !securityCode) {
      throw new Error("Preencha todos os dados do cartao.");
    }

    await loadMercadoPagoSdk();
    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
    const token = await mp.createCardToken({
      cardNumber: onlyDigits(cardNumber),
      cardholderName,
      cardExpirationMonth: month.padStart(2, "0"),
      cardExpirationYear: year.length === 2 ? `20${year}` : year,
      securityCode,
      identificationType: normalizedPayer.doc_type,
      identificationNumber: normalizedPayer.doc_number,
    });

    if (!token?.id) {
      throw new Error("Mercado Pago nao retornou o token do cartao.");
    }

    return token.id;
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPayer = validatePayer();
      savePayerData(normalizedPayer);

      if (selected === "pix") {
        savePaymentSelection({ method: "pix" });
      } else {
        const cardToken = await createCardToken(normalizedPayer);
        savePaymentSelection({
          method: selected,
          card_token: cardToken,
          payment_method_id: paymentMethodId,
          issuer_id: null,
          installments,
        });
      }

      navigate(tenantPath("checkout"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel confirmar o pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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

          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#122a4c" }}>
            Forma de pagamento
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4" style={{ background: "#f8fafc" }}>
        <div className="mb-4 flex flex-col gap-3">
          {methodOptions.map(({ id, label, desc, badge, Icon }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border-2 text-left transition-all"
              style={{ borderColor: selected === id ? "#122a4c" : "#d9e4f2" }}
            >
              <div
                className="rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: selected === id ? "#eef4fb" : "#f8fafc",
                }}
              >
                <Icon size={22} color="#122a4c" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                    {label}
                  </p>
                  {badge && (
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        backgroundColor: "#eef4fb",
                        color: "#122a4c",
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "#64748b" }}>{desc}</p>
              </div>

              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: "20px",
                  height: "20px",
                  border: `2px solid ${selected === id ? "#122a4c" : "#cbd5e1"}`,
                  backgroundColor: selected === id ? "#122a4c" : "white",
                }}
              />
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4" style={{ border: "1px solid #d9e4f2" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#122a4c" }} className="mb-3">
            Dados do pagador
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nome" value={payer.payer_first_name} onChange={(e) => updatePayer("payer_first_name", e.target.value)} />
            <input className="rounded-xl border px-3 py-3 text-sm" placeholder="Sobrenome" value={payer.payer_last_name} onChange={(e) => updatePayer("payer_last_name", e.target.value)} />
            <input className="rounded-xl border px-3 py-3 text-sm md:col-span-2" placeholder="E-mail" value={payer.payer_email} onChange={(e) => updatePayer("payer_email", e.target.value)} />
            <select className="rounded-xl border px-3 py-3 text-sm" value={payer.doc_type} onChange={(e) => updatePayer("doc_type", e.target.value as "CPF" | "CNPJ")}>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </select>
            <input className="rounded-xl border px-3 py-3 text-sm" placeholder="Documento" inputMode="numeric" value={payer.doc_number} onChange={(e) => updatePayer("doc_number", e.target.value)} />
          </div>
        </div>

        {selected !== "pix" && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4" style={{ border: "1px solid #d9e4f2" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#122a4c" }} className="mb-3">
              Cartão
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="rounded-xl border px-3 py-3 text-sm md:col-span-2" placeholder="Nome impresso no cartao" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} />
              <input className="rounded-xl border px-3 py-3 text-sm md:col-span-2" placeholder="Numero do cartao" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
              <input className="rounded-xl border px-3 py-3 text-sm" placeholder="MM/AA" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              <input className="rounded-xl border px-3 py-3 text-sm" placeholder="CVV" inputMode="numeric" value={securityCode} onChange={(e) => setSecurityCode(e.target.value)} />
              <select className="rounded-xl border px-3 py-3 text-sm" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
                {cardBrands.map((brand) => (
                  <option key={brand.value} value={brand.value}>{brand.label}</option>
                ))}
              </select>
              <select className="rounded-xl border px-3 py-3 text-sm" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: selected === "cartao_debito" ? 1 : 12 }).map((_, index) => (
                  <option key={index + 1} value={index + 1}>{index + 1}x</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
            {error}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 bg-white px-4 py-4 border-t" style={{ borderColor: "#d9e4f2" }}>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full rounded-2xl py-4 text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: "#122a4c", fontSize: "15px", fontWeight: 700 }}
        >
          {isSubmitting ? "Validando..." : "Usar esta forma de pagamento"}
        </button>
      </div>
    </div>
  );
}
