import { useState } from 'react';
import { Plus, Minus, Heart, X } from 'lucide-react';
import type { Product } from '../types/product';
import { useApp } from '@/app/providers/AppProvider';
import { useNavigate } from 'react-router';
import { ProductImage } from './ProductImage';
import { formatCartQuantity, getNextCartQuantity, isWeightProduct } from '@/features/cart';
import { WeightQuantityModal } from './WeightQuantityModal';
import { getProductById } from '../services/productsService';
import { ProductConfigurator } from './ProductConfigurator';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';
import { isConfigurableProduct } from '../utils/productConfiguration';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  fluid?: boolean;
}

export function ProductCard({ product, compact = false, fluid = false }: ProductCardProps) {
  const { addToCart, addConfiguredItem, updateQty, cart, toggleFavorite, isFavorite, tenantPath, currentMarket } = useApp();
  const navigate = useNavigate();
  const [showWeightSelector, setShowWeightSelector] = useState(false);
  const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);
  const [loadingConfiguration, setLoadingConfiguration] = useState(false);
  const cartItem = cart.find(item => item.product.id === product.id);
  const qty = cartItem?.qty || 0;
  const favorite = isFavorite(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const promotionLabel = discount > 0 ? `-${discount}% OFF` : product.isPromo ? 'OFERTA' : '';
  const primaryColor = currentMarket?.primaryColor || 'var(--market-primary-color)';
  const primarySoftColor = `color-mix(in srgb, ${primaryColor} 10%, white)`;
  const isWeightSale = isWeightProduct(product);
  const isConfigurable = isConfigurableProduct(product);
  const isAssemblyShortcut = Boolean(product.isAssemblyShortcut);

  const openConfigurator = async () => {
    if (product.configuration) {
      setConfiguringProduct(product);
      return;
    }

    try {
      setLoadingConfiguration(true);
      const detailedProduct = await getProductById(product.marketId, product.storeProductId || product.id);
      if (!detailedProduct?.configuration) {
        navigate(tenantPath(`product/${product.storeProductId || product.id}`));
        return;
      }
      setConfiguringProduct(detailedProduct);
    } catch (error) {
      console.error('Erro ao carregar configuração do produto:', error);
      showSystemNotice('Não foi possível carregar as opções deste item.');
    } finally {
      setLoadingConfiguration(false);
    }
  };

  const handleIncrement = () => {
    if (isConfigurable) {
      void openConfigurator();
      return;
    }
    if (qty === 0) {
      if (isWeightSale) {
        setShowWeightSelector(true);
        return;
      }

      void addToCart(product).catch(error => {
        console.error('Erro ao adicionar produto ao carrinho:', error);
      });
      return;
    }

    void updateQty(product.id, getNextCartQuantity(product, qty, 1)).catch(error => {
      console.error('Erro ao atualizar quantidade do produto:', error);
    });
  };
  const handleDecrement = () => {
    void updateQty(product.id, getNextCartQuantity(product, qty, -1)).catch(error => {
      console.error('Erro ao atualizar quantidade do produto:', error);
    });
  };

  const weightSelector = showWeightSelector && (
    <WeightQuantityModal
      product={product}
      primaryColor={primaryColor}
      onClose={() => setShowWeightSelector(false)}
      onConfirm={(quantity) => {
        setShowWeightSelector(false);
        void addToCart(product, quantity).catch(error => {
          console.error('Erro ao adicionar produto ao carrinho:', error);
        });
      }}
    />
  );
  const configurationModal = (loadingConfiguration || configuringProduct) && (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4">
      <div className="max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:max-w-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Monte seu item</p>
            <h2 className="truncate text-base font-extrabold text-slate-900">
              {configuringProduct?.name || product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfiguringProduct(null);
              setLoadingConfiguration(false);
            }}
            className="rounded-full bg-slate-100 p-2 text-slate-600"
            aria-label="Fechar configurador"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(92vh-64px)] overflow-y-auto px-4 pb-5">
          {loadingConfiguration && !configuringProduct ? (
            <div className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-500">
              Carregando opções...
            </div>
          ) : configuringProduct ? (
            <ProductConfigurator
              product={configuringProduct}
              primaryColor={primaryColor}
              onConfirm={(configuredItem) => {
                void addConfiguredItem(configuredItem)
                  .then(() => setConfiguringProduct(null))
                  .catch(error => {
                    console.error('Erro ao adicionar item configurado:', error);
                    showSystemNotice('Não foi possível adicionar esta configuração.');
                  });
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <>
        {weightSelector}
        {configurationModal}
        <div
          className={`bg-white rounded-2xl overflow-hidden shadow-sm border cursor-pointer active:scale-[0.98] transition-transform ${fluid ? 'w-full' : ''}`}
          onClick={() => (product.isVirtualOptionProduct || isAssemblyShortcut) ? void openConfigurator() : navigate(tenantPath(`product/${product.id}`))}
          style={{
            ...(fluid ? { minWidth: '150px' } : { width: '150px', flexShrink: 0 }),
            borderColor: isAssemblyShortcut ? primaryColor : '#f3f4f6',
            boxShadow: isAssemblyShortcut ? '0 0 0 2px rgba(18, 42, 76, 0.14), 0 10px 24px rgba(15, 23, 42, 0.08)' : undefined,
          }}
        >
          <div className="relative bg-white flex items-center justify-center overflow-hidden" style={{ height: '110px' }}>
          <ProductImage src={product.image} alt={product.name} className="w-full h-full object-contain p-2 pb-5" iconSize={30} />
          {isAssemblyShortcut && (
            <div className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ backgroundColor: primaryColor }}>
              Montar
            </div>
          )}
          {promotionLabel && (
            <div 
              className="absolute bottom-0 left-0 w-full text-center py-0.5 text-white" 
              style={{ 
                backgroundColor: primaryColor,
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {promotionLabel}
            </div>
          )}
          <button
            onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm"
          >
            <Heart size={12} fill={favorite ? '#ef4444' : 'none'} color={favorite ? '#ef4444' : '#9ca3af'} />
          </button>
        </div>
        <div className="p-2.5">
          <p className="text-gray-400 truncate" style={{ fontSize: '10px' }}>{product.brand}</p>
          <p className="text-gray-800 truncate" style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.3 }}>{product.name}</p>
          <p className="text-gray-400" style={{ fontSize: '10px' }}>{isWeightSale ? 'kg' : product.unit}</p>
          <div className="flex items-center justify-between mt-2">
            <div>
              {product.originalPrice && (
                <p className="text-gray-400 line-through" style={{ fontSize: '9px' }}>
                  R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                </p>
              )}
              {isConfigurable && <p style={{ fontSize: '9px', color: '#64748b' }}>A partir de</p>}
              <p style={{ fontSize: '14px', fontWeight: 700, color: primaryColor }}>
                R$ {product.price.toFixed(2).replace('.', ',')}
                {isWeightSale && <span style={{ fontSize: '10px', fontWeight: 600 }}>/kg</span>}
              </p>
            </div>
            {!isConfigurable && qty > 0 ? (
              <div
                className="rounded-xl flex items-center justify-between transition-all"
                style={{ width: '82px', height: '30px', backgroundColor: primarySoftColor }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={handleDecrement}
                  className="flex items-center justify-center active:scale-90"
                  style={{ width: '28px', height: '30px' }}
                >
                  <Minus size={13} color={primaryColor} strokeWidth={2.5} />
                </button>
                <span style={{ fontSize: '12px', color: primaryColor, fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                  {formatCartQuantity(qty, product)}
                </span>
                <button
                  onClick={handleIncrement}
                  className="flex items-center justify-center active:scale-90"
                  style={{ width: '28px', height: '30px' }}
                >
                  <Plus size={13} color={primaryColor} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); handleIncrement(); }}
                className="rounded-xl flex items-center justify-center transition-all active:scale-90 whitespace-nowrap"
                style={{
                  backgroundColor: primaryColor,
                  width: isConfigurable ? (isAssemblyShortcut ? '62px' : '74px') : '30px',
                  paddingInline: isConfigurable ? '8px' : 0,
                  height: '30px',
                  flexShrink: 0,
                }}
              >
                {isConfigurable
                  ? <span style={{ fontSize: '10px', color: 'white', fontWeight: 800, lineHeight: 1 }}>{isAssemblyShortcut ? 'Montar' : 'Escolher'}</span>
                  : <Plus size={14} color="white" strokeWidth={2.5} />}
              </button>
            )}
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      {weightSelector}
      {configurationModal}
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-sm border cursor-pointer active:scale-[0.98] transition-transform flex"
        onClick={() => (product.isVirtualOptionProduct || isAssemblyShortcut) ? void openConfigurator() : navigate(tenantPath(`product/${product.id}`))}
        style={{
          borderColor: isAssemblyShortcut ? primaryColor : '#f3f4f6',
          boxShadow: isAssemblyShortcut ? '0 0 0 2px rgba(18, 42, 76, 0.14), 0 10px 24px rgba(15, 23, 42, 0.08)' : undefined,
        }}
      >
      <div className="relative bg-white flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ width: '90px', height: '90px' }}>
        <ProductImage src={product.image} alt={product.name} className="w-full h-full object-contain p-1 pb-4" iconSize={26} />
        {isAssemblyShortcut && (
          <div className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-black text-white" style={{ backgroundColor: primaryColor }}>
            Montar
          </div>
        )}
        {promotionLabel && (
          <div 
            className="absolute bottom-0 left-0 w-full text-center py-0.5 text-white" 
            style={{ 
              backgroundColor: primaryColor,
              fontSize: '10px',
              fontWeight: 800,
            }}
          >
            {promotionLabel}
          </div>
        )}
      </div>
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          <p className="text-gray-400 truncate" style={{ fontSize: '10px' }}>{product.brand}</p>
          <p className="text-gray-800" style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>{product.name}</p>
          <p className="text-gray-400" style={{ fontSize: '10px' }}>{isWeightSale ? 'kg' : product.unit}</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            {product.originalPrice && (
              <p className="text-gray-400 line-through" style={{ fontSize: '10px' }}>
                R$ {product.originalPrice.toFixed(2).replace('.', ',')}
              </p>
            )}
            {isConfigurable && <p style={{ fontSize: '9px', color: '#64748b' }}>A partir de</p>}
            <p style={{ fontSize: '15px', fontWeight: 700, color: primaryColor }}>
              R$ {product.price.toFixed(2).replace('.', ',')}
              {isWeightSale && <span style={{ fontSize: '10px', fontWeight: 600 }}>/kg</span>}
            </p>
          </div>
          {!isConfigurable && qty > 0 ? (
            <div
              className="rounded-xl flex items-center justify-between transition-all"
              style={{ width: '104px', height: '34px', backgroundColor: primarySoftColor }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={handleDecrement}
                className="flex items-center justify-center active:scale-90"
                style={{ width: '34px', height: '34px' }}
              >
                <Minus size={14} color={primaryColor} strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: '13px', color: primaryColor, fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                {formatCartQuantity(qty, product)}
              </span>
              <button
                onClick={handleIncrement}
                className="flex items-center justify-center active:scale-90"
                style={{ width: '34px', height: '34px' }}
              >
                <Plus size={14} color={primaryColor} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); handleIncrement(); }}
              className="rounded-xl flex items-center gap-1 px-3 py-1.5 transition-all active:scale-90"
              style={{ backgroundColor: primaryColor }}
            >
              {!isConfigurable && <Plus size={13} color="white" strokeWidth={2.5} />}
              <span style={{ fontSize: '11px', color: 'white', fontWeight: 600 }}>
                {isConfigurable ? (isAssemblyShortcut ? 'Montar' : 'Escolher') : 'Adicionar'}
              </span>
            </button>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
