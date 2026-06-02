import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChevronLeft, CreditCard, Loader2, Lock, QrCode, Smartphone } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { getStoredCheckoutMode } from '@/features/orders/services/checkoutModeService';
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

type CardPaymentTypeId = 'credit_card' | 'debit_card';

interface MercadoPagoCardToken {
  id?: string;
  first_six_digits?: string;
  last_four_digits?: string;
  cardholder?: {
    name?: string;
  };
}

interface MercadoPagoSecureField {
  mount: (containerId: string) => MercadoPagoSecureField;
  unmount?: () => void;
  update?: (options: Record<string, unknown>) => void;
  on?: (eventName: string, callback: (data: any) => void) => void;
}

interface MercadoPagoIssuer {
  id: string | number;
  name?: string;
}

interface MercadoPagoPaymentMethod {
  id: string;
  name?: string;
  payment_type_id?: string;
  additional_info_needed?: string[];
  issuer?: MercadoPagoIssuer | null;
  settings?: Array<{
    card_number?: unknown;
    security_code?: unknown;
  }>;
}

interface MercadoPagoInstallment {
  installments: number;
  recommended_message?: string;
}

interface MercadoPagoInstance {
  fields: {
    create: (
      fieldType: 'cardNumber' | 'expirationDate' | 'securityCode',
      options: Record<string, unknown>,
    ) => MercadoPagoSecureField;
    createCardToken: (options: {
      cardholderName: string;
      identificationType: string;
      identificationNumber: string;
    }) => Promise<MercadoPagoCardToken>;
  };
  getPaymentMethods: (options: { bin: string }) => Promise<{ results?: MercadoPagoPaymentMethod[] }>;
  getIssuers: (options: { paymentMethodId: string; bin: string }) => Promise<MercadoPagoIssuer[]>;
  getInstallments: (options: {
    amount: string;
    bin: string;
    paymentTypeId: CardPaymentTypeId;
  }) => Promise<Array<{ payer_costs?: MercadoPagoInstallment[] }>>;
}

type MercadoPagoConstructor = new (
  publicKey: string,
  options?: Record<string, unknown>,
) => MercadoPagoInstance;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoConstructor;
  }
}

const SECURE_FIELD_IDS = {
  cardNumber: 'mp-secure-card-number',
  expirationDate: 'mp-secure-expiration-date',
  securityCode: 'mp-secure-security-code',
};

const SECURE_FIELD_STYLE = {
  fontSize: "14px",
  fontFamily: "Arial, sans-serif",
  color: "#1e293b",
  placeholderColor: "#64748b",
};

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
    desc: "Informe os dados do cartão com campos seguros",
    Icon: CreditCard,
  },
  {
    id: "cartao_debito",
    label: "Cartão de débito",
    desc: "Pagamento à vista com cartão de débito",
    Icon: Smartphone,
  },
];

type PaymentScreenMode = "checkout" | "profilePaymentMethods";

type PaymentLocationState = {
  mode?: PaymentScreenMode;
  redirectTo?: string;
  initialMethod?: PaymentMethod;
};

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "pix" || value === "cartao_credito" || value === "cartao_debito";
}

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

function getCardBrand(paymentMethodId: string) {
  const id = paymentMethodId.toLowerCase();
  if (id.includes("visa")) return "visa";
  if (id.includes("master")) return "mastercard";
  if (id.includes("amex")) return "amex";
  if (id.includes("elo")) return "elo";
  if (id.includes("hipercard")) return "hipercard";
  return "";
}

function CardBrandLogo({ paymentMethodId }: { paymentMethodId: string }) {
  const brand = getCardBrand(paymentMethodId);

  if (brand === "mastercard") {
    return (
      <div className="relative h-7 w-11" aria-label="Mastercard">
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full" style={{ backgroundColor: "#eb001b" }} />
        <span className="absolute left-4 top-1 h-5 w-5 rounded-full" style={{ backgroundColor: "#f79e1b", opacity: 0.92 }} />
      </div>
    );
  }

  if (brand) {
    const label = brand === "amex" ? "AMEX" : brand === "hipercard" ? "HIPER" : brand.toUpperCase();
    return (
      <span
        className="rounded-md bg-white/95 px-2.5 py-1"
        style={{ color: "#122a4c", fontSize: brand === "hipercard" ? "11px" : "13px", fontWeight: 900, letterSpacing: "0.04em" }}
        aria-label={label}
      >
        {label}
      </span>
    );
  }

  return <CreditCard size={24} color="rgba(255,255,255,0.82)" />;
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

function getCardPaymentTypeId(method: PaymentMethod): CardPaymentTypeId {
  return method === "cartao_debito" ? "debit_card" : "credit_card";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function getDefaultInstallmentMessage(method: PaymentMethod) {
  return method === "cartao_debito" ? "Débito à vista" : "1x sem juros";
}

function clearSecureFieldContainers() {
  Object.values(SECURE_FIELD_IDS).forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.innerHTML = "";
  });
}

