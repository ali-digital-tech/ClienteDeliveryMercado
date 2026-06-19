import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Banknote, ChevronLeft, CreditCard, Loader2, Lock, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { getStoredCheckoutMode } from '@/features/orders/services/checkoutModeService';
import {
  getMercadoPagoCheckoutConfig,
  getSavedPaymentCards,
  getStoredPayerData,
  getStoredPaymentSelection,
  hasFreshCardToken,
  PayerDataForm,
  savePayerData,
  saveCustomerPaymentCard,
  savePaymentSelection,
  selectionFromSavedCard,
  validatePayerData,
  type CardPaymentMethod,
  type PaymentMethod,
  type PayerData,
  type SavedPaymentCard,
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
      cardholderName?: string;
      identificationType?: string;
      identificationNumber?: string;
      cardId?: string;
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
  savedSecurityCode: 'mp-secure-saved-security-code',
};

const SECURE_FIELD_STYLE = {
  fontSize: "14px",
  fontFamily: "Arial, sans-serif",
  color: "#1e293b",
  placeholderColor: "#64748b",
};

const SECURE_FIELD_CVV_STYLE = {
  ...SECURE_FIELD_STYLE,
  fontSize: "16px",
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
  {
    id: "dinheiro",
    label: "Dinheiro",
    desc: "Pague na entrega ou retirada",
    Icon: Banknote,
  },
];

const cardSaveOptions: Array<{
  id: CardSaveMode;
  label: string;
  desc: string;
  badge?: string;
  Icon: typeof CreditCard;
}> = [
  {
    id: "cartao_credito",
    label: "Crédito",
    desc: "Salva o cartão para compras no crédito",
    Icon: CreditCard,
  },
  {
    id: "cartao_debito",
    label: "Débito",
    desc: "Salva o cartão para compras no débito",
    Icon: Smartphone,
  },
  {
    id: "cartao_credito_debito",
    label: "Crédito + Débito",
    desc: "O mesmo cartão aparecerá nas duas opções",
    Icon: CreditCard,
  },
];

type PaymentScreenMode = "checkout" | "profilePaymentMethods";
type CardSaveMode = CardPaymentMethod | "cartao_credito_debito";

type PaymentLocationState = {
  mode?: PaymentScreenMode;
  redirectTo?: string;
  initialMethod?: PaymentMethod;
};

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "pix" || value === "cartao_credito" || value === "cartao_debito" || value === "dinheiro";
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
        style={{ color: "var(--market-primary-color)", fontSize: brand === "hipercard" ? "11px" : "13px", fontWeight: 900, letterSpacing: "0.04em" }}
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

function getPaymentMethodForSaveMode(mode: CardSaveMode): CardPaymentMethod {
  return mode === "cartao_debito" ? "cartao_debito" : "cartao_credito";
}

function getCardSaveModeLabel(mode: CardSaveMode) {
  if (mode === "cartao_credito_debito") return "Crédito e débito";
  return mode === "cartao_debito" ? "Débito" : "Crédito";
}

const debitPaymentMethodByBrand: Record<string, string> = {
  visa: "debvisa",
  mastercard: "debmaster",
  master: "debmaster",
  elo: "debelo",
  cabal: "debcabal",
};

function getDebitPaymentMethodId(paymentMethod: MercadoPagoPaymentMethod) {
  const id = paymentMethod.id.toLowerCase();
  if (id.startsWith("deb") || id === "maestro") return paymentMethod.id;

  const brand = getCardBrand(`${paymentMethod.id} ${paymentMethod.name || ""}`);
  return brand ? debitPaymentMethodByBrand[brand] || "" : "";
}

