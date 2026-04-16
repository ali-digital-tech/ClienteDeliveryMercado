import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, Heart, Share2, ShoppingCart, Plus, Minus, Star, ShieldCheck, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { products } from '../data/mockData';
import { ProductCard } from '../components/ProductCard';

export function ProductDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, updateQty, cart, toggleFavorite, isFavorite, cartCount } = useApp();

  const product = products.find(p => p.id === id);
  if (!product) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500">Produto não encontrado.</p>
    </div>
  );

  const cartItem = cart.find(item => item.product.id === product.id);
  const qty = cartItem?.qty || 0;
  const favorite = isFavorite(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  const handleAdd = () => {
    if (qty === 0) addToCart(product);
    else updateQty(product.id, qty + 1);
  };
  const handleRemove = () => updateQty(product.id, qty - 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Image area */}
      <div className="flex-shrink-0 relative" style={{ height: '300px', background: '#f3f4f6' }}>
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />

        {/* Overlay buttons */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12">
          <button onClick={() => navigate(-1)} className="bg-white rounded-full p-2.5 shadow-lg">
            <ChevronLeft size={20} color="#374151" />
          </button>
          <div className="flex gap-2">
            <button className="bg-white rounded-full p-2.5 shadow-lg">
              <Share2 size={18} color="#374151" />
            </button>
            <button onClick={() => toggleFavorite(product.id)} className="bg-white rounded-full p-2.5 shadow-lg">
              <Heart size={18} fill={favorite ? '#ef4444' : 'none'} color={favorite ? '#ef4444' : '#374151'} />
            </button>
            <button className="relative bg-white rounded-full p-2.5 shadow-lg" onClick={() => navigate('/cart')}>
              <ShoppingCart size={18} color="#374151" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 text-white rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#16a34a', width: '16px', height: '16px', fontSize: '9px', fontWeight: 700 }}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {discount > 0 && (
          <div className="absolute bottom-4 left-4 bg-orange-500 text-white rounded-full px-3 py-1" style={{ fontSize: '13px', fontWeight: 700 }}>
            -{discount}% OFF
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white px-4 pt-4 pb-5">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1">
              <p className="text-gray-400" style={{ fontSize: '12px' }}>{product.brand} · {product.unit}</p>
              <h1 className="text-gray-800 mt-0.5" style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1.2 }}>{product.name}</h1>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-2 mb-3">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={14} fill={i <= 4 ? '#f59e0b' : 'none'} color={i <= 4 ? '#f59e0b' : '#d1d5db'} />
            ))}
            <span className="text-gray-400 ml-1" style={{ fontSize: '12px' }}>4.0 (128 avaliações)</span>
          </div>

          {/* Price */}
          <div className="flex items-end gap-3 mb-4">
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>
              R$ {product.price.toFixed(2)}
            </p>
            {product.originalPrice && (
              <p className="text-gray-400 line-through mb-1" style={{ fontSize: '16px' }}>
                R$ {product.originalPrice.toFixed(2)}
              </p>
            )}
          </div>

          {/* Qty selector */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-3 bg-gray-100 rounded-2xl p-1">
              <button
                onClick={handleRemove}
                disabled={qty === 0}
                className="rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ width: '38px', height: '38px', backgroundColor: qty === 0 ? '#f3f4f6' : 'white', boxShadow: qty > 0 ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}
              >
                <Minus size={18} color={qty === 0 ? '#d1d5db' : '#374151'} />
              </button>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', minWidth: '24px', textAlign: 'center' }}>
                {qty}
              </span>
              <button
                onClick={handleAdd}
                className="rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ width: '38px', height: '38px', backgroundColor: '#16a34a' }}
              >
                <Plus size={18} color="white" />
              </button>
            </div>
            <button
              onClick={qty === 0 ? handleAdd : () => navigate('/cart')}
              className="flex-1 rounded-2xl py-3 text-white transition-all active:scale-[0.98]"
              style={{ backgroundColor: '#16a34a', fontSize: '15px', fontWeight: 700 }}
            >
              {qty === 0 ? 'Adicionar ao carrinho' : `Ver carrinho (${qty})`}
            </button>
          </div>

          {/* Badges */}
          <div className="flex gap-2 mb-4">
            <div className="flex items-center gap-1.5 bg-green-50 rounded-xl px-3 py-2">
              <Truck size={14} color="#16a34a" />
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Entrega hoje</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 rounded-xl px-3 py-2">
              <ShieldCheck size={14} color="#2563eb" />
              <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>Qualidade garantida</span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-gray-800 mb-2" style={{ fontSize: '15px', fontWeight: 700 }}>Descrição</h3>
            <p className="text-gray-500" style={{ fontSize: '13px', lineHeight: 1.7 }}>{product.description}</p>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div className="px-4 pt-4 pb-6" style={{ background: '#f3f4f6' }}>
            <h3 className="text-gray-800 mb-3" style={{ fontSize: '15px', fontWeight: 700 }}>Produtos relacionados</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {related.map(p => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
