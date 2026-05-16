import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ChevronLeft,
  MapPin,
  Truck,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
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
  getStoredPayerData,
  getStoredPaymentSelection,
  type MercadoPagoPaymentResult,
  type PayerData,
} from '@/features/payments';

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, cartTotal, currentUser, discount, marketId, tenantPath, clearCart } = useApp();
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<MercadoPagoPaymentResult | null>(null);

  const deliveryFee = cartTotal >= 89 ? 0 : 6.99;
  const total = Math.max(cartTotal - discount + deliveryFee, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const selectedCoordinates = selectedAddress ? getAddressCoordinates(selectedAddress) : null;
  const paymentSelection = getStoredPaymentSelection();
  const paymentLabel =
    paymentSelection.method === 'pix'
      ? 'PIX Mercado Pago'
      : paymentSelection.method === 'cartao_debito'
        ? 'Cartão de débito'
        : 'Cartão de crédito';

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

  const handleFinalize = async () => {
    setError(null);

    if (cart.length === 0) {
      setError('Seu carrinho esta vazio.');
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
      setError('Selecione um endereco de entrega.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payer = resolvePayerData();
      const selection = getStoredPaymentSelection();
      const syncedCart = await syncCartItemsBatch(marketId, cart);
      const order = await createCheckoutOrder({
        marketId,
        cartId: syncedCart.carrinho_id,
        addressId: selectedAddress.id,
        type: 'delivery',
        deliveryFee,
        discount,
      });
      const result =
        selection.method === 'pix'
          ? await createPixPayment(order.id, payer)
          : await createCardPayment(order.id, payer, selection);

      sessionStorage.setItem('cliente_delivery_last_order', JSON.stringify({
        id: order.numero_pedido ? `#${order.numero_pedido}` : order.id,
        total: order.total,
      }));
      clearCart();
      setPaymentResult(result);

      if (result.payment.status === 'aprovado') {
        navigate(tenantPath("order-confirmed"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel finalizar o pedido.');
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
        {/* Itens */}
        <div
          className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
          style={{ border: "1px solid #d9e4f2" }}
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
                  {(item.product.price * item.qty).toFixed(2)}
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

          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Hoje, 14h - 16h
          </p>

          <span
            className="rounded-full px-2 py-0.5 mt-1 inline-block"
            style={{
              fontSize: "10px",
              fontWeight: 600,
              backgroundColor: "#eef4fb",
              color: "#122a4c",
            }}
          >
            MAIS RÁPIDO
          </span>
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
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              {paymentLabel}
            </p>
          </div>
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
                R$ {cartTotal.toFixed(2)}
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
                  -R$ {discount.toFixed(2)}
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
                  : `R$ ${deliveryFee.toFixed(2)}`}
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
                R$ {total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm mb-4"
            style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
          >
            {error}
          </div>
        )}

        {paymentResult?.qr_code && (
          <div
            className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
            style={{ border: "1px solid #d9e4f2" }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#122a4c" }} className="mb-3">
              PIX Mercado Pago
            </h3>
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
              Copiar codigo PIX
            </button>
          </div>
        )}
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 bg-white px-4 py-4"
        style={{ borderTop: "1px solid #d9e4f2" }}
      >
        <button
          onClick={handleFinalize}
          disabled={isSubmitting || Boolean(paymentResult?.qr_code)}
          className="w-full rounded-2xl py-4 text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: "#122a4c" }}
        >
          <span style={{ fontSize: "16px", fontWeight: 800 }}>
            {isSubmitting ? "Processando..." : paymentResult?.qr_code ? "Aguardando pagamento PIX" : `Finalizar pedido · R$ ${total.toFixed(2)}`}
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
