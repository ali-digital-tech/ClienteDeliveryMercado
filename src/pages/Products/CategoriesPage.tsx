import { useNavigate } from 'react-router';
import { ShoppingCart, Search } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { useMarketContext } from '@/contexts/MarketContext';
import { useCategories } from '@/features/categories';
import { BannerRenderer, useBanners } from '@/features/banners';
import { BottomNav } from '@/shared/components/BottomNav';

export function CategoriesPage() {
  const navigate = useNavigate();
  const { marketId } = useMarketContext();
  const { cartCount, tenantPath, currentMarket } = useApp();
  const { categories: departments } = useCategories(marketId, { level: 1 });
  const { banners } = useBanners(marketId, 'categories');
  const primaryColor = currentMarket?.primaryColor || 'var(--market-primary-color)';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-gray-800" style={{ fontSize: '20px', fontWeight: 800 }}>Categorias</h1>
          <button className="relative bg-gray-100 rounded-full p-2" onClick={() => navigate(tenantPath('carrinho'))}>
            <ShoppingCart size={20} color="#374151" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 text-white rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor, width: '18px', height: '18px', fontSize: '10px', fontWeight: 700 }}>
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
        <BannerRenderer banners={banners} placement="categories_top" page="categories" className="mb-4" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {departments.map(cat => {
            const hasProductCount = typeof cat.productCount === 'number' && Number.isFinite(cat.productCount);

            return (
              <button
                key={cat.id}
                onClick={() => navigate(`${tenantPath('produtos')}?categoria=${encodeURIComponent(cat.id)}`)}
                className="flex h-[92px] items-center gap-3 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform bg-white"
              >
                <div className="rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cat.bgColor, width: '52px', height: '52px' }}>
                  <span style={{ fontSize: '26px' }}>{cat.emoji}</span>
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p
                    className="line-clamp-2"
                    style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.25, color: '#1f2937' }}
                  >
                    {cat.name}
                  </p>
                  <p style={{ fontSize: '11px', color: cat.color, fontWeight: 500 }}>
                    {hasProductCount
                      ? `${cat.productCount} ${cat.productCount === 1 ? 'produto' : 'produtos'}`
                      : 'Ver produtos'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>


      </div>

      <BottomNav />
    </div>
  );
}
