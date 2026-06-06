import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  MapPin,
  Store,
  Clock,
  Truck,
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
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';
import {
  getStoredCheckoutMode,
  setStoredCheckoutMode,
  type CheckoutOrderType,
} from '@/features/orders/services/checkoutModeService';
import {
  calculatePlatformServiceFee,
  getMercadoPagoCheckoutConfig,
  type MercadoPagoCheckoutConfig,
} from '@/features/payments';

export function DeliveryScreen() {
  const navigate = useNavigate();
  const { cartTotal, discount, currentMarket, currentUser, marketId, tenantPath } = useApp();
  const [mode, setMode] = useState<CheckoutOrderType>(() => getStoredCheckoutMode(marketId));
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [checkoutConfig, setCheckoutConfig] = useState<MercadoPagoCheckoutConfig | null>(null);

  const discountedSubtotal = Math.max(cartTotal - discount, 0);
  const deliveryFee = Math.max(0, currentMarket.deliveryFee || 0);
  const minimumOrder = Math.max(0, currentMarket.minimumOrder || 0);
  const missingMinimumOrder = Math.max(0, minimumOrder - cartTotal);
  const meetsMinimumOrder = minimumOrder <= 0 || missingMinimumOrder <= 0;


  const total = discountedSubtotal + (mode === "delivery" ? deliveryFee : 0);
  const serviceFee = calculatePlatformServiceFee(total, checkoutConfig?.platform_split);
  const selectedCoordinates = selectedAddress ? getAddressCoordinates(selectedAddress) : null;

  useEffect(() => {
    setMode(getStoredCheckoutMode(marketId));
  }, [marketId]);

  useEffect(() => {
    let isActive = true;

    getMercadoPagoCheckoutConfig(marketId)
      .then((config) => {
        if (isActive) setCheckoutConfig(config);
      })
      .catch((error) => {
        console.error('Erro ao carregar taxa de serviço:', error);
        if (isActive) setCheckoutConfig(null);
      });

    return () => {
      isActive = false;
    };
  }, [marketId]);

  const handleContinueToCheckout = () => {
    if (!meetsMinimumOrder) {
      showSystemNotice(
        `O pedido mínimo deste mercado é R$ ${minimumOrder.toFixed(2).replace('.', ',')}. Adicione mais R$ ${missingMinimumOrder.toFixed(2).replace('.', ',')} em produtos para finalizar.`
      );
      return;
    }

    setStoredCheckoutMode(marketId, mode);
    navigate(tenantPath("checkout"));
  };

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white px-4 pt-8 md:pt-4 pb-3 border-b"
        style={{ borderColor: "var(--market-primary-border-color)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2"
            style={{ backgroundColor: "var(--market-primary-soft-color)" }}
          >
            <ChevronLeft size={20} color="var(--market-primary-color)" />
          </button>

          <h1
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "var(--market-primary-color)",
            }}
          >
            Entrega ou Retirada
          </h1>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        {/* Mode selector */}
        <div
          className="rounded-2xl p-1.5 flex gap-1 mb-4 shadow-sm bg-white"
          style={{ border: "1px solid var(--market-primary-border-color)" }}
        >
          <button
            onClick={() => setMode("delivery")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all"
            style={{
              backgroundColor:
                mode === "delivery" ? "var(--market-primary-color)" : "transparent",
              color: mode === "delivery" ? "white" : "#64748b",
            }}
          >
            <Truck size={16} />
            <span style={{ fontSize: "14px", fontWeight: 700 }}>
              Entrega em casa
            </span>
          </button>

          <button
            onClick={() => setMode("pickup")}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all"
            style={{
              backgroundColor:
                mode === "pickup" ? "var(--market-primary-color)" : "transparent",
              color: mode === "pickup" ? "white" : "#64748b",
            }}
          >
            <Store size={16} />
            <span style={{ fontSize: "14px", fontWeight: 700 }}>
              Retirar na loja
            </span>
          </button>
        </div>

        {mode === "delivery" ? (
          <>
            {/* Selected address */}
            <div
              className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
              style={{ border: "1px solid var(--market-primary-border-color)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  Endereço de entrega
                </span>
                <button
                  onClick={() => navigate(tenantPath("addresses"))}
                  style={{
                    fontSize: "12px",
                    color: "var(--market-primary-color)",
                    fontWeight: 600,
                  }}
                >
                  Alterar
                </button>
              </div>

              {selectedAddress ? (
              <div className="flex items-start gap-3">
                <MapPin
                  size={18}
                  color="var(--market-primary-color)"
                  className="flex-shrink-0 mt-0.5"
                />
                <div>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--market-primary-color)",
                    }}
                  >
                    {selectedAddress.apelido || 'Endereço'}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      lineHeight: 1.4,
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
                </div>
              </div>
              ) : (
                <button
                  onClick={() => navigate(tenantPath("addresses"))}
                  className="w-full rounded-2xl py-3 text-white"
                  style={{ backgroundColor: "var(--market-primary-color)", fontSize: "14px", fontWeight: 700 }}
                >
                  Cadastrar endereço
                </button>
              )}
            </div>

            {/* Info Entrega */}
            <div
              className="bg-white rounded-2xl p-4 mb-4 shadow-sm"
              style={{ border: "1px solid var(--market-primary-border-color)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} color="var(--market-primary-color)" />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  Previsão de entrega
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.4 }}>
                As entregas são feitas por ordem de pedido. Avisaremos você assim que o entregador sair.
              </p>
            </div>
          </>
        ) : (
          <div
            className="bg-white rounded-2xl p-4 mb-4 shadow-sm flex items-start gap-3"
            style={{ border: "1px solid var(--market-primary-border-color)" }}
          >
            <div
              className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                width: "44px",
                height: "44px",
                backgroundColor: "var(--market-primary-soft-color)",
              }}
            >
              <Store size={22} color="var(--market-primary-color)" />
            </div>

            <div className="flex-1 min-w-0">
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--market-primary-color)",
                }}
              >
                {currentMarket.name}
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  lineHeight: 1.4,
                }}
              >
                {currentMarket.address}
              </p>

              <span
                className="rounded-full px-2 py-0.5 mt-2 inline-block"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  backgroundColor: "var(--market-primary-soft-color)",
                  color: "var(--market-secondary-color)",
                }}
              >
                Retirada grátis
              </span>
            </div>
          </div>
        )}

        {/* Summary */}
        <div
          className="bg-white rounded-2xl p-4 shadow-sm"
          style={{ border: "1px solid var(--market-primary-border-color)" }}
        >
          <div className="flex justify-between mb-1">
            <span
              style={{ fontSize: "13px", color: "#64748b" }}
            >
              Subtotal antes do cupom
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
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                Desconto cupom
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--market-primary-color)" }}>
                -R$ {discount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          {minimumOrder > 0 && (
            <div className="flex justify-between mb-1">
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                Pedido mínimo
              </span>
              <span style={{ fontSize: "13px", fontWeight: 600, color: meetsMinimumOrder ? "var(--market-primary-color)" : "#dc2626" }}>
                R$ {minimumOrder.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          <div className="flex justify-between mb-1">
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
                  mode === "pickup" || deliveryFee === 0
                    ? "var(--market-primary-color)"
                    : "#334155",
              }}
            >
              {mode === "pickup" || deliveryFee === 0
                ? "Grátis"
                : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
            </span>
          </div>

          {serviceFee > 0 && (
            <div className="flex justify-between mb-1">
              <span
                style={{ fontSize: "13px", color: "#64748b" }}
              >
                Taxa de serviço
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#334155",
                }}
              >
                R$ {serviceFee.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}

          <div
            className="pt-2 flex justify-between"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#334155",
              }}
            >
              Total estimado
            </span>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 800,
                color: "var(--market-primary-color)",
              }}
            >
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div
        className="flex-shrink-0 bg-white px-4 py-4"
        style={{ borderTop: "1px solid var(--market-primary-border-color)" }}
      >
        <button
          onClick={handleContinueToCheckout}
          className="w-full rounded-2xl py-4 text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ backgroundColor: meetsMinimumOrder ? "var(--market-primary-color)" : "#9ca3af" }}
        >
          <span style={{ fontSize: "15px", fontWeight: 700 }}>
            {meetsMinimumOrder ? "Continuar para pagamento →" : "Pedido mínimo não atingido"}
          </span>
        </button>
      </div>
    </div>
  );
}
