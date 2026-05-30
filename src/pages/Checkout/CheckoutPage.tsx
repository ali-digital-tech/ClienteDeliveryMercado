import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ChevronLeft,
  MapPin,
  Store,
  Truck,
  CreditCard,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  ReceiptText,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { Checkbox } from '@/app/components/ui/checkbox';
import { BannerRenderer, useBanners } from '@/features/banners';
import { authService, type AuthUser } from '@/features/auth';
import {
  formatAddressLine,
  formatAddressLocation,
  getAddressCoordinates,
  getMyAddresses,
  resolveSelectedAddress,
  type CustomerAddress,
} from '@/features/addresses';
import { formatCartQuantity, syncCartItemsBatch } from '@/features/cart';
import { ProductImage } from '@/features/products';
import { createCheckoutOrder } from '@/features/orders/services/ordersService';
import { getStoredCheckoutMode } from '@/features/orders/services/checkoutModeService';
import { apiRequest, getAuthToken } from '@/shared/lib/api';
import {
  cancelPayment,
  createCardPayment,
  createPixPayment,
  getPaymentById,
  getStoredPayerData,
  getStoredPaymentSelection,
  type MercadoPagoPaymentResult,
  type PayerData,
} from '@/features/payments';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

const PIX_PAYMENT_WINDOW_SECONDS = 5 * 60;
const PIX_POLL_INTERVAL_MS = 5000;
const PIX_TERMINAL_STATUSES = new Set(['rejeitado', 'cancelado', 'expirado', 'estornado']);
const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

interface BusinessHour {
  dia_semana: number;
  aberto: boolean;
  horario_abertura?: string | null;
  horario_fechamento?: string | null;
}

interface PendingCheckoutOrder {
  id: string;
  numero_pedido?: string | null;
  total?: string | number | null;
  agendado_para?: string | null;
  chave_recebimento?: string | null;
}

function formatPixCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function unwrapBusinessHours(payload: any): BusinessHour[] {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getBrasiliaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRASILIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);

  return {
    dayOfWeek: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function isOpenNow(schedule: BusinessHour | undefined, currentMinutes: number) {
  if (!schedule?.aberto) return false;
  const opening = parseTimeToMinutes(schedule.horario_abertura);
  const closing = parseTimeToMinutes(schedule.horario_fechamento);

  if (opening === null || closing === null) return false;
  if (opening <= closing) return currentMinutes >= opening && currentMinutes < closing;
  return currentMinutes >= opening || currentMinutes < closing;
}

function formatCpf(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCpf(value: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateDigit = (baseLength: number) => {
    let sum = 0;

    for (let index = 0; index < baseLength; index += 1) {
      sum += Number(digits[index]) * (baseLength + 1 - index);
    }

    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cart,
    cartTotal,
    currentMarket,
    currentUser,
    couponId,
    discount,
    marketId,
    tenantPath,
    clearCart,
    refreshOrders,
  } = useApp();
  const { banners } = useBanners(marketId, 'checkout');
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentResult, setPaymentResult] = useState<MercadoPagoPaymentResult | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingCheckoutOrder | null>(null);
  const [pixExpiresAt, setPixExpiresAt] = useState<number | null>(null);
  const [pixSecondsRemaining, setPixSecondsRemaining] = useState(PIX_PAYMENT_WINDOW_SECONDS);
  const [pixStatus, setPixStatus] = useState<'idle' | 'waiting' | 'expired' | 'failed'>('idle');
  const [isCancellingPix, setIsCancellingPix] = useState(false);
  const [pixCodeCopied, setPixCodeCopied] = useState(false);
  const [pixFailureMessage, setPixFailureMessage] = useState('');
  const [customerProfile, setCustomerProfile] = useState<AuthUser | null>(currentUser);
  const [wantsCpfInvoice, setWantsCpfInvoice] = useState(false);
  const [cpfInvoice, setCpfInvoice] = useState('');
  const [saveCpfAsDefault, setSaveCpfAsDefault] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [loadingBusinessHours, setLoadingBusinessHours] = useState(false);

  const orderType = getStoredCheckoutMode(marketId);
  const isPickup = orderType === 'pickup';
  const deliveryFee = Math.max(0, currentMarket.deliveryFee || 0);
  const effectiveDeliveryFee = isPickup ? 0 : deliveryFee;
  const total = Math.max(cartTotal - discount + effectiveDeliveryFee, 0);
  const minimumOrder = Math.max(0, currentMarket.minimumOrder || 0);
  const missingMinimumOrder = Math.max(0, minimumOrder - cartTotal);
  const meetsMinimumOrder = minimumOrder <= 0 || missingMinimumOrder <= 0;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const selectedCoordinates = selectedAddress ? getAddressCoordinates(selectedAddress) : null;
  const paymentSelection = getStoredPaymentSelection();
  const storedPayerData = getStoredPayerData();
  const hasPayerData = Boolean(
    storedPayerData.payer_email &&
    storedPayerData.payer_first_name &&
    storedPayerData.payer_last_name &&
    storedPayerData.doc_number
  );
  const paymentLabel =
    paymentSelection.method === 'pix'
      ? 'PIX'
      : paymentSelection.method === 'cartao_debito'
        ? 'Cartão de débito'
        : 'Cartão de crédito';
  const isPixWaiting = Boolean(paymentResult?.qr_code && pixStatus === 'waiting');
  const canChooseAnotherPayment = Boolean(paymentResult?.qr_code && ['expired', 'failed'].includes(pixStatus));
  const pixProgress = paymentResult?.qr_code
    ? Math.max(0, Math.min(100, (pixSecondsRemaining / PIX_PAYMENT_WINDOW_SECONDS) * 100))
    : 0;
  const effectiveCustomerProfile = customerProfile || currentUser;
  const savedCpfInvoiceDefault = Boolean(
    effectiveCustomerProfile?.cpf &&
    effectiveCustomerProfile?.cpf_na_nota_padrao
  );
  const savedCpfInvoice = effectiveCustomerProfile?.cpf || '';
  const marketScheduleStatus = useMemo(() => {
    if (businessHours.length === 0) {
      return { isOpen: currentMarket.status === 'open' };
    }

    const currentTime = getBrasiliaParts();
    const todaySchedule = businessHours.find((schedule) => Number(schedule.dia_semana) === currentTime.dayOfWeek);

    return { isOpen: isOpenNow(todaySchedule, currentTime.minutes) };
  }, [businessHours, currentMarket.status]);

  useEffect(() => {
    if (!currentUser) return;

    let isActive = true;

    getMyAddresses()
      .then((addresses) => {
        if (!isActive) return;
        setSelectedAddress(resolveSelectedAddress(marketId, addresses));
      })
      .catch((error) => {
        console.error('Erro ao carregar endereco de entrega:', error);
      });

    return () => {
      isActive = false;
    };
  }, [currentUser, marketId]);

  useEffect(() => {
    if (!marketId) return;

    let isActive = true;
    setLoadingBusinessHours(true);

    apiRequest(`/horarios_funcionamento/${marketId}`)
      .then((payload) => {
        if (!isActive) return;
        setBusinessHours(unwrapBusinessHours(payload));
      })
      .catch((error) => {
        console.error('Erro ao carregar horário de funcionamento:', error);
        if (isActive) setBusinessHours([]);
      })
      .finally(() => {
        if (isActive) setLoadingBusinessHours(false);
      });

    return () => {
      isActive = false;
    };
  }, [marketId]);

  useEffect(() => {
    if (!currentUser) return;

    let isActive = true;

    authService.getCurrentCustomer()
      .then((profile) => {
        if (!isActive) return;
        setCustomerProfile(profile);

        if (profile.cpf_na_nota_padrao && profile.cpf) {
          setCpfInvoice(formatCpf(profile.cpf));
          setWantsCpfInvoice(true);
          setSaveCpfAsDefault(false);
          return;
        }

        if (profile.cpf) {
          setCpfInvoice(formatCpf(profile.cpf));
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar perfil do cliente:', error);
      });

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  const resolvePayerData = (): PayerData => {
    const payer = getStoredPayerData();

    if (!payer.payer_email || !payer.payer_first_name || !payer.payer_last_name || !payer.doc_number) {
      throw new Error('Confirme os dados do pagador antes de finalizar.');
    }

    return {
      payer_email: payer.payer_email,
      payer_first_name: payer.payer_first_name,
      payer_last_name: payer.payer_last_name,
      doc_type: payer.doc_type || 'CPF',
      doc_number: String(payer.doc_number).replace(/\D/g, ''),
    };
  };

  const saveConfirmedOrder = useCallback((order: PendingCheckoutOrder, result: MercadoPagoPaymentResult) => {
    sessionStorage.setItem('cliente_delivery_last_order', JSON.stringify({
      id: order.numero_pedido ? `#${order.numero_pedido}` : order.id,
      rawId: order.id,
      number: order.numero_pedido,
      total: order.total,
      scheduledFor: order.agendado_para,
      receiptKey: order.chave_recebimento,
      payment_id: result.payment.id,
      mp_payment_id: result.mp_payment_id,
    }));
  }, []);

  const completeApprovedPayment = useCallback(async (
    result: MercadoPagoPaymentResult,
    order: PendingCheckoutOrder
  ) => {
    saveConfirmedOrder(order, result);
    clearCart();
    await refreshOrders();
    navigate(tenantPath("order-confirmed"));
  }, [clearCart, navigate, refreshOrders, saveConfirmedOrder, tenantPath]);

  const resetPixPayment = () => {
    setPaymentResult(null);
    setPendingOrder(null);
    setPixExpiresAt(null);
    setPixSecondsRemaining(PIX_PAYMENT_WINDOW_SECONDS);
    setPixStatus('idle');
    setPixCodeCopied(false);
    setPixFailureMessage('');
    navigate(tenantPath("payment"));
  };

  const handleCopyPixCode = async () => {
    const code = paymentResult?.qr_code || '';
    if (!code) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setPixCodeCopied(true);
      window.setTimeout(() => setPixCodeCopied(false), 2500);
    } catch (error) {
      console.error('Erro ao copiar código PIX:', error);
      showSystemNotice('Não foi possível copiar o código PIX.');
    }
  };

  const handleCancelPixPayment = async () => {
    const paymentId = paymentResult?.payment.id;

    if (!paymentId) {
      resetPixPayment();
      return;
    }

    setIsCancellingPix(true);

    try {
      await cancelPayment(paymentId);
      resetPixPayment();
    } catch (error) {
      console.error('Erro ao cancelar PIX:', error);
      showSystemNotice(error || 'Não foi possível cancelar o pagamento PIX.');
    } finally {
      setIsCancellingPix(false);
    }
  };

  const resolveCpfInvoicePayload = () => {
    if (savedCpfInvoiceDefault) {
      return {
        cpfNaNota: true,
        cpf: onlyDigits(savedCpfInvoice),
        saveCpfAsDefault: false,
      };
    }

    if (!wantsCpfInvoice) {
      return {
        cpfNaNota: false,
        cpf: null,
        saveCpfAsDefault: false,
      };
    }

    if (!isValidCpf(cpfInvoice)) {
      throw new Error('Informe um CPF válido para CPF na nota.');
    }

    return {
      cpfNaNota: true,
      cpf: onlyDigits(cpfInvoice),
      saveCpfAsDefault,
    };
  };

  useEffect(() => {
    if (!paymentResult?.qr_code || !pixExpiresAt || pixStatus !== 'waiting') return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((pixExpiresAt - Date.now()) / 1000));
      setPixSecondsRemaining(remaining);

      if (remaining <= 0) {
        setPixStatus('expired');
        setPixFailureMessage('O tempo para pagamento deste PIX expirou. Escolha uma forma de pagamento e tente novamente.');
        showSystemNotice('O tempo para pagamento deste PIX expirou. Escolha uma forma de pagamento e tente novamente.');
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, [paymentResult?.qr_code, pixExpiresAt, pixStatus]);

  useEffect(() => {
    if (!paymentResult?.payment.id || !pendingOrder || pixStatus !== 'waiting') return;

    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      try {
        const payment = await getPaymentById(paymentResult.payment.id);
        if (cancelled) return;

        if (payment.status === 'aprovado') {
          await completeApprovedPayment(
            {
              ...paymentResult,
              payment: {
                ...paymentResult.payment,
                status: payment.status,
                gateway_pagamento_id: payment.gateway_pagamento_id,
              },
            },
            pendingOrder
          );
          return;
        }

        if (PIX_TERMINAL_STATUSES.has(payment.status)) {
          setPixStatus('failed');
          setPixFailureMessage('O pagamento PIX não foi aprovado. Escolha uma forma de pagamento e tente novamente.');
          showSystemNotice('O pagamento PIX não foi aprovado. Escolha uma forma de pagamento e tente novamente.');
        }
      } catch (error) {
        console.error('Erro ao consultar status do PIX:', error);
      }
    }, PIX_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [completeApprovedPayment, paymentResult, pendingOrder, pixStatus]);

  const handleFinalize = async () => {
    if (cart.length === 0) {
      showSystemNotice('Seu carrinho está vazio.');
      return;
    }

    if (!meetsMinimumOrder) {
      showSystemNotice(
        `O pedido mínimo deste mercado é R$ ${minimumOrder.toFixed(2).replace('.', ',')}. Adicione mais R$ ${missingMinimumOrder.toFixed(2).replace('.', ',')} em produtos para finalizar.`
      );
      return;
    }

    if (!currentUser && !getAuthToken()) {
      navigate(tenantPath("login"), {
        state: {
          redirectTo: `${location.pathname}${location.search}${location.hash}`,
        },
      });
      return;
    }

    if (!isPickup && !selectedAddress) {
      showSystemNotice('Selecione um endereço de entrega.');
      return;
    }

    setIsSubmitting(true);
    setPixStatus('idle');
    setPixCodeCopied(false);
    setPixFailureMessage('');

    try {
      const payer = resolvePayerData();
      const cpfInvoicePayload = resolveCpfInvoicePayload();
      const selection = getStoredPaymentSelection();
      const syncedCart = await syncCartItemsBatch(marketId, cart);
      const order = await createCheckoutOrder({
        marketId,
        cartId: syncedCart.carrinho_id,
        addressId: isPickup ? null : selectedAddress?.id || null,
        type: orderType,
        deliveryFee: effectiveDeliveryFee,
        couponId,
        discount,
        ...cpfInvoicePayload,
      });
      const result =
        selection.method === 'pix'
          ? await createPixPayment(order.id, payer)
          : await createCardPayment(order.id, payer, selection);

      setPaymentResult(result);

      if (result.payment.status === 'aprovado') {
        await completeApprovedPayment(result, order);
        return;
      }

      if (selection.method === 'pix') {
        setPendingOrder(order);
        setPixExpiresAt(Date.now() + PIX_PAYMENT_WINDOW_SECONDS * 1000);
        setPixSecondsRemaining(PIX_PAYMENT_WINDOW_SECONDS);
        setPixStatus('waiting');
        return;
      }

      showSystemNotice('Pagamento ainda não aprovado. Confira a forma de pagamento e tente novamente.');
    } catch (err) {
      showSystemNotice(err || 'Não foi possível finalizar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
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

          <h1
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "#122a4c",
            }}
          >
            Finalizar Pedido
          </h1>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        <BannerRenderer banners={banners} placement="checkout_top" page="checkout" className="mb-3" />
        {/* Itens */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: `1px solid ${hasPayerData ? "#bbf7d0" : "#fde68a"}` }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#122a4c",
            }}
            className="mb-3"
          >
            Itens do pedido (
            {formatCartQuantity(itemCount)})
          </h3>

          <div className="flex flex-col gap-2">
            {cart.slice(0, 3).map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3"
              >
                <ProductImage
                  src={item.product.image}
                  alt={item.product.name}
                  className="rounded-xl object-cover flex-shrink-0"
                  style={{ width: "42px", height: "42px" }}
                  iconSize={18}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className="truncate"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  >
                    {item.product.name}
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    Qtd: {formatCartQuantity(item.qty)}
                  </p>
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#122a4c",
                  }}
                >
                  R${" "}
                  {(item.product.price * item.qty).toFixed(2).replace('.', ',')}
                </p>
              </div>
            ))}

            {cart.length > 3 && (
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                + {cart.length - 3} outros itens
              </p>
            )}
          </div>

          <button
            onClick={() => navigate(tenantPath("carrinho"))}
            className="mt-3 flex items-center gap-1"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#122a4c",
            }}
          >
            Ver carrinho completo{" "}
            <ChevronRight size={14} color="#122a4c" />
          </button>
        </div>

        {/* Entrega ou retirada */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isPickup ? <Store size={15} color="#122a4c" /> : <MapPin size={15} color="#122a4c" />}
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                {isPickup ? "Retirada no mercado" : "Endereço de entrega"}
              </span>
            </div>

            <button
              onClick={() => navigate(isPickup ? tenantPath("delivery") : tenantPath("addresses"))}
              style={{
                fontSize: "12px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Alterar
            </button>
          </div>

          {isPickup ? (
            <p
              style={{
                fontSize: "13px",
                lineHeight: 1.5,
                color: "#64748b",
              }}
            >
              {currentMarket.name}
              <br />
              {currentMarket.address || "Endereço do mercado não informado"}
            </p>
          ) : selectedAddress ? (
            <>
              <p
                style={{
                  fontSize: "13px",
                  lineHeight: 1.5,
                  color: "#64748b",
                }}
              >
                {formatAddressLine(selectedAddress)}
                <br />
                {formatAddressLocation(selectedAddress)}
              </p>
              {selectedCoordinates && (
                <p style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px", fontWeight: 700 }}>
                  GPS: {selectedCoordinates.latitude.toFixed(5)}, {selectedCoordinates.longitude.toFixed(5)}
                </p>
              )}
            </>
          ) : (
            <button
              onClick={() => navigate(tenantPath("addresses"))}
              className="rounded-xl px-4 py-3 text-white"
              style={{ backgroundColor: "#122a4c", fontSize: "13px", fontWeight: 700 }}
            >
              Cadastrar endereço
            </button>
          )}
        </div>

        {/* Entrega */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Truck size={15} color="#122a4c" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                {isPickup ? "Retirada" : "Entrega"}
              </span>
            </div>

            <button
              onClick={() => navigate(tenantPath("delivery"))}
              style={{
                fontSize: "12px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Alterar
            </button>
          </div>

          <div className="space-y-2">
            <div
              className="rounded-xl px-3 py-2"
              style={{
                backgroundColor: marketScheduleStatus.isOpen ? "#f0fdf4" : "#fffbeb",
                border: `1px solid ${marketScheduleStatus.isOpen ? "#bbf7d0" : "#fde68a"}`,
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: marketScheduleStatus.isOpen ? "#15803d" : "#b45309",
                }}
              >
                {loadingBusinessHours
                  ? "Verificando horário do mercado..."
                  : marketScheduleStatus.isOpen
                    ? "Mercado aberto agora."
                    : "Mercado fechado agora."}
              </p>
            </div>

            <div
              className="rounded-xl px-3 py-2"
              style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}
            >
              <p style={{ fontSize: "13px", color: "#15803d", lineHeight: 1.4, fontWeight: 700 }}>
                Você pode fazer o pedido normalmente em qualquer horário.
              </p>
              {!marketScheduleStatus.isOpen && !loadingBusinessHours && (
                <p style={{ fontSize: "12px", color: "#166534", lineHeight: 1.4, marginTop: "2px" }}>
                  Como o mercado está fechado, {isPickup ? "a retirada" : "a entrega"} será no próximo dia em que ele estiver aberto.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard size={15} color="#122a4c" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Pagamento
              </span>
            </div>

            <button
              onClick={() => navigate(tenantPath("payment"))}
              style={{
                fontSize: "12px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Alterar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="rounded-lg p-1.5"
              style={{ backgroundColor: "#eef4fb" }}
            >
              <CreditCard size={14} color="#122a4c" />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: "13px", color: "#64748b" }}>
                {paymentLabel}
              </p>
              <p
                className="mt-0.5"
                style={{
                  fontSize: "12px",
                  color: hasPayerData ? "#15803d" : "#b45309",
                  fontWeight: 600,
                }}
              >
                {hasPayerData ? "Dados do pagador confirmados" : "Confirme os dados do pagador"}
              </p>
            </div>
            {hasPayerData ? (
              <CheckCircle2 size={18} color="#16a34a" />
            ) : (
              <AlertTriangle size={18} color="#d97706" />
            )}
          </div>
        </div>

        {/* CPF na nota */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <ReceiptText size={15} color="#122a4c" />
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              CPF na nota
            </span>
          </div>

          {savedCpfInvoiceDefault ? (
            <div className="rounded-xl p-3" style={{ backgroundColor: "#f0fdf4" }}>
              <p style={{ fontSize: "13px", lineHeight: 1.5, color: "#15803d", fontWeight: 700 }}>
                CPF na nota será usado conforme sua preferência de perfil.
              </p>
              <p className="mt-1" style={{ fontSize: "12px", color: "#166534" }}>
                CPF final {onlyDigits(savedCpfInvoice).slice(-2).padStart(2, '*')}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: false, label: "Não quero" },
                  { value: true, label: "Informar CPF" },
                ].map((option) => {
                  const selected = wantsCpfInvoice === option.value;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setWantsCpfInvoice(option.value);
                        if (!option.value) {
                          setSaveCpfAsDefault(false);
                        }
                      }}
                      className="rounded-xl px-3 py-3 text-center transition-all"
                      style={{
                        border: `2px solid ${selected ? "#122a4c" : "#d9e4f2"}`,
                        backgroundColor: selected ? "#eef4fb" : "#ffffff",
                        color: selected ? "#122a4c" : "#64748b",
                        fontSize: "13px",
                        fontWeight: 800,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {wantsCpfInvoice && (
                <div className="mt-3">
                  <input
                    className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
                    style={{ borderColor: "#d9e4f2", color: "#334155" }}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    value={cpfInvoice}
                    onChange={(event) => setCpfInvoice(formatCpf(event.target.value))}
                    aria-label="CPF para nota fiscal"
                  />
                  {cpfInvoice && !isValidCpf(cpfInvoice) && onlyDigits(cpfInvoice).length === 11 && (
                    <p className="mt-1.5" style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700 }}>
                      CPF inválido.
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <Checkbox
                      id="save-cpf-as-default"
                      checked={saveCpfAsDefault}
                      onCheckedChange={(checked) => setSaveCpfAsDefault(checked === true)}
                    />
                    <label
                      htmlFor="save-cpf-as-default"
                      className="flex-1"
                      style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}
                    >
                      Usar este CPF como padrão para próximas compras
                    </label>
                    <button
                      type="button"
                      onClick={() => showSystemNotice('Você pode desativar essa opção depois nas permissões do seu perfil.')}
                      className="rounded-full p-1.5"
                      style={{ backgroundColor: "#eef4fb" }}
                      aria-label="Informação sobre CPF padrão"
                    >
                      <Info size={15} color="#122a4c" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Totals */}
        <div
          className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span
                style={{ fontSize: "13px", color: "#64748b" }}
              >
                Subtotal
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                R$ {cartTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between">
                <span
                  style={{ fontSize: "13px", color: "#1b3d6d" }}
                >
                  Desconto
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#122a4c",
                  }}
                >
                  -R$ {discount.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}

            {minimumOrder > 0 && (
              <div className="flex justify-between">
                <span
                  style={{ fontSize: "13px", color: "#64748b" }}
                >
                  Pedido mínimo
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: meetsMinimumOrder ? "#122a4c" : "#dc2626",
                  }}
                >
                  R$ {minimumOrder.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span
                style={{ fontSize: "13px", color: "#64748b" }}
              >
                {isPickup ? "Retirada" : "Taxa de entrega"}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color:
                    effectiveDeliveryFee === 0 ? "#122a4c" : "#334155",
                }}
              >
                {effectiveDeliveryFee === 0
                  ? "Grátis"
                  : `R$ ${effectiveDeliveryFee.toFixed(2).replace('.', ',')}`}
              </span>
            </div>

            <div
              className="pt-2 flex justify-between"
              style={{ borderTop: "1px solid #e2e8f0" }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#122a4c",
                }}
              >
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {paymentResult?.qr_code && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-3 pb-3 pt-8 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pix-payment-title"
        >
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl"
            style={{
              border: `1px solid ${pixStatus === 'waiting' ? '#bbf7d0' : '#fde68a'}`,
            }}
          >
            <h3 id="pix-payment-title" style={{ fontSize: "16px", fontWeight: 800, color: "#122a4c" }} className="mb-3">
              Pagamento via PIX
            </h3>

            <div className="mb-4 rounded-xl p-3" style={{ backgroundColor: pixStatus === 'waiting' ? "#f0fdf4" : "#fffbeb" }}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span style={{ fontSize: "12px", fontWeight: 800, color: pixStatus === 'waiting' ? "#15803d" : "#b45309" }}>
                  {pixStatus === 'waiting'
                    ? "Aguardando confirmação do PIX"
                    : pixStatus === 'expired'
                      ? "Tempo do PIX expirado"
                      : "Pagamento não aprovado"}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 900, color: pixStatus === 'waiting' ? "#15803d" : "#b45309" }}>
                  {formatPixCountdown(pixSecondsRemaining)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "#e2e8f0" }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${pixProgress}%`,
                    backgroundColor: pixStatus === 'waiting' ? "#16a34a" : "#f59e0b",
                  }}
                />
              </div>
              <p className="mt-2" style={{ fontSize: "11px", lineHeight: 1.5, color: pixStatus === 'waiting' ? "#166534" : "#92400e" }}>
                {pixStatus === 'waiting'
                  ? `Você tem ${formatPixCountdown(pixSecondsRemaining)} para realizar o pagamento. Estamos verificando se você já fez o pagamento.`
                  : pixFailureMessage}
              </p>
            </div>

            {paymentResult.qr_code_base64 && (
              <img
                src={`data:image/png;base64,${paymentResult.qr_code_base64}`}
                alt="QR Code PIX"
                className="mx-auto mb-3 rounded-xl"
                style={{ width: "180px", height: "180px" }}
              />
            )}

            <textarea
              readOnly
              value={paymentResult.qr_code}
              className="w-full resize-none rounded-xl border px-3 py-2 text-xs outline-none"
              style={{ borderColor: "#d9e4f2", color: "#334155" }}
              rows={4}
              aria-label="Código PIX copia e cola"
            />

            {pixCodeCopied && (
              <p className="mt-2 rounded-xl px-3 py-2 text-center" style={{ backgroundColor: "#f0fdf4", color: "#15803d", fontSize: "12px", fontWeight: 800 }}>
                Código PIX copiado.
              </p>
            )}

            <button
              type="button"
              onClick={handleCopyPixCode}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-white"
              style={{ backgroundColor: "#122a4c", fontSize: "13px", fontWeight: 700 }}
            >
              <Copy size={16} />
              {pixCodeCopied ? "Código copiado" : "Copiar código PIX"}
            </button>

            <button
              type="button"
              onClick={canChooseAnotherPayment ? resetPixPayment : handleCancelPixPayment}
              disabled={isCancellingPix}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 disabled:opacity-70"
              style={{
                backgroundColor: "#eef4fb",
                color: "#122a4c",
                fontSize: "13px",
                fontWeight: 800,
              }}
            >
              {isCancellingPix && <Loader2 size={16} className="animate-spin" />}
              {isCancellingPix
                ? "Cancelando..."
                : canChooseAnotherPayment
                  ? "Escolher outra forma de pagamento"
                  : "Cancelar pagamento"}
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <div
        className="flex-shrink-0 bg-white px-4 py-4"
        style={{ borderTop: "1px solid #d9e4f2" }}
      >
        <button
          onClick={canChooseAnotherPayment ? resetPixPayment : handleFinalize}
          disabled={isSubmitting || isPixWaiting}
          className="w-full rounded-2xl py-4 text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: meetsMinimumOrder ? "#122a4c" : "#9ca3af" }}
        >
          <span style={{ fontSize: "16px", fontWeight: 800 }}>
            {isSubmitting
              ? "Processando..."
              : isPixWaiting
                ? "Aguardando pagamento PIX"
                : canChooseAnotherPayment
                  ? "Escolher outra forma de pagamento"
                  : meetsMinimumOrder
                    ? `Finalizar pedido · R$ ${total.toFixed(2).replace('.', ',')}`
                    : "Pedido mínimo não atingido"}
          </span>
        </button>

        <p
          className="text-center mt-2"
          style={{ fontSize: "11px", color: "#94a3b8" }}
        >
          Ao finalizar, você concorda com nossos termos de uso
        </p>
      </div>
    </div>
  );
}
