import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  ShoppingCart,
  Bell,
  ChevronRight,
  Zap,
  PackageSearch,
  Store,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { useMarketContext } from '@/contexts/MarketContext';
import { useCategories } from '@/features/categories';
import { getEstablishmentLabels } from '@/features/markets';
import { ProductCard, useProducts } from '@/features/products';
import { BannerRenderer, useBanners } from '@/features/banners';
import { fetchCustomerNotifications } from '@/features/notifications';
import { BottomNav } from '@/shared/components/BottomNav';

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

export function MarketPage() {
  const navigate = useNavigate();
  const { marketId } = useMarketContext();
  const { cartCount, cartPulseKey, currentMarket, isLoggedIn, tenantPath } = useApp();
  const establishmentLabels = getEstablishmentLabels(currentMarket.establishmentType);
  const [activeCartPulseKey, setActiveCartPulseKey] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const lastCartPulseKeyRef = useRef(cartPulseKey);
  const categoryDrag = useHorizontalDragScroll<HTMLDivElement>();
  const promoDrag = useHorizontalDragScroll<HTMLDivElement>();
  const immediateConsumptionDrag = useHorizontalDragScroll<HTMLDivElement>();
  const bestsellersDrag = useHorizontalDragScroll<HTMLDivElement>();
  const buyAgainDrag = useHorizontalDragScroll<HTMLDivElement>();
  const featuredDrag = useHorizontalDragScroll<HTMLDivElement>();
  const { products: fallbackProducts, isLoading: isLoadingProducts, error: productsError } = useProducts(marketId, {
    allowGlobal: true,
    perPage: 30,
  });
  const { products: promoProducts } = useProducts(marketId, {
    allowGlobal: true,
    perPage: 30,
    promotionActive: true,
  });
  const { products: immediateConsumptionProducts } = useProducts(marketId, {
    allowGlobal: true,
    perPage: 30,
    promotionActive: true,
    immediateConsumption: true,
  });
  const { products: bestsellers } = useProducts(marketId, {
    allowGlobal: true,
    perPage: 30,
    bestsellers: true,
  });
  const { products: featured } = useProducts(marketId, {
    allowGlobal: true,
    perPage: 30,
    featured: true,
  });
  const { categories } = useCategories(marketId);
  const { banners } = useBanners(marketId, 'home');
  const departments = categories.filter((category) => category.level === 1);
  const showMarketLogo = Boolean(currentMarket.logo && !logoFailed);

  const visibleFeatured = featured.length > 0
    ? featured
    : (bestsellers.length > 0 ? bestsellers : fallbackProducts).slice(0, 6);

  useEffect(() => {
    setLogoFailed(false);
  }, [currentMarket.logo]);

  useEffect(() => {
    if (cartPulseKey <= lastCartPulseKeyRef.current) return;

    lastCartPulseKeyRef.current = cartPulseKey;
    setActiveCartPulseKey(cartPulseKey);

    const timeoutId = window.setTimeout(() => {
      setActiveCartPulseKey((key) => (key === cartPulseKey ? 0 : key));
    }, 760);

    return () => window.clearTimeout(timeoutId);
  }, [cartPulseKey]);

  useEffect(() => {
    let active = true;

    const loadUnreadNotifications = async () => {
      if (!isLoggedIn) {
        setUnreadNotificationCount(0);
        return;
      }

      try {
        const notifications = await fetchCustomerNotifications();
        if (active) {
          setUnreadNotificationCount(notifications.filter((item) => !item.read_at).length);
        }
      } catch {
        if (active) setUnreadNotificationCount(0);
      }
    };

    void loadUnreadNotifications();
    window.addEventListener("notification-received", loadUnreadNotifications);

    return () => {
      active = false;
      window.removeEventListener("notification-received", loadUnreadNotifications);
    };
  }, [isLoggedIn]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-8 md:pt-4 pb-2"
        style={{
          background:
            "linear-gradient(160deg, var(--market-secondary-color) 0%, var(--market-primary-color) 100%)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.28)" }}
            >
              {showMarketLogo ? (
                <img
                  src={currentMarket.logo}
                  alt={currentMarket.name}
                  className="h-full w-full object-cover"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <Store size={18} color="white" />
              )}
            </div>
            <p className="min-w-0 truncate text-white" style={{ fontSize: "15px", fontWeight: 800 }}>
              {currentMarket.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="home-header-icon-button relative rounded-full"
              onClick={() => navigate(tenantPath("notifications-feed"))}
              aria-label="Abrir notificações"
            >
              <Bell size={18} color="white" />
              {unreadNotificationCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 rounded-full"
                  style={{
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#ef4444",
                    boxShadow: "0 0 0 2px rgba(49, 46, 129, 0.92)",
                  }}
                />
              )}
            </button>

            <button
              className="home-header-icon-button relative rounded-full"
              onClick={() => navigate("/")}
              aria-label="Alternar estabelecimento"
              title="Alternar estabelecimento"
            >
              <Store size={18} color="white" />
            </button>

            <button
              className={`home-header-icon-button relative rounded-full ${cartCount > 0 ? "cart-status-pulse" : ""}`}
              onClick={() => navigate(tenantPath("carrinho"))}
              aria-label="Abrir carrinho"
            >
              <span className={`inline-flex ${activeCartPulseKey > 0 ? "cart-added-bounce" : ""}`}>
                <ShoppingCart size={18} color="white" />
              </span>
              {activeCartPulseKey > 0 && (
                <span
                  key={`cart-pop-${activeCartPulseKey}`}
                  className="cart-added-pop absolute -bottom-2 left-1/2 text-white"
                  style={{
                    fontSize: "10px",
                    fontWeight: 900,
                    textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                  }}
                  aria-hidden="true"
                >
                  +1
                </span>
              )}
              {cartCount > 0 && (
                <span
                  key={`cart-badge-${activeCartPulseKey || "idle"}`}
                  className={`absolute -top-1 -right-1 text-white rounded-full flex items-center justify-center ${activeCartPulseKey > 0 ? "cart-badge-pop" : ""}`}
                  style={{
                    width: "18px",
                    height: "18px",
                    fontSize: "10px",
                    fontWeight: 700,
                    backgroundColor: "var(--market-secondary-color)",
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
                color: "var(--market-primary-color)",
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
                  color: "var(--market-primary-color)",
                  fontWeight: 600,
                }}
              >
                Ver todas
              </span>
              <ChevronRight size={14} color="var(--market-primary-color)" />
            </button>
          </div>

          <div
            {...categoryDrag}
            className="flex cursor-grab gap-3 overflow-x-auto pb-1 scrollbar-hide"
          >
            {departments.slice(0, 7).map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`${tenantPath("produtos")}?categoria=${encodeURIComponent(cat.id)}`)}
                className="flex h-[104px] w-[88px] flex-shrink-0 flex-col items-center justify-between gap-1.5 rounded-2xl p-3 transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--market-primary-soft-color)",
                  border: "1px solid var(--market-primary-border-color)",
                }}
              >
                <span style={{ fontSize: "24px" }}>
                  {cat.emoji}
                </span>
                <span
                  className="line-clamp-2"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: "var(--market-primary-color)",
                    minHeight: "26px",
                    textAlign: "center",
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
                style={{ backgroundColor: "var(--market-primary-soft-color)" }}
              >
                <Zap size={16} color="var(--market-primary-color)" fill="var(--market-primary-color)" />
              </div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--market-primary-color)",
                }}
              >
                Ofertas do dia
              </h2>
            </div>

            <button
              onClick={() => navigate(tenantPath("colecoes/promos"))}
              className="flex items-center gap-0.5"
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--market-primary-color)",
                  fontWeight: 600,
                }}
              >
                Ver todas
              </span>
              <ChevronRight size={14} color="var(--market-primary-color)" />
            </button>
          </div>

          <div
            {...promoDrag}
            className="flex cursor-grab gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
          >
            {promoProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </div>
        )}
        <BannerRenderer banners={banners} placement="below_promos" page="home" className="px-4 pt-5" />

        {/* Consumo imediato */}
        {immediateConsumptionProducts.length > 0 && (
        <div className="pt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--market-primary-color)",
              }}
            >
              ⚡ Consumo imediato
            </h2>
            <button
              onClick={() => navigate(tenantPath("colecoes/immediate"))}
              className="flex items-center gap-0.5"
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--market-primary-color)",
                  fontWeight: 600,
                }}
              >
                Ver todos
              </span>
              <ChevronRight size={14} color="var(--market-primary-color)" />
            </button>
          </div>

          <div
            {...immediateConsumptionDrag}
            className="flex cursor-grab gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
          >
            {immediateConsumptionProducts.map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </div>
        )}

        {/* Mais Vendidos */}
        {bestsellers.length > 0 && (
        <div className="pt-5">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--market-primary-color)",
              }}
            >
              🔥 Mais vendidos
            </h2>
            <button
              onClick={() => navigate(tenantPath("colecoes/bestsellers"))}
              className="flex items-center gap-0.5"
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--market-primary-color)",
                  fontWeight: 600,
                }}
              >
                Ver todos
              </span>
              <ChevronRight size={14} color="var(--market-primary-color)" />
            </button>
          </div>

          <div
            {...bestsellersDrag}
            className="flex cursor-grab gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
          >
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
                color: "var(--market-primary-color)",
              }}
            >
              🔄 Compre novamente
            </h2>
            <button
              onClick={() => navigate(tenantPath("colecoes/buy-again"))}
              className="flex items-center gap-0.5"
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--market-primary-color)",
                  fontWeight: 600,
                }}
              >
                Ver todos
              </span>
              <ChevronRight size={14} color="var(--market-primary-color)" />
            </button>
          </div>

          <div
            {...buyAgainDrag}
            className="flex cursor-grab gap-3 overflow-x-auto pb-2 scrollbar-hide"
          >
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
                color: "var(--market-primary-color)",
              }}
            >
              ⭐ Destaques
            </h2>
            <button
              onClick={() => navigate(tenantPath("colecoes/featured"))}
              className="flex items-center gap-0.5"
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--market-primary-color)",
                  fontWeight: 600,
                }}
              >
                Ver todos
              </span>
              <ChevronRight size={14} color="var(--market-primary-color)" />
            </button>
          </div>

          {isLoadingProducts && fallbackProducts.length === 0 && visibleFeatured.length === 0 ? (
            <div
              {...featuredDrag}
              className="flex cursor-grab gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
            >
              {[0, 1, 2].map(item => (
                <div key={item} className="h-[180px] w-[150px] shrink-0 animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : productsError && fallbackProducts.length === 0 && visibleFeatured.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center mx-4">
              <PackageSearch size={34} color="#94a3b8" />
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Não foi possível carregar os produtos
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-2xl px-5 py-2.5 text-white"
                style={{ backgroundColor: "var(--market-primary-color)", fontSize: "13px", fontWeight: 700 }}
              >
                Recarregar
              </button>
            </div>
          ) : visibleFeatured.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-10 text-center mx-4">
              <PackageSearch size={34} color="#94a3b8" />
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#334155" }}>
                Este {establishmentLabels.singular} ainda não possui produtos disponíveis
              </p>
            </div>
          ) : (
          <div
            {...featuredDrag}
            className="flex cursor-grab gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
          >
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