export function PaymentScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cartTotal,
    currentMarket,
    currentUser,
    discount,
    marketId,
    tenantPath,
  } = useApp();
  const storedSelection = useMemo(() => getStoredPaymentSelection(), []);
  const locationState = location.state as PaymentLocationState | null;
  const isProfilePaymentMethods = locationState?.mode === "profilePaymentMethods";
  const initialMethod = isPaymentMethod(locationState?.initialMethod)
    ? locationState.initialMethod
    : isProfilePaymentMethods && storedSelection.method === "pix"
      ? "cartao_credito"
      : storedSelection.method || "pix";
  const initialInstallments = initialMethod === storedSelection.method
    ? storedSelection.installments || 1
    : 1;
  const storedPayer = useMemo(() => getStoredPayerData(), []);
  const nameParts = splitName(currentUser?.nome);
  const orderType = getStoredCheckoutMode(marketId);
  const isPickup = orderType === 'pickup';
  const deliveryFee = isPickup ? 0 : Math.max(0, currentMarket.deliveryFee || 0);
  const paymentAmount = isProfilePaymentMethods
    ? 0
    : Math.max(cartTotal - discount + deliveryFee, 0);

  const mpRef = useRef<MercadoPagoInstance | null>(null);
  const fieldsRef = useRef<{
    cardNumber: MercadoPagoSecureField;
    expirationDate: MercadoPagoSecureField;
    securityCode: MercadoPagoSecureField;
  } | null>(null);
  const currentBinRef = useRef("");
  const metadataRequestRef = useRef(0);
  const refreshCardMetadataRef = useRef<(bin: string) => void>(() => {});
  const cardFormRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<PaymentMethod>(initialMethod);

  const [selected, setSelected] = useState<PaymentMethod>(initialMethod);
  const [payer, setPayer] = useState<PayerData>({
    payer_email: storedPayer.payer_email || currentUser?.email || "",
    payer_first_name: storedPayer.payer_first_name || nameParts.firstName,
    payer_last_name: storedPayer.payer_last_name || nameParts.lastName,
    doc_type: storedPayer.doc_type || "CPF",
    doc_number: storedPayer.doc_number || "",
  });
  const [publicKey, setPublicKey] = useState("");
  const [checkoutConfigLoaded, setCheckoutConfigLoaded] = useState(false);
  const [cardholderName, setCardholderName] = useState(currentUser?.nome || "");
  const [paymentMethodId, setPaymentMethodId] = useState(storedSelection.payment_method_id || "");
  const [issuerId, setIssuerId] = useState<string | number | null>(storedSelection.issuer_id ?? null);
  const [issuerOptions, setIssuerOptions] = useState<MercadoPagoIssuer[]>([]);
  const [installments, setInstallments] = useState(initialInstallments);
  const [installmentOptions, setInstallmentOptions] = useState<MercadoPagoInstallment[]>([
    { installments: initialInstallments, recommended_message: getDefaultInstallmentMessage(initialMethod) },
  ]);
  const [secureFieldsReady, setSecureFieldsReady] = useState(false);
  const [secureFieldsError, setSecureFieldsError] = useState("");
  const [cardMetadataMessage, setCardMetadataMessage] = useState("");
  const [isLoadingCardInfo, setIsLoadingCardInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryColor = currentMarket?.primaryColor || "#122a4c";
  const primarySoftColor = `color-mix(in srgb, ${primaryColor} 10%, white)`;
  const isCardPayment = selected !== "pix";
  const availableMethodOptions = useMemo(
    () => isProfilePaymentMethods
      ? methodOptions.filter((option) => option.id !== "pix")
      : methodOptions,
    [isProfilePaymentMethods],
  );
  const confirmDisabled = isSubmitting || (isCardPayment && (!secureFieldsReady || Boolean(secureFieldsError)));

  useEffect(() => {
    let isActive = true;
    setCheckoutConfigLoaded(false);

    getMercadoPagoCheckoutConfig(marketId)
      .then((config) => {
        if (!isActive) return;
        if (!config.connected) {
          showSystemNotice("Esta loja ainda não possui pagamentos online configurados.");
        }
        setPublicKey(config.public_key || "");
        setCheckoutConfigLoaded(true);
      })
      .catch((err) => {
        if (isActive) showSystemNotice(err || "Não foi possível carregar as formas de pagamento.");
        if (isActive) setCheckoutConfigLoaded(true);
      });

    return () => {
      isActive = false;
    };
  }, [marketId]);

  useEffect(() => {
    if (!isCardPayment) return;

    if (checkoutConfigLoaded && !publicKey) {
      setSecureFieldsError("Pagamento online não configurado para esta loja.");
    }
  }, [checkoutConfigLoaded, isCardPayment, publicKey]);

  useEffect(() => {
    if (!isCardPayment) return;

    const timeoutId = window.setTimeout(() => {
      cardFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [isCardPayment, selected]);

  const updatePayer = (field: keyof PayerData, value: string) => {
    setPayer((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

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

  const resetCardMetadata = useCallback((message = "") => {
    setPaymentMethodId("");
    setIssuerId(null);
    setIssuerOptions([]);
    setInstallments(1);
    setInstallmentOptions([
      { installments: 1, recommended_message: getDefaultInstallmentMessage(selectedRef.current) },
    ]);
    setCardMetadataMessage(message);
  }, []);

  const refreshCardMetadata = useCallback(async (bin: string) => {
    const mp = mpRef.current;
    const fields = fieldsRef.current;
    const normalizedBin = onlyDigits(bin);

    currentBinRef.current = normalizedBin;

    if (!mp || !fields || !normalizedBin) {
      resetCardMetadata();
      return;
    }

    const requestId = metadataRequestRef.current + 1;
    metadataRequestRef.current = requestId;
    setIsLoadingCardInfo(true);
    setCardMetadataMessage("");

    try {
      const targetType = getCardPaymentTypeId(selected);
      const { results = [] } = await mp.getPaymentMethods({ bin: normalizedBin });
      if (metadataRequestRef.current !== requestId) return;

      const paymentMethod =
        results.find((result) => result.payment_type_id === targetType) ||
        results[0];

      if (!paymentMethod?.id) {
        resetCardMetadata("Não foi possível identificar a bandeira do cartão.");
        return;
      }

      if (paymentMethod.payment_type_id && paymentMethod.payment_type_id !== targetType) {
        resetCardMetadata(`Este cartão foi identificado como ${paymentMethod.payment_type_id === "debit_card" ? "débito" : "crédito"}. Selecione a modalidade correta.`);
        return;
      }

      const cardNumberSettings = paymentMethod.settings?.[0]?.card_number;
      const securityCodeSettings = paymentMethod.settings?.[0]?.security_code;

      if (cardNumberSettings) fields.cardNumber.update?.({ settings: cardNumberSettings });
      if (securityCodeSettings) fields.securityCode.update?.({ settings: securityCodeSettings });

      setPaymentMethodId(paymentMethod.id);

      const needsIssuer = paymentMethod.additional_info_needed?.includes("issuer_id");
      const issuers = needsIssuer
        ? await mp.getIssuers({ paymentMethodId: paymentMethod.id, bin: normalizedBin })
        : paymentMethod.issuer?.id
          ? [paymentMethod.issuer]
          : [];

      if (metadataRequestRef.current !== requestId) return;

      setIssuerOptions(issuers);
      setIssuerId((currentIssuer) => {
        if (currentIssuer && issuers.some((issuer) => String(issuer.id) === String(currentIssuer))) {
          return currentIssuer;
        }
        return issuers[0]?.id ?? null;
      });

      if (selected === "cartao_debito") {
        setInstallments(1);
        setInstallmentOptions([{ installments: 1, recommended_message: "Débito à vista" }]);
        return;
      }

      if (paymentAmount <= 0) {
        setInstallments(1);
        setInstallmentOptions([{ installments: 1, recommended_message: "1x" }]);
        return;
      }

      const installmentResponse = await mp.getInstallments({
        amount: paymentAmount.toFixed(2),
        bin: normalizedBin,
        paymentTypeId: "credit_card",
      });

      if (metadataRequestRef.current !== requestId) return;

      const payerCosts = installmentResponse[0]?.payer_costs || [];
      const nextOptions = payerCosts.length > 0
        ? payerCosts
        : [{ installments: 1, recommended_message: "1x" }];

      setInstallmentOptions(nextOptions);
      setInstallments((currentInstallments) => (
        nextOptions.some((option) => option.installments === currentInstallments)
          ? currentInstallments
          : nextOptions[0].installments
      ));
    } catch (error) {
      if (metadataRequestRef.current === requestId) {
        resetCardMetadata(getErrorMessage(error, "Não foi possível validar a bandeira do cartão."));
      }
    } finally {
      if (metadataRequestRef.current === requestId) {
        setIsLoadingCardInfo(false);
      }
    }
  }, [paymentAmount, resetCardMetadata, selected]);

  useEffect(() => {
    refreshCardMetadataRef.current = (bin: string) => {
      void refreshCardMetadata(bin);
    };
  }, [refreshCardMetadata]);

  useEffect(() => {
    if (!isCardPayment) return;

    if (selected === "cartao_debito") {
      setInstallments(1);
      setInstallmentOptions([{ installments: 1, recommended_message: "Débito à vista" }]);
    }

    if (currentBinRef.current) {
      void refreshCardMetadata(currentBinRef.current);
    }
  }, [isCardPayment, refreshCardMetadata, selected]);

  useEffect(() => {
    if (!isCardPayment || !publicKey) return;

    let cancelled = false;

    const mountSecureFields = async () => {
      setSecureFieldsError("");
      setSecureFieldsReady(false);
      resetCardMetadata();
      clearSecureFieldContainers();

      try {
        await loadMercadoPagoSdk();
        if (cancelled || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const cardNumber = mp.fields
          .create("cardNumber", { placeholder: "Número do cartão", style: SECURE_FIELD_STYLE })
          .mount(SECURE_FIELD_IDS.cardNumber);
        const expirationDate = mp.fields
          .create("expirationDate", { placeholder: "MM/AA", style: SECURE_FIELD_STYLE })
          .mount(SECURE_FIELD_IDS.expirationDate);
        const securityCode = mp.fields
          .create("securityCode", { placeholder: "CVV", style: SECURE_FIELD_STYLE })
          .mount(SECURE_FIELD_IDS.securityCode);

        if (cancelled) {
          cardNumber.unmount?.();
          expirationDate.unmount?.();
          securityCode.unmount?.();
          clearSecureFieldContainers();
          return;
        }

        mpRef.current = mp;
        fieldsRef.current = { cardNumber, expirationDate, securityCode };

        cardNumber.on?.("binChange", (data) => {
          refreshCardMetadataRef.current(data?.bin || "");
        });

        setSecureFieldsReady(true);
      } catch (error) {
        if (!cancelled) {
          setSecureFieldsError(getErrorMessage(error, "Não foi possível carregar os campos seguros do cartão."));
        }
      }
    };

    void mountSecureFields();

    return () => {
      cancelled = true;
      metadataRequestRef.current += 1;
      fieldsRef.current?.cardNumber.unmount?.();
      fieldsRef.current?.expirationDate.unmount?.();
      fieldsRef.current?.securityCode.unmount?.();
      fieldsRef.current = null;
      mpRef.current = null;
      currentBinRef.current = "";
      setSecureFieldsReady(false);
      setIsLoadingCardInfo(false);
      clearSecureFieldContainers();
    };
  }, [isCardPayment, publicKey, resetCardMetadata]);

  const createSecureCardToken = async (normalizedPayer: PayerData) => {
    if (!publicKey) throw new Error("Pagamento online não configurado para esta loja.");
    if (!secureFieldsReady || !mpRef.current) throw new Error("Aguarde os campos seguros do cartão carregarem.");
    if (!cardholderName.trim()) throw new Error("Informe o nome impresso no cartão.");
    if (!paymentMethodId) throw new Error("Digite o número do cartão para identificar a bandeira.");
    if (issuerOptions.length > 0 && !issuerId) throw new Error("Selecione o banco emissor do cartão.");

    const token = await mpRef.current.fields.createCardToken({
      cardholderName: cardholderName.trim(),
      identificationType: normalizedPayer.doc_type,
      identificationNumber: normalizedPayer.doc_number,
    });

    if (!token?.id) {
      throw new Error("Não foi possível validar os dados do cartão.");
    }

    return token;
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const normalizedPayer = validatePayer();
      savePayerData(normalizedPayer);

      if (selected === "pix") {
        savePaymentSelection({ method: "pix" });
      } else {
        const cardToken = await createSecureCardToken(normalizedPayer);
        savePaymentSelection({
          method: selected,
          card_token: cardToken.id,
          payment_method_id: paymentMethodId,
          issuer_id: issuerId,
          installments,
          cardholder_name: cardholderName.trim(),
          last_four_digits: cardToken.last_four_digits,
        });
      }

      if (isProfilePaymentMethods) {
        showSystemNotice("Cartão salvo nos métodos de pagamento.", "Cartão salvo");
        navigate(locationState?.redirectTo || tenantPath("add-card"), { replace: true });
        return;
      }

      navigate(locationState?.redirectTo || tenantPath("checkout"));
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
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2"
            style={{ backgroundColor: "#eef4fb" }}
          >
            <ChevronLeft size={20} color="#122a4c" />
          </button>

          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#122a4c" }}>
            {isProfilePaymentMethods ? "Adicionar cartão" : "Forma de pagamento"}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4" style={{ background: "#f8fafc" }}>
        <div className="mb-4 flex flex-col gap-3">
          {availableMethodOptions.map(({ id, label, desc, badge, Icon }) => (
            <button
              key={id}
              type="button"
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
            <input className="rounded-xl border px-3 py-3 text-sm" placeholder="Nome" autoComplete="given-name" value={payer.payer_first_name} onChange={(e) => updatePayer("payer_first_name", e.target.value)} />
            <input className="rounded-xl border px-3 py-3 text-sm" placeholder="Sobrenome" autoComplete="family-name" value={payer.payer_last_name} onChange={(e) => updatePayer("payer_last_name", e.target.value)} />
            <input className="rounded-xl border px-3 py-3 text-sm md:col-span-2" placeholder="E-mail" autoComplete="email" value={payer.payer_email} onChange={(e) => updatePayer("payer_email", e.target.value)} />
            <select className="rounded-xl border px-3 py-3 text-sm" value={payer.doc_type} onChange={(e) => updatePayer("doc_type", e.target.value as "CPF" | "CNPJ")}>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </select>
            <input className="rounded-xl border px-3 py-3 text-sm" placeholder="Documento" inputMode="numeric" autoComplete="off" value={payer.doc_number} onChange={(e) => updatePayer("doc_number", onlyDigits(e.target.value).slice(0, payer.doc_type === "CPF" ? 11 : 14))} />
          </div>
        </div>

        {isCardPayment && (
          <div ref={cardFormRef} className="bg-white rounded-2xl p-4 shadow-sm mb-4" style={{ border: "1px solid #d9e4f2" }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 800, color: "#122a4c" }}>
                  Informe os dados do cartão
                </h2>
                <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
                  {isProfilePaymentMethods
                    ? "Preencha os campos abaixo para salvar este cartão."
                    : "Preencha os campos abaixo para continuar."}
                </p>
              </div>
            </div>

            <div
              className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
            >
              <Lock size={14} color="#15803d" className="flex-shrink-0" />
              <p style={{ fontSize: "12px", color: "#15803d", lineHeight: 1.4, fontWeight: 700 }}>
                Pagamento criptografado pelo Mercado Pago.
              </p>
            </div>

            <div
              className="relative mx-auto mb-4 overflow-hidden rounded-2xl p-4 text-white shadow-sm"
              style={{
                maxWidth: "360px",
                minHeight: "174px",
                background: `linear-gradient(135deg, ${primaryColor} 0%, #122a4c 100%)`,
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  width: "150px",
                  height: "150px",
                  background: "rgba(255,255,255,0.07)",
                  top: "-48px",
                  right: "-36px",
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: "96px",
                  height: "96px",
                  background: "rgba(255,255,255,0.05)",
                  bottom: "-30px",
                  left: "-24px",
                }}
              />
              <div className="relative flex min-h-[142px] flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div
                    className="rounded-md"
                    style={{
                      width: "36px",
                      height: "28px",
                      background: "linear-gradient(135deg, #d4a843 0%, #f0c060 50%, #c89a30 100%)",
                    }}
                  />
                  <CardBrandLogo paymentMethodId={paymentMethodId} />
                </div>

                <div>
                  <p style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "0.1em" }}>
                    •••• •••• •••• ••••
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.65)", fontWeight: 800 }}>
                        TITULAR
                      </p>
                      <p className="truncate" style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>
                        {cardholderName.trim() || "Nome impresso"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.65)", fontWeight: 800 }}>
                        TIPO
                      </p>
                      <p style={{ fontSize: "12px", fontWeight: 800 }}>
                        {selected === "cartao_debito" ? "Débito" : "Crédito"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid max-w-md grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                  Nome impresso no cartão
                </label>
                <input
                  className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
                  placeholder="Nome impresso no cartão"
                  autoComplete="cc-name"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                  Número do cartão
                </label>
                <div
                  id={SECURE_FIELD_IDS.cardNumber}
                  className="mp-secure-field rounded-xl border bg-white px-3"
                  style={{ borderColor: "#d9e4f2" }}
                />
              </div>

              <div>
                <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                  Validade
                </label>
                <div
                  id={SECURE_FIELD_IDS.expirationDate}
                  className="mp-secure-field rounded-xl border bg-white px-3"
                  style={{ borderColor: "#d9e4f2" }}
                />
              </div>

              <div>
                <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                  CVV
                </label>
                <div
                  id={SECURE_FIELD_IDS.securityCode}
                  className="mp-secure-field rounded-xl border bg-white px-3"
                  style={{ borderColor: "#d9e4f2" }}
                />
              </div>

              {isLoadingCardInfo && (
                <div className="col-span-2 rounded-xl px-3 py-2 text-sm" style={{ backgroundColor: "#f8fafc", color: "#64748b" }}>
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <Loader2 size={15} className="animate-spin" />
                    Conferindo cartão...
                  </span>
                </div>
              )}

              {issuerOptions.length > 1 ? (
                <div className="col-span-2">
                  <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                    Banco do cartão
                  </label>
                  <select
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                    value={issuerId ?? ""}
                    onChange={(e) => setIssuerId(e.target.value)}
                  >
                    {issuerOptions.map((issuer) => (
                      <option key={issuer.id} value={issuer.id}>
                        {issuer.name || `Banco ${issuer.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {selected === "cartao_credito" && paymentMethodId && !isProfilePaymentMethods && (
                <div className="col-span-2">
                  <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                    Parcelamento
                  </label>
                  <select
                    className="w-full rounded-xl border px-3 py-3 text-sm"
                    value={installments}
                    disabled={installmentOptions.length <= 1}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                  >
                    {installmentOptions.map((option) => (
                      <option key={option.installments} value={option.installments}>
                        {option.recommended_message || `${option.installments}x`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selected === "cartao_credito" && paymentMethodId && paymentAmount > 0 && (
              <p className="mt-3" style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                Parcelamento calculado sobre {formatCurrency(paymentAmount)}.
              </p>
            )}

            {(secureFieldsError || cardMetadataMessage) && (
              <p className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "12px", fontWeight: 700 }}>
                {secureFieldsError || cardMetadataMessage}
              </p>
            )}

            {!secureFieldsReady && !secureFieldsError && (
              <p className="mt-3 inline-flex items-center gap-2" style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>
                <Loader2 size={15} className="animate-spin" />
                Carregando pagamento seguro...
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 bg-white px-4 py-4 border-t" style={{ borderColor: "#d9e4f2" }}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className="w-full rounded-2xl py-4 text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: primaryColor, fontSize: "15px", fontWeight: 700 }}
        >
          {isSubmitting
            ? isProfilePaymentMethods ? "Salvando..." : "Validando..."
            : isCardPayment && !secureFieldsReady
              ? "Carregando cartão seguro..."
              : isProfilePaymentMethods ? "Salvar cartão" : "Usar esta forma de pagamento"}
        </button>
      </div>
    </div>
  );
}
