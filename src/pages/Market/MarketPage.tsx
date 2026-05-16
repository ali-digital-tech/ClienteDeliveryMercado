import { useNavigate } from "react-router";
import {
  Search,
  ShoppingCart,
  MapPin,
  Bell,
  ChevronRight,
  Zap,
  PackageSearch,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { useMarketContext } from '@/contexts/MarketContext';
import { useCategories } from '@/features/categories';
import { ProductCard, useProducts } from '@/features/products';
import { BannerRenderer, useBanners } from '@/features/banners';
import { BottomNav } from '@/shared/components/BottomNav';

export function MarketPage() {
  const navigate = useNavigate();
  const { marketId } = useMarketContext();
  const { cartCount, currentMarket, tenantPath } = useApp();
  const { products, isLoading: isLoadingProducts, error: productsError } = useProducts(marketId);
  const { categories } = useCategories(marketId);
  const { banners } = useBanners(marketId, 'home');
  const departments = categories.filter((category) => category.level === 1);

  const promoProducts = products.filter((p) => p.isPromo);
  const bestsellers = products.filter((p) => p.isBestseller);
  const featured = products.filter((p) => p.isFeatured);
  const visibleFeatured = featured.length > 0 ? featured : products.slice(0, 6);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-12 md:pt-5 pb-3"
        style={{
          background:
            "linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1">
              <MapPin size={13} color="#c7d7ee" />
              <p style={{ fontSize: "11px", color: "#c7d7ee" }}>
                Entregando em
              </p>
            </div>
            <p
              className="text-white"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              R. das Flores, 123 ▾
            </p>
            <p style={{ fontSize: "11px", color: "#c7d7ee" }}>
              {currentMarket.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative rounded-full p-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
              }}
              onClick={() => navigate(tenantPath("notifications-feed"))}
            >
              <Bell size={18} color="white" />
              <span
                className="absolute -top-1 -right-1 rounded-full"
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: "#ef4444",
                }}
              />
            </button>

            <button
              className="relative rounded-full p-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
              }}
              onClick={() => navigate(tenantPath("carrinho"))}
            >
              <ShoppingCart size={18} color="white" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white rounded-full flex items-center justify-center"
                  style={{
                    width: "18px",
                    height: "18px",
                    fontSize: "10px",
                    fontWeight: 700,
                    backgroundColor: "#2f5b93",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <button
          onClick={() => navigate(tenantPath("produtos"))}
          className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 w-full mb-1 shadow-sm"
        >
          <Search size={18} color="#94a3b8" />
          <span style={{ fontSize: "14px", color: "#94a3b8" }}>
            Buscar produtos...
          </span>
        </button>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: "#f8fafc" }}
      >
        {/* Banners */}
        <BannerRenderer banners={banners} placement="home_top" page="home" className="px-4 pt-4" />

        {/* Categories */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#122a4c",
              }}
            >
              Categorias
            </h2>
            <button
              onClick={() => navigate(tenantPath("categories"))}
              className="flex items-center gap-0.5"
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#122a4c",
                  fontWeight: 600,
                }}
              >
                Ver todas
              </span>
              <ChevronRight size={14} color="#122a4c" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {departments.slice(0, 7).map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`${tenantPath("produtos")}?categoria=${encodeURIComponent(cat.id)}`)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all active:scale-95"
                style={{
                  backgroundColor: "#eef4fb",
                  minWidth: "68px",
                  border: "1px solid #d9e4f2",
                }}
              >
                <span style={{ fontSize: "24px" }}>
                  {cat.emoji}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#122a4c",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
        <BannerRenderer banners={banners} placement="below_categories" page="home" className="px-4 pt-5" />

        {/* Ofertas do dia */}
        {promoProducts.length > 0 && (
        <div className="pt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-2">
              <div
                className="rounded-lg p-1"
                style={{ backgroundColor: "#eef4fb" }}
              >
                <Zap size={16} color="#122a4c" fill="#122a4c" />
              </div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#122a4c",
                }}
              >
                Ofertas do dia
              </h2>
            </div>

            <button className="flex items-center gap-0.5">
              <span
                style={{
                  fontSize: "12px",
                  color: "#122a4c",
                  fontWeight: 600,
                }}
              >
                Ver todas
              </span>
              <ChevronRight size={14} color="#122a4c" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {promoProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </div>
        )}
        <BannerRenderer banners={banners} placement="below_promos" page="home" className="px-4 pt-5" />

        {/* Mais Vendidos */}
        {bestsellers.length > 0 && (
        <div className="pt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#122a4c",
              }}
            >
              🔥 Mais vendidos
            </h2>
            <button className="flex items-center gap-0.5">
              <span
                style={{
                  fontSize: "12px",
                  color: "#122a4c",
                  fontWeight: 600,
                }}
              >
                Ver todos
              </span>
              <ChevronRight size={14} color="#122a4c" />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </div>
        )}
        <BannerRenderer banners={banners} placement="below_bestsellers" page="home" className="px-4 pt-5" />



        {/* Compre novamente */}
        <div className="pt-5 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#122a4c",
              }}
            >
              🔄 Compre novamente
            </h2>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {bestsellers.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </div>
        <BannerRenderer banners={banners} placement="below_buy_again" page="home" className="px-4 pt-5" />

        {/* Produtos em destaque */}
        <div className="pt-5 pb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#122a4c",
              }}
            >
              ⭐ Destaques
            </h2>
          </div>

          {isLoadingProducts && products.length === 0 ? (
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {[0, 1, 2].map(item => (
                <div key={item} className="h-[180px] w-[150px] shrink-0 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : productsError && products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center mx-4">
              <PackageSearch size={34} color="#94a3b8" />
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Não foi possível carregar os produtos
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-2xl px-5 py-2.5 text-white"
                style={{ backgroundColor: "#122a4c", fontSize: "13px", fontWeight: 700 }}
              >
                Recarregar
              </button>
            </div>
          ) : visibleFeatured.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center mx-4">
              <PackageSearch size={34} color="#94a3b8" />
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Este mercado ainda não possui produtos disponíveis
              </p>
            </div>
          ) : (
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {visibleFeatured.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
          )}
        </div>
        <BannerRenderer banners={banners} placement="below_featured" page="home" className="px-4 pb-6" />
      </div>

      <BottomNav />
    </div>
  );
}
