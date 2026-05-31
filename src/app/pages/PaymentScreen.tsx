import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

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
    desc: "Pague com QR Code ou código copia e cola",
    badge: "Mais rápido",
    Icon: QrCode,
  },
  {
    id: "cartao_credito",
    label: "Cartão de crédito",
    desc: "Informe os dados do cartão e escolha o parcelamento",
    Icon: CreditCard,
  },
  {
    id: "cartao_debito",
    label: "Cartão de débito",
    desc: "Pagamento à vista com cartão de débito",
    Icon: Smartphone,
  },
];

const cardBrandOptions = [
  { name: "Visa", creditId: "visa", debitId: "debvisa", test: (digits: string) => /^4/.test(digits) },
  { name: "Mastercard", creditId: "master", debitId: "debmaster", test: (digits: string) => /^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(digits) },
  { name: "Elo", creditId: "elo", debitId: "elo", test: (digits: string) => /^(4011|4312|4389|4514|4576|504175|5067|509|627780|636297|636368)/.test(digits) },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function detectCardBrand(cardNumber: string) {
  const digits = onlyDigits(cardNumber);
  if (digits.length < 4) return null;
  return cardBrandOptions.find((brand) => brand.test(digits)) || null;
}

function formatCardNumber(value: string) {
  return onlyDigits(value).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function maskCardPreview(value: string) {
  const digits = onlyDigits(value);
  const padded = `${digits}${"0000000000000000".slice(digits.length)}`.slice(0, 16);
  return padded.replace(/(.{4})/g, "$1 ").trim();
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
      existingScript.addEventListener("error", () => reject(new Error("Não foi possível carregar o pagamento online.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar o pagamento online."));
    document.head.appendChild(script);
  });
}

export function PaymentScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantPath, marketId, currentUser, currentMarket } = useApp();
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
  const [installments, setInstallments] = useState(storedSelection.installments || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const primaryColor = currentMarket?.primaryColor || "#122a4c";
  const secondaryColor = currentMarket?.secondaryColor || "#1b3d6d";
  const primarySoftColor = `color-mix(in srgb, ${primaryColor} 10%, white)`;
  const detectedBrand = detectCardBrand(cardNumber);
  const effectivePaymentMethodId = selected === "cartao_debito"
    ? detectedBrand?.debitId
    : detectedBrand?.creditId;
  const cardPreviewName = cardholderName.trim() || "Nome impresso";
  const cardPreviewNumber = cardNumber ? maskCardPreview(cardNumber) : "0000 0000 0000 0000";
  const cardPreviewExpiry = expiry || "MM/AA";

  useEffect(() => {
    let isActive = true;

    getMercadoPagoCheckoutConfig(marketId)
      .then((config) => {
        if (!isActive) return;
        if (!config.connected) {
          showSystemNotice("Esta loja ainda não possui pagamentos online configurados.");
        }
        setPublicKey(config.public_key || "");
      })
      .catch((err) => {
        if (isActive) showSystemNotice(err || "Não foi possível carregar as formas de pagamento.");
      });

    return () => {
      isActive = false;
    };
  }, [marketId]);

  useEffect(() => {
    if (selected === "cartao_debito") {
      setInstallments(1);
    }
  }, [selected]);

  const updatePayer = (field: keyof PayerData, value: string) => {
    setPayer((prev) => ({ ...prev, [field]: value }));
  };

  const validatePayer = () => {
    if (!payer.payer_email || !payer.payer_first_name || !payer.payer_last_name) {
      throw new Error("Informe nome, sobrenome e e-mail do pagador.");
    }

    const doc = onlyDigits(payer.doc_number);
    if (payer.doc_type === "CPF" && doc.length !== 11) {
      throw new Error("Informe um CPF com 11 dígitos.");
    }
    if (payer.doc_type === "CNPJ" && doc.length !== 14) {
      throw new Error("Informe um CNPJ com 14 dígitos.");
    }

    return { ...payer, doc_number: doc };
  };

  const createCardToken = async (normalizedPayer: PayerData) => {
    if (!publicKey) throw new Error("Pagamento online não configurado para esta loja.");

    const [month, year] = expiry.split("/").map((part) => part.trim());
    if (!month || !year || !cardholderName || !cardNumber || !securityCode) {
      throw new Error("Preencha todos os dados do cartão.");
    }
    if (!effectivePaymentMethodId) {
      throw new Error("Não foi possível identificar a bandeira do cartão. Confira o número informado.");
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
      throw new Error("Não foi possível validar os dados do cartão.");
    }

    return token.id;
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);

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
          payment_method_id: effectivePaymentMethodId,
          issuer_id: null,
          installments,
        });
      }

      const state = location.state as { redirectTo?: string } | null;
      navigate(state?.redirectTo || tenantPath("checkout"));
    } catch (err) {
      showSystemNotice(err || "Não foi possível confirmar o pagamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex-shrink-0 bg-white px-4 pt-8 md:pt-4 pb-3 border-b"
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
              style={{ borderColor: selected === id ? primaryColor : "#d9e4f2" }}
            >
              <div
                className="rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: selected === id ? primarySoftColor : "#f8fafc",
                }}
              >
                <Icon size={22} color={primaryColor} />
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
                        backgroundColor: primarySoftColor,
                        color: primaryColor,
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
                  border: `2px solid ${selected === id ? primaryColor : "#cbd5e1"}`,
                  backgroundColor: selected === id ? primaryColor : "white",
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
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4" style={{ border: `1px solid ${primarySoftColor}` }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#122a4c" }}>
                  Dados do cartão
                </h2>
                <p style={{ fontSize: "12px", color: "#64748b" }}>
                  A bandeira aparece automaticamente ao digitar o numero.
                </p>
              </div>
              <span
                className="rounded-full px-3 py-1"
                style={{ fontSize: "11px", fontWeight: 700, color: primaryColor, backgroundColor: primarySoftColor }}
              >
                {detectedBrand?.name || "Bandeira"}
              </span>
            </div>

            <div
              className="mb-4 rounded-2xl p-4 text-white shadow-sm"
              style={{
                minHeight: "176px",
                background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
              }}
            >
              <div className="mb-8 flex items-center justify-between">
                <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em" }}>
                  {selected === "cartao_debito" ? "DÉBITO" : "CRÉDITO"}
                </span>
                <span style={{ fontSize: "15px", fontWeight: 800 }}>
                  {detectedBrand?.name || "Cartão"}
                </span>
              </div>
              <p style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "0.12em" }}>
                {cardPreviewNumber}
              </p>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.68)", fontWeight: 700 }}>
                    TITULAR
                  </p>
                  <p className="truncate" style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>
                    {cardPreviewName}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.68)", fontWeight: 700 }}>
                    VALIDADE
                  </p>
                  <p style={{ fontSize: "12px", fontWeight: 700 }}>{cardPreviewExpiry}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="rounded-xl border px-3 py-3 text-sm md:col-span-2" placeholder="Nome impresso no cartão" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} />
              <input className="rounded-xl border px-3 py-3 text-sm md:col-span-2" placeholder="Número do cartão" inputMode="numeric" autoComplete="cc-number" value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} />
              <input className="rounded-xl border px-3 py-3 text-sm" placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} />
              <input className="rounded-xl border px-3 py-3 text-sm" placeholder="CVV" inputMode="numeric" autoComplete="cc-csc" value={securityCode} onChange={(e) => setSecurityCode(onlyDigits(e.target.value).slice(0, 4))} />
              <div className="rounded-xl border px-3 py-3 text-sm" style={{ color: detectedBrand ? "#334155" : "#94a3b8" }}>
                {detectedBrand ? detectedBrand.name : "Bandeira identificada automaticamente"}
              </div>
              <select className="rounded-xl border px-3 py-3 text-sm" value={installments} disabled={selected === "cartao_debito"} onChange={(e) => setInstallments(Number(e.target.value))}>
                {Array.from({ length: selected === "cartao_debito" ? 1 : 12 }).map((_, index) => (
                  <option key={index + 1} value={index + 1}>{index + 1}x</option>
                ))}
              </select>
            </div>
          </div>
        )}

      </div>

      <div className="flex-shrink-0 bg-white px-4 py-4 border-t" style={{ borderColor: "#d9e4f2" }}>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full rounded-2xl py-4 text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: primaryColor, fontSize: "15px", fontWeight: 700 }}
        >
          {isSubmitting ? "Validando..." : "Usar esta forma de pagamento"}
        </button>
      </div>
    </div>
  );
}
