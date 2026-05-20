import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ChevronLeft,
  MapPin,
  Truck,
  CreditCard,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info,
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
import { getAuthToken } from '@/shared/lib/api';
import {
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

interface PendingCheckoutOrder {
  id: string;
  numero_pedido?: string | null;
  total?: string | number | null;
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
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [pixFailureMessage, setPixFailureMessage] = useState('');
  const [customerProfile, setCustomerProfile] = useState<AuthUser | null>(currentUser);
  const [wantsCpfInvoice, setWantsCpfInvoice] = useState(false);
  const [cpfInvoice, setCpfInvoice] = useState('');
  const [saveCpfAsDefault, setSaveCpfAsDefault] = useState(false);

  const deliveryFee = Math.max(0, currentMarket.deliveryFee || 0);
  const total = Math.max(cartTotal - discount + deliveryFee, 0);
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
      total: order.total,
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
    setPixFailureMessage('');
    navigate(tenantPath("payment"));
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
        setIsPollingPayment(true);
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
      } finally {
        if (!cancelled) setIsPollingPayment(false);
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

    if (!currentUser && !getAuthToken()) {
      navigate(tenantPath("login"), {
        state: {
          redirectTo: `${location.pathname}${location.search}${location.hash}`,
        },
      });
      return;
    }

    if (!selectedAddress) {
      showSystemNotice('Selecione um endereço de entrega.');
      return;
    }

    setIsSubmitting(true);
    setPixStatus('idle');
    setPixFailureMessage('');

    try {
      const payer = resolvePayerData();
      const cpfInvoicePayload = resolveCpfInvoicePayload();
      const selection = getStoredPaymentSelection();
      const syncedCart = await syncCartItemsBatch(marketId, cart);
      const order = await createCheckoutOrder({
        marketId,
        cartId: syncedCart.carrinho_id,
        addressId: selectedAddress.id,
        type: 'delivery',
        deliveryFee,
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

        {/* Endereço */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin size={15} color="#122a4c" />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Endereço de entrega
              </span>
            </div>

            <button
              onClick={() => navigate(tenantPath("addresses"))}
              style={{
                fontSize: "12px",
                color: "#122a4c",
                fontWeight: 600,
              }}
            >
              Alterar
            </button>
          </div>

          {selectedAddress ? (
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
                Entrega
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

          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.4 }}>
            As entregas são feitas por ordem de pedido. Avisaremos você assim que o entregador sair.
          </p>
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

            <div className="flex justify-between">
              <span
                style={{ fontSize: "13px", color: "#64748b" }}
              >
                Taxa de entrega
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color:
                    deliveryFee === 0 ? "#122a4c" : "#334155",
                }}
              >
                {deliveryFee === 0
                  ? "Grátis"
                  : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
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

        {paymentResult?.qr_code && (
          <div
            className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
            style={{
              border: `1px solid ${pixStatus === 'waiting' ? '#bbf7d0' : '#fde68a'}`,
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#122a4c" }} className="mb-3">
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
                  ? `Você tem ${formatPixCountdown(pixSecondsRemaining)} para realizar o pagamento. Verificamos automaticamente a cada 5 segundos.`
                  : pixFailureMessage}
              </p>
              {isPollingPayment && pixStatus === 'waiting' && (
                <p className="mt-1" style={{ fontSize: "11px", color: "#15803d", fontWeight: 700 }}>
                  Verificando confirmação do pagamento...
                </p>
              )}
            </div>
            {paymentResult.qr_code_base64 && (
              <img
                src={`data:image/png;base64,${paymentResult.qr_code_base64}`}
                alt="QR Code PIX"
                className="mx-auto mb-3"
                style={{ width: "180px", height: "180px" }}
              />
            )}
            <textarea
              readOnly
              value={paymentResult.qr_code}
              className="w-full rounded-xl border px-3 py-2 text-xs"
              rows={4}
            />
            <button
              onClick={() => navigator.clipboard?.writeText(paymentResult.qr_code || "")}
              className="mt-3 w-full rounded-xl px-4 py-3 text-white"
              style={{ backgroundColor: "#122a4c", fontSize: "13px", fontWeight: 700 }}
            >
              Copiar código PIX
            </button>
            {canChooseAnotherPayment && (
              <button
                onClick={resetPixPayment}
                className="mt-2 w-full rounded-xl px-4 py-3"
                style={{
                  backgroundColor: "#eef4fb",
                  color: "#122a4c",
                  fontSize: "13px",
                  fontWeight: 800,
                }}
              >
                Escolher outra forma de pagamento
              </button>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 bg-white px-4 py-4"
        style={{ borderTop: "1px solid #d9e4f2" }}
      >
        <button
          onClick={canChooseAnotherPayment ? resetPixPayment : handleFinalize}
          disabled={isSubmitting || isPixWaiting}
          className="w-full rounded-2xl py-4 text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: "#122a4c" }}
        >
          <span style={{ fontSize: "16px", fontWeight: 800 }}>
            {isSubmitting
              ? "Processando..."
              : isPixWaiting
                ? "Aguardando pagamento PIX"
                : canChooseAnotherPayment
                  ? "Escolher outra forma de pagamento"
                  : `Finalizar pedido · R$ ${total.toFixed(2).replace('.', ',')}`}
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
