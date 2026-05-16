import { useNavigate } from 'react-router';
import { Heart, ShoppingCart } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { BottomNav } from '@/shared/components/BottomNav';
import { ProductCard } from '@/features/products';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites, cartCount, products, tenantPath } = useApp();

  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 pt-12 md:pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-800" style={{ fontSize: '20px', fontWeight: 800 }}>Favoritos</h1>
            <p className="text-gray-400" style={{ fontSize: '13px' }}>
              {favoriteProducts.length} produto{favoriteProducts.length !== 1 ? 's' : ''} salvos
            </p>
          </div>
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4" style={{ background: '#f3f4f6' }}>
        {favoriteProducts.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="rounded-full p-6 bg-red-50">
              <Heart size={48} color="#f87171" />
            </div>
            <p className="text-gray-600" style={{ fontSize: '17px', fontWeight: 700 }}>Nenhum favorito ainda</p>
            <p className="text-gray-400 text-center" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              Toque no ❤️ nos produtos para<br />salvá-los aqui
            </p>
            <button
              onClick={() => navigate(tenantPath())}
              className="mt-2 rounded-2xl px-6 py-3 text-white"
              style={{ backgroundColor: '#16a34a', fontSize: '14px', fontWeight: 700 }}
            >
              Explorar produtos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pb-2">
            {favoriteProducts.map(p => (
              <ProductCard key={p.id} product={p} compact fluid />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