function resolvePaymentMethodForSelection(
  results: MercadoPagoPaymentMethod[],
  selectedMethod: PaymentMethod,
) {
  const targetType = getCardPaymentTypeId(selectedMethod);
  const exactMatch = results.find((result) => result.payment_type_id === targetType);
  if (exactMatch) return { paymentMethod: exactMatch, inferredDebit: false };

  const firstMethod = results[0] || null;
  if (selectedMethod === "cartao_debito" && firstMethod) {
    const debitPaymentMethodId = getDebitPaymentMethodId(firstMethod);
    if (debitPaymentMethodId) {
      return {
        paymentMethod: {
          ...firstMethod,
          id: debitPaymentMethodId,
          payment_type_id: "debit_card",
        },
        inferredDebit: true,
      };
    }
  }

  return { paymentMethod: firstMethod, inferredDebit: false };
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
  const initialMethod = isProfilePaymentMethods && locationState?.initialMethod === "dinheiro"
    ? "cartao_credito"
    : isPaymentMethod(locationState?.initialMethod)
    ? locationState.initialMethod
    : isProfilePaymentMethods && (storedSelection.method === "pix" || storedSelection.method === "dinheiro")
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
    cardNumber?: MercadoPagoSecureField;
    expirationDate?: MercadoPagoSecureField;
    securityCode: MercadoPagoSecureField;
  } | null>(null);
  const currentBinRef = useRef("");
  const metadataRequestRef = useRef(0);
  const refreshCardMetadataRef = useRef<(bin: string) => void>(() => {});
  const cardFormRef = useRef<HTMLDivElement | null>(null);
  const selectedRef = useRef<PaymentMethod>(initialMethod);

  const [selected, setSelected] = useState<PaymentMethod>(initialMethod);
  const [cardSaveMode, setCardSaveMode] = useState<CardSaveMode>(
    initialMethod === "cartao_debito" ? "cartao_debito" : "cartao_credito"
  );
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
  const [savedCards, setSavedCards] = useState<SavedPaymentCard[]>([]);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState("");
  const [saveCardForNextPurchases, setSaveCardForNextPurchases] = useState(false);
  const [secureFieldsReady, setSecureFieldsReady] = useState(false);
  const [secureFieldsError, setSecureFieldsError] = useState("");
  const [cardMetadataMessage, setCardMetadataMessage] = useState("");
  const [isLoadingCardInfo, setIsLoadingCardInfo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cashNoChange, setCashNoChange] = useState(storedSelection.sem_troco !== false);
  const [cashChangeAmount, setCashChangeAmount] = useState(
    storedSelection.troco_para ? String(storedSelection.troco_para).replace(".", ",") : ""
  );

  const applySavedCardSelection = useCallback((card: SavedPaymentCard, preferredInstallments = storedSelection.installments || 1) => {
    const nextInstallments = card.forma_pagamento === "cartao_debito" ? 1 : preferredInstallments;

    setSelected(card.forma_pagamento);
    setSelectedSavedCardId(card.id);
    setPaymentMethodId(card.payment_method_id);
    setIssuerId(card.issuer_id ?? null);
    setInstallments(nextInstallments);
    setInstallmentOptions([
      { installments: nextInstallments, recommended_message: getDefaultInstallmentMessage(card.forma_pagamento) },
    ]);
  }, [storedSelection.installments]);

  const primaryColor = currentMarket?.primaryColor || "var(--market-primary-color)";
  const primarySoftColor = `color-mix(in srgb, ${primaryColor} 10%, white)`;
  const isCashPayment = selected === "dinheiro";
  const isCardPayment = selected !== "pix" && selected !== "dinheiro";
  const selectedSavedCard = savedCards.find((card) => card.id === selectedSavedCardId) || null;
  const isUsingSavedCard = Boolean(isCardPayment && !isProfilePaymentMethods && selectedSavedCard);
  const savedCardsForSelectedMethod = savedCards.filter((card) => card.forma_pagamento === selected);
  const cashChangeValue = Number(cashChangeAmount.replace(",", "."));
  const availableMethodOptions = useMemo(
    () => isProfilePaymentMethods
      ? methodOptions.filter((option) => option.id !== "pix" && option.id !== "dinheiro")
      : methodOptions.filter((option) => option.id !== "dinheiro" || currentMarket.acceptsCash),
    [currentMarket.acceptsCash, isProfilePaymentMethods],
  );
  const payerValidation = validatePayerData(payer);
  const confirmDisabled =
    isSubmitting ||
    (!isCashPayment && !payerValidation.isValid) ||
    (isCashPayment && !cashNoChange && (!Number.isFinite(cashChangeValue) || cashChangeValue < paymentAmount)) ||
    (isCardPayment && (!secureFieldsReady || Boolean(secureFieldsError)));

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
    if (selected === "dinheiro" && !currentMarket.acceptsCash) {
      setSelected("pix");
      savePaymentSelection({ method: "pix" });
    }
  }, [currentMarket.acceptsCash, selected]);

  useEffect(() => {
    if (isProfilePaymentMethods) return;

    let isActive = true;
    getSavedPaymentCards(marketId)
      .then((cards) => {
        if (!isActive) return;
        setSavedCards(cards);

        const defaultCard = cards.find((card) => card.principal) || cards[0] || null;
        if (!defaultCard) return;

        const shouldUseSavedCard = storedSelection.method !== "pix" && storedSelection.method !== "dinheiro";
        const hasFreshStoredToken = hasFreshCardToken(storedSelection);
        const storedSavedCard = shouldUseSavedCard && storedSelection.saved_card_id
          ? cards.find((card) => card.id === storedSelection.saved_card_id)
          : null;
        const cardToUse = shouldUseSavedCard
          ? storedSavedCard || (!hasFreshStoredToken ? defaultCard : null)
          : null;

        if (cardToUse) applySavedCardSelection(cardToUse);
      })
      .catch((error) => {
        console.error("Erro ao carregar cartões salvos:", error);
      });

    return () => {
      isActive = false;
    };
  }, [applySavedCardSelection, isProfilePaymentMethods, marketId, storedSelection.method, storedSelection.saved_card_id]);

  useEffect(() => {
    if (!isCardPayment) {
      setSelectedSavedCardId("");
      setSaveCardForNextPurchases(false);
      return;
    }

    if (selectedSavedCard && selectedSavedCard.forma_pagamento !== selected) {
      setSelectedSavedCardId("");
    }
  }, [isCardPayment, selected, selectedSavedCard]);

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

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const validatePayer = () => {
    const validation = validatePayerData(payer);
    if (!validation.isValid) {
      throw new Error(
        validation.errors.full_name ||
        validation.errors.payer_email ||
        validation.errors.doc_number ||
        "Revise os dados do pagador."
      );
    }

    return validation.data;
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

  const findSavedCardForMethod = useCallback((method: PaymentMethod) => (
    savedCards.find((card) => card.forma_pagamento === method && card.principal) ||
    savedCards.find((card) => card.forma_pagamento === method) ||
    null
  ), [savedCards]);

  const handleSelectMethod = useCallback((method: PaymentMethod) => {
    setSelected(method);

    if (method === "pix" || method === "dinheiro") {
      setSelectedSavedCardId("");
      return;
    }

    if (isProfilePaymentMethods) return;

    const savedCard = findSavedCardForMethod(method);
    if (savedCard) {
      applySavedCardSelection(savedCard);
      return;
    }

    setSelectedSavedCardId("");
  }, [applySavedCardSelection, findSavedCardForMethod, isProfilePaymentMethods]);

  const handleSelectCardSaveMode = useCallback((mode: CardSaveMode) => {
    setCardSaveMode(mode);
    setSelected(getPaymentMethodForSaveMode(mode));
    setSelectedSavedCardId("");
    resetCardMetadata();
  }, [resetCardMetadata]);

  const refreshCardMetadata = useCallback(async (bin: string) => {
    const mp = mpRef.current;
    const fields = fieldsRef.current;
    const normalizedBin = onlyDigits(bin);

    currentBinRef.current = normalizedBin;

    if (!mp || !fields?.cardNumber || !normalizedBin) {
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

      const { paymentMethod, inferredDebit } = resolvePaymentMethodForSelection(results, selected);

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
      setCardMetadataMessage(inferredDebit ? "Cartão configurado para débito à vista." : "");

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
    if (!isCardPayment || isUsingSavedCard) return;

    if (selected === "cartao_debito") {
      setInstallments(1);
      setInstallmentOptions([{ installments: 1, recommended_message: "Débito à vista" }]);
    }

    if (currentBinRef.current) {
      void refreshCardMetadata(currentBinRef.current);
    }
  }, [isCardPayment, isUsingSavedCard, refreshCardMetadata, selected]);

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
        if (isUsingSavedCard) {
          const securityCode = mp.fields
            .create("securityCode", { placeholder: "CVV", style: SECURE_FIELD_CVV_STYLE })
            .mount(SECURE_FIELD_IDS.savedSecurityCode);

          if (cancelled) {
            securityCode.unmount?.();
            clearSecureFieldContainers();
            return;
          }

          mpRef.current = mp;
          fieldsRef.current = { securityCode };
          setSecureFieldsReady(true);
          return;
        }

        const cardNumber = mp.fields
          .create("cardNumber", { placeholder: "Número do cartão", style: SECURE_FIELD_STYLE })
          .mount(SECURE_FIELD_IDS.cardNumber);
        const expirationDate = mp.fields
          .create("expirationDate", { placeholder: "MM/AA", style: SECURE_FIELD_STYLE })
          .mount(SECURE_FIELD_IDS.expirationDate);
        const securityCode = mp.fields
          .create("securityCode", { placeholder: "CVV", style: SECURE_FIELD_CVV_STYLE })
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
      fieldsRef.current?.cardNumber?.unmount?.();
      fieldsRef.current?.expirationDate?.unmount?.();
      fieldsRef.current?.securityCode.unmount?.();
      fieldsRef.current = null;
      mpRef.current = null;
      currentBinRef.current = "";
      setSecureFieldsReady(false);
      setIsLoadingCardInfo(false);
      clearSecureFieldContainers();
    };
  }, [isCardPayment, isUsingSavedCard, publicKey, resetCardMetadata]);

  const createSecureCardToken = async (normalizedPayer: PayerData) => {
    if (!publicKey) throw new Error("Pagamento online não configurado para esta loja.");
    if (!secureFieldsReady || !mpRef.current) throw new Error("Aguarde os campos seguros do cartão carregarem.");

    if (isUsingSavedCard && selectedSavedCard) {
      const token = await mpRef.current.fields.createCardToken({
        cardId: selectedSavedCard.gateway_card_id,
      });

      if (!token?.id) {
        throw new Error("Não foi possível validar o CVV do cartão salvo.");
      }

      return token;
    }

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
      const normalizedPayer = isCashPayment ? null : validatePayer();
      if (normalizedPayer) savePayerData(normalizedPayer);

      if (selected === "pix") {
        savePaymentSelection({ method: "pix" });
      } else if (selected === "dinheiro") {
        const parsedChange = Number(cashChangeAmount.replace(/\./g, "").replace(",", "."));
        savePaymentSelection({
          method: "dinheiro",
          sem_troco: cashNoChange,
          troco_para: cashNoChange || !Number.isFinite(parsedChange) ? null : parsedChange,
        });
      } else {
        const cardToken = await createSecureCardToken(normalizedPayer!);
        const baseSelection = selectedSavedCard
          ? {
              ...selectionFromSavedCard(selectedSavedCard),
              card_token: cardToken.id,
              card_token_created_at: Date.now(),
              installments,
            }
          : {
              method: selected,
              card_token: cardToken.id,
              card_token_created_at: Date.now(),
              payment_method_id: paymentMethodId,
              issuer_id: issuerId,
              installments,
              cardholder_name: cardholderName.trim(),
              last_four_digits: cardToken.last_four_digits,
            };

        if (!selectedSavedCard && (isProfilePaymentMethods || saveCardForNextPurchases)) {
          const formasPagamento = isProfilePaymentMethods && cardSaveMode === "cartao_credito_debito"
            ? ["cartao_credito", "cartao_debito"] satisfies CardPaymentMethod[]
            : undefined;
          const savedCard = await saveCustomerPaymentCard(marketId, normalizedPayer!, baseSelection, {
            formas_pagamento: formasPagamento,
          });
          const savedSelection = selectionFromSavedCard(savedCard);

          if (isProfilePaymentMethods) {
            savePaymentSelection(savedSelection);
          } else {
            const savedCardToken = await mpRef.current!.fields.createCardToken({
              cardId: savedCard.gateway_card_id,
            });

            if (!savedCardToken?.id) {
              throw new Error("Cartão salvo, mas não foi possível validar o CVV para esta compra.");
            }

            savePaymentSelection({
              ...savedSelection,
              card_token: savedCardToken.id,
              card_token_created_at: Date.now(),
              installments,
            });
          }
        } else {
          savePaymentSelection(baseSelection);
        }
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
        style={{ borderColor: "var(--market-primary-border-color)" }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2"
            style={{ backgroundColor: "var(--market-primary-soft-color)" }}
          >
            <ChevronLeft size={20} color="var(--market-primary-color)" />
          </button>

          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "var(--market-primary-color)" }}>
            {isProfilePaymentMethods ? "Adicionar cartão" : "Forma de pagamento"}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4" style={{ background: "#f8fafc" }}>
        <div className="mb-4 flex flex-col gap-3">
          {isProfilePaymentMethods && (
            <p style={{ fontSize: "12px", fontWeight: 900, color: "var(--market-primary-color)" }}>
              Salvar como
            </p>
          )}

          {(isProfilePaymentMethods ? cardSaveOptions : availableMethodOptions).map(({ id, label, desc, badge, Icon }) => {
            const isSelectedOption = isProfilePaymentMethods ? cardSaveMode === id : selected === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (isProfilePaymentMethods) {
                    handleSelectCardSaveMode(id as CardSaveMode);
                    return;
                  }
                  handleSelectMethod(id as PaymentMethod);
                }}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 border-2 text-left transition-all"
                style={{ borderColor: isSelectedOption ? primaryColor : "var(--market-primary-border-color)" }}
              >
                <div
                  className="rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: isSelectedOption ? primarySoftColor : "#f8fafc",
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
                    border: `2px solid ${isSelectedOption ? primaryColor : "#cbd5e1"}`,
                    backgroundColor: isSelectedOption ? primaryColor : "white",
                  }}
                />
              </button>
            );
          })}
        </div>

        {!isCashPayment && (
          <div className="mb-4">
            <PayerDataForm
              value={payer}
              onChange={setPayer}
              primaryColor={primaryColor}
              description={isCardPayment ? "Usado para validar o cartão com segurança." : "Usado para emitir e acompanhar o pagamento."}
            />
          </div>
        )}

        {isCashPayment && (
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid var(--market-primary-border-color)" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 800, color: "var(--market-primary-color)" }}>
              Troco
            </h2>
            <label className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3" style={{ backgroundColor: primarySoftColor }}>
              <input
                type="checkbox"
                checked={cashNoChange}
                onChange={(event) => setCashNoChange(event.target.checked)}
              />
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#334155" }}>
                Não preciso de troco
              </span>
            </label>
            {!cashNoChange && (
              <label className="mt-3 block">
                <span className="mb-1 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                  Troco para R$
                </span>
                <input
                  value={cashChangeAmount}
                  onChange={(event) => setCashChangeAmount(event.target.value.replace(/[^\d,.]/g, ""))}
                  inputMode="decimal"
                  placeholder="Ex.: 100,00"
                  className="w-full rounded-xl border px-3 py-3 outline-none"
                  style={{ borderColor: "var(--market-primary-border-color)", fontSize: "15px", color: "#1e293b" }}
                />
              </label>
            )}
          </div>
        )}

        {isCardPayment && (
          <div ref={cardFormRef} className="mb-4 rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid var(--market-primary-border-color)" }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 800, color: "var(--market-primary-color)" }}>
                  {isUsingSavedCard ? "Cartão salvo" : "Informe os dados do cartão"}
                </h2>
                <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.45 }}>
                  {isUsingSavedCard
                    ? "Digite apenas o CVV para validar este pagamento."
                    : isProfilePaymentMethods
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
                O app não armazena número completo do cartão nem CVV.
              </p>
            </div>

            {!isProfilePaymentMethods && savedCardsForSelectedMethod.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p style={{ fontSize: "12px", fontWeight: 900, color: "var(--market-primary-color)" }}>
                    Cartões salvos
                  </p>
                  {selectedSavedCardId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSavedCardId("");
                        resetCardMetadata();
                      }}
                      className="rounded-lg px-2 py-1"
                      style={{ backgroundColor: "var(--market-primary-soft-color)", color: "var(--market-primary-color)", fontSize: "11px", fontWeight: 800 }}
                    >
                      Usar novo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {savedCardsForSelectedMethod.map((card) => {
                    const isSelectedCard = card.id === selectedSavedCardId;

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => applySavedCardSelection(card)}
                        className="flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left"
                        style={{
                          borderColor: isSelectedCard ? primaryColor : "var(--market-primary-border-color)",
                          backgroundColor: isSelectedCard ? primarySoftColor : "#fff",
                        }}
                      >
                        <div className="min-w-0">
                          <p className="truncate" style={{ fontSize: "13px", fontWeight: 900, color: "var(--market-primary-color)" }}>
                            •••• {card.ultimos_quatro} · {card.nome_impresso || "Cartão cadastrado"}
                          </p>
                          <p style={{ fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
                            {card.principal ? "Principal" : "Salvo"} · {card.forma_pagamento === "cartao_debito" ? "Débito" : "Crédito"}
                          </p>
                        </div>
                        <div
                          className="rounded-full flex-shrink-0"
                          style={{
                            width: "18px",
                            height: "18px",
                            border: `2px solid ${isSelectedCard ? primaryColor : "#cbd5e1"}`,
                            backgroundColor: isSelectedCard ? primaryColor : "white",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isUsingSavedCard && selectedSavedCard ? (
              <>
                <div
                  className="relative mx-auto mb-4 overflow-hidden rounded-2xl p-4 text-white shadow-sm"
                  style={{
                    maxWidth: "360px",
                    minHeight: "174px",
                    background: `linear-gradient(135deg, ${primaryColor} 0%, var(--market-primary-color) 100%)`,
                  }}
                >
                  <div className="relative flex min-h-[142px] flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <ShieldCheck size={25} color="white" />
                      <CardBrandLogo paymentMethodId={selectedSavedCard.payment_method_id} />
                    </div>
                    <div>
                      <p style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "0.08em" }}>
                        •••• •••• •••• {selectedSavedCard.ultimos_quatro}
                      </p>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div className="min-w-0">
                          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.65)", fontWeight: 800 }}>
                            TITULAR
                          </p>
                          <p className="truncate" style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase" }}>
                            {selectedSavedCard.nome_impresso || "Cartão cadastrado"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.65)", fontWeight: 800 }}>
                            TIPO
                          </p>
                          <p style={{ fontSize: "12px", fontWeight: 800 }}>
                            {selectedSavedCard.forma_pagamento === "cartao_debito" ? "Débito" : "Crédito"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid max-w-md grid-cols-1 gap-3">
                  <div>
                    <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                      CVV do cartão salvo
                    </label>
                    <div
                      id={SECURE_FIELD_IDS.savedSecurityCode}
                      className="mp-secure-field rounded-xl border bg-white px-3"
                      style={{ borderColor: "var(--market-primary-border-color)" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSavedCardId("");
                      resetCardMetadata();
                    }}
                    className="rounded-xl px-3 py-3"
                    style={{ backgroundColor: "var(--market-primary-soft-color)", color: "var(--market-primary-color)", fontSize: "13px", fontWeight: 800 }}
                  >
                    Usar outro cartão
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="relative mx-auto mb-4 overflow-hidden rounded-2xl p-4 text-white shadow-sm"
                  style={{
                    maxWidth: "360px",
                    minHeight: "174px",
                    background: `linear-gradient(135deg, ${primaryColor} 0%, var(--market-primary-color) 100%)`,
                  }}
                >
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
                            {isProfilePaymentMethods ? getCardSaveModeLabel(cardSaveMode) : selected === "cartao_debito" ? "Débito" : "Crédito"}
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
                      style={{ borderColor: "var(--market-primary-border-color)" }}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                      Validade
                    </label>
                    <div
                      id={SECURE_FIELD_IDS.expirationDate}
                      className="mp-secure-field rounded-xl border bg-white px-3"
                      style={{ borderColor: "var(--market-primary-border-color)" }}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block" style={{ fontSize: "12px", fontWeight: 800, color: "#64748b" }}>
                      CVV
                    </label>
                    <div
                      id={SECURE_FIELD_IDS.securityCode}
                      className="mp-secure-field rounded-xl border bg-white px-3"
                      style={{ borderColor: "var(--market-primary-border-color)" }}
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

                {!isProfilePaymentMethods && (
                  <label
                    className="mt-4 flex items-start gap-3 rounded-xl px-3 py-3"
                    style={{ backgroundColor: "#f8fafc", border: "1px solid var(--market-primary-border-color)" }}
                  >
                    <input
                      type="checkbox"
                      checked={saveCardForNextPurchases}
                      onChange={(event) => setSaveCardForNextPurchases(event.target.checked)}
                      className="mt-0.5"
                    />
                    <span style={{ color: "#334155", fontSize: "12px", lineHeight: 1.45, fontWeight: 700 }}>
                      Salvar este cartão para próximas compras. Será salvo no Mercado Pago; o CVV nunca será armazenado.
                    </span>
                  </label>
                )}
              </>
            )}

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

      <div className="flex-shrink-0 bg-white px-4 py-4 border-t" style={{ borderColor: "var(--market-primary-border-color)" }}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className="w-full rounded-2xl py-4 text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: primaryColor, fontSize: "15px", fontWeight: 700 }}
        >
          {isSubmitting
            ? isProfilePaymentMethods ? "Salvando..." : "Validando..."
            : !payerValidation.isValid
              ? "Complete os dados do pagador"
            : isCardPayment && !secureFieldsReady
              ? "Carregando cartão seguro..."
              : isProfilePaymentMethods ? "Salvar cartão" : "Usar esta forma de pagamento"}
        </button>
      </div>
    </div>
  );
}
