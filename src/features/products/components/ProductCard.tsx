import { Plus, Minus, Heart } from 'lucide-react';
import type { Product } from '../types/product';
import { useApp } from '@/app/providers/AppProvider';
import { useNavigate } from 'react-router';
import { ProductImage } from './ProductImage';
import { formatCartQuantity } from '@/features/cart';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const { addToCart, updateQty, cart, toggleFavorite, isFavorite, tenantPath } = useApp();
  const navigate = useNavigate();
  const cartItem = cart.find(item => item.product.id === product.id);
  const qty = cartItem?.qty || 0;
  const favorite = isFavorite(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const handleIncrement = () => {
    if (qty === 0) {
      void addToCart(product).catch(error => {
        console.error('Erro ao adicionar produto ao carrinho:', error);
      });
      return;
    }

    void updateQty(product.id, qty + 1).catch(error => {
      console.error('Erro ao atualizar quantidade do produto:', error);
    });
  };
  const handleDecrement = () => {
    void updateQty(product.id, qty - 1).catch(error => {
      console.error('Erro ao atualizar quantidade do produto:', error);
    });
  };

  if (compact) {
    return (
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => navigate(tenantPath(`product/${product.id}`))}
        style={{ width: '150px', flexShrink: 0 }}
      >
        <div className="relative bg-gray-50 flex items-center justify-center" style={{ height: '110px' }}>
          <ProductImage src={product.image} alt={product.name} className="w-full h-full object-cover" iconSize={30} />
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-orange-500 text-white rounded-full px-1.5 py-0.5" style={{ fontSize: '10px', fontWeight: 700 }}>
              -{discount}%
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
          <p className="text-gray-400" style={{ fontSize: '10px' }}>{product.unit}</p>
          <div className="flex items-center justify-between mt-2">
            <div>
              {product.originalPrice && (
                <p className="text-gray-400 line-through" style={{ fontSize: '9px' }}>
                  R$ {product.originalPrice.toFixed(2)}
                </p>
              )}
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a' }}>
                R$ {product.price.toFixed(2)}
              </p>
            </div>
            {qty > 0 ? (
              <div
                className="rounded-xl flex items-center justify-between bg-green-50 transition-all"
                style={{ width: '82px', height: '30px' }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={handleDecrement}
                  className="flex items-center justify-center active:scale-90"
                  style={{ width: '28px', height: '30px' }}
                >
                  <Minus size={13} color="#16a34a" strokeWidth={2.5} />
                </button>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                  {formatCartQuantity(qty)}
                </span>
                <button
                  onClick={handleIncrement}
                  className="flex items-center justify-center active:scale-90"
                  style={{ width: '28px', height: '30px' }}
                >
                  <Plus size={13} color="#16a34a" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); handleIncrement(); }}
                className="rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{
                  backgroundColor: '#16a34a',
                  width: '30px',
                  height: '30px',
                }}
              >
                <Plus size={14} color="white" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform flex"
      onClick={() => navigate(tenantPath(`product/${product.id}`))}
    >
      <div className="relative bg-gray-50 flex-shrink-0 flex items-center justify-center" style={{ width: '90px', height: '90px' }}>
        <ProductImage src={product.image} alt={product.name} className="w-full h-full object-cover" iconSize={26} />
        {discount > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white rounded-full px-1 py-0.5" style={{ fontSize: '9px', fontWeight: 700 }}>
            -{discount}%
          </div>
        )}
      </div>
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          <p className="text-gray-400 truncate" style={{ fontSize: '10px' }}>{product.brand}</p>
          <p className="text-gray-800" style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>{product.name}</p>
          <p className="text-gray-400" style={{ fontSize: '10px' }}>{product.unit}</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            {product.originalPrice && (
              <p className="text-gray-400 line-through" style={{ fontSize: '10px' }}>
                R$ {product.originalPrice.toFixed(2)}
              </p>
            )}
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#16a34a' }}>
              R$ {product.price.toFixed(2)}
            </p>
          </div>
          {qty > 0 ? (
            <div
              className="rounded-xl flex items-center justify-between bg-green-50 transition-all"
              style={{ width: '104px', height: '34px' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={handleDecrement}
                className="flex items-center justify-center active:scale-90"
                style={{ width: '34px', height: '34px' }}
              >
                <Minus size={14} color="#16a34a" strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                {formatCartQuantity(qty)}
              </span>
              <button
                onClick={handleIncrement}
                className="flex items-center justify-center active:scale-90"
                style={{ width: '34px', height: '34px' }}
              >
                <Plus size={14} color="#16a34a" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); handleIncrement(); }}
              className="rounded-xl flex items-center gap-1 px-3 py-1.5 transition-all active:scale-90"
              style={{ backgroundColor: '#16a34a' }}
            >
              <Plus size={13} color="white" strokeWidth={2.5} />
              <span style={{ fontSize: '11px', color: 'white', fontWeight: 600 }}>Adicionar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
