import { useNavigate } from 'react-router';
import { ShoppingCart, Search } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { useMarketContext } from '@/contexts/MarketContext';
import { useCategories } from '@/features/categories';
import { BottomNav } from '@/shared/components/BottomNav';

export function CategoriesPage() {
  const navigate = useNavigate();
  const { marketId } = useMarketContext();
  const { cartCount, tenantPath } = useApp();
  const { categories } = useCategories(marketId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-12 md:pt-5 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-gray-800" style={{ fontSize: '20px', fontWeight: 800 }}>Categorias</h1>
          <button className="relative bg-gray-100 rounded-full p-2" onClick={() => navigate(tenantPath('carrinho'))}>
            <ShoppingCart size={20} color="#374151" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 text-white rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#16a34a', width: '18px', height: '18px', fontSize: '10px', fontWeight: 700 }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
        <button
          onClick={() => navigate(tenantPath('produtos'))}
          className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-3 w-full"
        >
          <Search size={17} color="#9ca3af" />
          <span className="text-gray-400" style={{ fontSize: '14px' }}>Buscar produtos...</span>
        </button>
      </div>

      {/* Grid of categories */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6" style={{ background: '#f3f4f6' }}>
        <div className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => navigate(`${tenantPath('produtos')}?categoria=${encodeURIComponent(cat.id)}`)}
              className="flex items-center gap-4 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform bg-white"
            >
              <div className="rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cat.bgColor, width: '52px', height: '52px' }}>
                <span style={{ fontSize: '26px' }}>{cat.emoji}</span>
              </div>
              <div className="text-left flex-1 min-w-0">
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>{cat.name}</p>
                <p style={{ fontSize: '11px', color: cat.color, fontWeight: 500 }}>
                  {Math.floor(8 + Math.random() * 30)} produtos
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Promo strip */}
        <div className="mt-4 rounded-2xl overflow-hidden" style={{ height: '80px', position: 'relative' }}>
          <img
            src="https://images.unsplash.com/photo-1619617257069-3dc8f124c512?w=600&q=80"
            alt="Promo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center px-5"
            style={{ background: 'linear-gradient(90deg, rgba(22,163,74,0.9) 0%, rgba(22,163,74,0.2) 100%)' }}>
            <div>
              <p className="text-white" style={{ fontSize: '16px', fontWeight: 800 }}>Ofertas da semana</p>
              <p className="text-green-100" style={{ fontSize: '12px' }}>Até 40% de desconto</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
