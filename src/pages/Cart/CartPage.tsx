import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Plus, Minus, Trash2, Tag, Truck, ShoppingCart } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { useMarketContext } from '@/contexts/MarketContext';
import { BannerRenderer, useBanners } from '@/features/banners';
import { formatCartQuantity } from '@/features/cart';
import {
  calculatePlatformServiceFee,
  getMercadoPagoCheckoutConfig,
  type MercadoPagoCheckoutConfig,
} from '@/features/payments';
import { ProductCard, ProductImage, useProducts } from '@/features/products';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

function useHorizontalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const dragState = useRef({
    isMouseDown: false,
    hasDragged: false,
    startX: 0,
    scrollLeft: 0,
  });
  const shouldSuppressClick = useRef(false);

  const stopDragging = useCallback((event: MouseEvent<T>) => {
    const target = event.currentTarget;
    dragState.current.isMouseDown = false;
    target.style.cursor = "";
    target.style.userSelect = "";
  }, []);

  const onMouseDown = useCallback((event: MouseEvent<T>) => {
    if (event.button !== 0) return;

    dragState.current = {
      isMouseDown: true,
      hasDragged: false,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    shouldSuppressClick.current = false;
    event.currentTarget.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback((event: MouseEvent<T>) => {
    if (!dragState.current.isMouseDown) return;

    const distance = event.clientX - dragState.current.startX;
    if (Math.abs(distance) <= 6) return;

    dragState.current.hasDragged = true;
    shouldSuppressClick.current = true;
    event.preventDefault();
    event.currentTarget.style.userSelect = "none";
    event.currentTarget.scrollLeft = dragState.current.scrollLeft - distance;
  }, []);

  const onClickCapture = useCallback((event: MouseEvent<T>) => {
    if (!shouldSuppressClick.current) return;

    event.preventDefault();
    event.stopPropagation();
    shouldSuppressClick.current = false;
  }, []);

  return {
    ref,
    onMouseDown,
    onMouseMove,
    onMouseUp: stopDragging,
    onMouseLeave: stopDragging,
    onClickCapture,
  };
}

export function CartPage() {
  const navigate = useNavigate();
  const { marketId } = useMarketContext();
  const { cart, updateQty, removeFromCart, cartTotal, coupon, discount, applyCoupon, tenantPath, currentMarket } = useApp();
  const { banners } = useBanners(marketId, 'cart');
  const { products: suggestedProducts } = useProducts(marketId, {
    allowGlobal: true,
    perPage: 20,
  });
  const [couponInput, setCouponInput] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [checkoutConfig, setCheckoutConfig] = useState<MercadoPagoCheckoutConfig | null>(null);
  const suggestedProductsDrag = useHorizontalDragScroll<HTMLDivElement>();

  const deliveryFee = Math.max(0, currentMarket?.deliveryFee || 0);
  const total = Math.max(cartTotal - discount + deliveryFee, 0);
  const serviceFee = calculatePlatformServiceFee(total, checkoutConfig?.platform_split);
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const primaryColor = currentMarket?.primaryColor || 'var(--market-primary-color)';

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
  const primarySoftColor = `color-mix(in srgb, ${primaryColor} 10%, white)`;
  const minimumOrder = Math.max(0, currentMarket?.minimumOrder || 0);
  const missingMinimumOrder = Math.max(0, minimumOrder - cartTotal);
  const meetsMinimumOrder = minimumOrder <= 0 || missingMinimumOrder <= 0;
  const selectedSuggestions = suggestedProducts
    .filter(product => product.isFeatured)
    .slice(0, 10);
  const visibleSuggestions = selectedSuggestions.length > 0
    ? selectedSuggestions
    : suggestedProducts.slice(0, 10);

  const handleCoupon = async () => {
    setIsApplyingCoupon(true);
    setCouponSuccess('');

    try {
      const appliedCoupon = await applyCoupon(couponInput);
      const message = appliedCoupon.message || `Cupom "${appliedCoupon.code}" aplicado!`;
      setCouponSuccess(message);
      showSystemNotice(message, "Cupom aplicado");
      setCouponInput('');
    } catch (error) {
      showSystemNotice(error || 'Não foi possível aplicar o cupom.');
      setCouponSuccess('');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleContinueToDelivery = () => {
    if (!meetsMinimumOrder) {
      showSystemNotice(
        `O pedido mínimo deste mercado é R$ ${minimumOrder.toFixed(2).replace('.', ',')}. Adicione mais R$ ${missingMinimumOrder.toFixed(2).replace('.', ',')} em produtos para finalizar.`
      );
      return;
    }

    navigate(tenantPath('delivery'));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 pt-8 md:pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="bg-gray-100 rounded-full p-2">
            <ChevronLeft size={20} color="#374151" />
          </button>
          <div>
            <h1 className="text-gray-800" style={{ fontSize: '18px', fontWeight: 800 }}>Meu Carrinho</h1>
            <p className="text-gray-400" style={{ fontSize: '12px' }}>
              {formatCartQuantity(itemCount)} ite{itemCount !== 1 ? 'ns' : 'm'}
            </p>
          </div>
        </div>
      </div>

      {cart.length === 0 ? (
        <div className="flex-1 overflow-y-auto px-4 py-6" style={{ background: '#f8fafc' }}>
          <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <div className="rounded-full p-6" style={{ backgroundColor: primarySoftColor }}>
              <ShoppingCart size={52} color={primaryColor} />
            </div>
            <p className="text-gray-700" style={{ fontSize: '18px', fontWeight: 800 }}>
              Seu carrinho está vazio
            </p>
            <p className="text-gray-400 text-center" style={{ fontSize: '14px', lineHeight: 1.5 }}>
              Adicione produtos para continuar com a compra
            </p>
            <button
              onClick={() => navigate(tenantPath('produtos'))}
              className="rounded-2xl px-6 py-3 text-white mt-1"
              style={{ backgroundColor: primaryColor, fontSize: '15px', fontWeight: 700 }}
            >
              Explorar produtos
            </button>
          </div>

          {visibleSuggestions.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--market-primary-color)' }}>
                  Produtos selecionados para você
                </h2>
                <button
                  onClick={() => navigate(tenantPath('colecoes/featured'))}
                  style={{ fontSize: '12px', color: primaryColor, fontWeight: 700 }}
                >
                  Ver todos
                </button>
              </div>

              <div
                {...suggestedProductsDrag}
                className="flex cursor-grab gap-3 overflow-x-auto pb-2 scrollbar-hide"
              >
                {visibleSuggestions.map(product => (
                  <ProductCard key={product.id} product={product} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 pt-3" style={{ background: '#f3f4f6' }}>
            <BannerRenderer banners={banners} placement="cart_top" page="cart" className="mb-3" />
            {/* Delivery banner */}
            {deliveryFee > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-2 mb-3">
                <Truck size={16} color="#f97316" />
                <p style={{ fontSize: '12px', color: '#ea580c', lineHeight: 1.4 }}>
                  Taxa de entrega deste mercado: <b>R$ {deliveryFee.toFixed(2).replace('.', ',')}</b>
                </p>
              </div>
            )}
            {deliveryFee === 0 && (
              <div className="rounded-2xl px-4 py-3 flex items-center gap-2 mb-3" style={{ backgroundColor: primarySoftColor, border: `1px solid ${primaryColor}` }}>
                <Truck size={16} color={primaryColor} />
                <p style={{ fontSize: '12px', color: primaryColor, fontWeight: 600 }}>Entrega grátis neste mercado.</p>
              </div>
            )}

            {/* Items */}
            <div className="flex flex-col gap-3 mb-4">
              {cart.map(item => (
                <div key={item.product.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                  <ProductImage
                    src={item.product.image}
                    alt={item.product.name}
                    className="rounded-xl object-cover flex-shrink-0"
                    style={{ width: '64px', height: '64px' }}
                    iconSize={24}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 truncate" style={{ fontSize: '10px' }}>{item.product.brand}</p>
                    <p className="text-gray-800 truncate" style={{ fontSize: '13px', fontWeight: 600 }}>{item.product.name}</p>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: primaryColor }}>
                      R$ {(item.product.price * item.qty).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => {
                        void removeFromCart(item.product.id).catch(error => {
                          console.error('Erro ao remover produto do carrinho:', error);
                        });
                      }}
                      className="p-1"
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                      <button
                        onClick={() => {
                          void updateQty(item.product.id, item.qty - 1).catch(error => {
                            console.error('Erro ao atualizar quantidade do produto:', error);
                          });
                        }}
                        className="rounded-lg bg-white shadow-sm flex items-center justify-center"
                        style={{ width: '26px', height: '26px' }}
                      >
                        <Minus size={12} color="#374151" />
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                        {formatCartQuantity(item.qty)}
                      </span>
                      <button
                        onClick={() => {
                          void updateQty(item.product.id, item.qty + 1).catch(error => {
                            console.error('Erro ao atualizar quantidade do produto:', error);
                          });
                        }}
                        className="rounded-lg flex items-center justify-center"
                        style={{ width: '26px', height: '26px', backgroundColor: primaryColor }}
                      >
                        <Plus size={12} color="white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={16} color={primaryColor} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>Cupom de desconto</span>
              </div>
              {coupon ? (
                <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ backgroundColor: primarySoftColor }}>
                  <Tag size={14} color={primaryColor} />
                  <span style={{ fontSize: '13px', color: primaryColor, fontWeight: 600 }}>{couponSuccess || `Cupom "${coupon.toUpperCase()}" aplicado — R$ ${discount.toFixed(2).replace('.', ',')} de desconto`}</span>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite o cupom"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-gray-100 rounded-xl px-3 py-2.5 outline-none text-gray-700 placeholder-gray-400"
                      style={{ fontSize: '13px' }}
                      disabled={isApplyingCoupon}
                    />
                    <button
                      onClick={handleCoupon}
                      disabled={isApplyingCoupon || !couponInput.trim()}
                      className="rounded-xl px-4 py-2.5 text-white"
                      style={{
                        backgroundColor: isApplyingCoupon || !couponInput.trim() ? '#9ca3af' : primaryColor,
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {isApplyingCoupon ? 'Validando...' : 'Aplicar'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <h3 className="text-gray-800 mb-3" style={{ fontSize: '14px', fontWeight: 700 }}>Resumo do pedido</h3>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-500" style={{ fontSize: '13px' }}>Subtotal</span>
                  <span className="text-gray-800" style={{ fontSize: '13px', fontWeight: 600 }}>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span style={{ fontSize: '13px', color: primaryColor }}>Desconto cupom</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: primaryColor }}>-R$ {discount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {minimumOrder > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500" style={{ fontSize: '13px' }}>Pedido mínimo</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: meetsMinimumOrder ? primaryColor : '#dc2626' }}>
                      R$ {minimumOrder.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500" style={{ fontSize: '13px' }}>Taxa de entrega</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: deliveryFee === 0 ? primaryColor : '#374151' }}>
                    {deliveryFee === 0 ? 'Grátis' : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
                  </span>
                </div>
                {serviceFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500" style={{ fontSize: '13px' }}>Taxa de serviço</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      R$ {serviceFee.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-2 flex justify-between">
                  <span className="text-gray-800" style={{ fontSize: '15px', fontWeight: 700 }}>Total</span>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: primaryColor }}>R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0 bg-white px-4 py-4 border-t border-gray-100">
            <button
              onClick={handleContinueToDelivery}
              className="w-full rounded-2xl py-4 text-white flex items-center justify-between px-5 transition-all active:scale-[0.98]"
              style={{ backgroundColor: meetsMinimumOrder ? primaryColor : '#9ca3af' }}
            >
              <span style={{ fontSize: '15px', fontWeight: 700 }}>
                {meetsMinimumOrder ? 'Continuar para entrega' : 'Pedido mínimo não atingido'}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 800 }}>R$ {total.toFixed(2).replace('.', ',')} →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
