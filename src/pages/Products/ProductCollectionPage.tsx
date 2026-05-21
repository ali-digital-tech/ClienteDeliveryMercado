import { useCallback, useEffect, useMemo } from "react";
import type { UIEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, PackageSearch, ShoppingCart } from "lucide-react";
import { useApp } from "@/app/providers/AppProvider";
import { useMarketContext } from "@/contexts/MarketContext";
import { ProductCard, useProducts } from "@/features/products";
import type { Product } from "@/features/products";
import { BottomNav } from "@/shared/components/BottomNav";

type CollectionKey = "promos" | "immediate" | "bestsellers" | "buy-again" | "featured";
const COLLECTION_PAGE_SIZE = 20;

type CollectionConfig = {
  title: string;
  emptyMessage: string;
  filter: (product: Product) => boolean;
  sort?: (a: Product, b: Product) => number;
};

const sortBySales = (a: Product, b: Product) =>
  (b.salesCount ?? 0) - (a.salesCount ?? 0) || a.name.localeCompare(b.name);

const collectionConfigs: Record<CollectionKey, CollectionConfig> = {
  promos: {
    title: "Ofertas do dia",
    emptyMessage: "Nenhuma oferta disponivel agora.",
    filter: (product) => Boolean(product.isPromo),
  },
  immediate: {
    title: "Consumo imediato",
    emptyMessage: "Nenhum produto de consumo imediato disponivel agora.",
    filter: (product) => Boolean(product.isImmediateConsumption && product.isPromo),
  },
  bestsellers: {
    title: "Mais vendidos",
    emptyMessage: "Ainda nao ha produtos mais vendidos para exibir.",
    filter: (product) => Boolean(product.isBestseller),
    sort: sortBySales,
  },
  "buy-again": {
    title: "Compre novamente",
    emptyMessage: "Ainda nao ha produtos para comprar novamente.",
    filter: (product) => Boolean(product.isBestseller),
    sort: sortBySales,
  },
  featured: {
    title: "Destaques",
    emptyMessage: "Nenhum destaque disponivel agora.",
    filter: (product) => Boolean(product.isFeatured),
  },
};

function isCollectionKey(value: string | undefined): value is CollectionKey {
  return Boolean(value && value in collectionConfigs);
}

export function ProductCollectionPage() {
  const navigate = useNavigate();
  const { collection } = useParams();
  const { marketId } = useMarketContext();
  const { cartCount, currentMarket, tenantPath } = useApp();
  const config = isCollectionKey(collection) ? collectionConfigs[collection] : null;
  const primaryColor = currentMarket?.primaryColor || "#122a4c";
  const {
    products,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    loadMore,
  } = useProducts(marketId, {
    allowGlobal: true,
    perPage: COLLECTION_PAGE_SIZE,
    enabled: Boolean(config),
    useOffsetPagination: true,
  });

  const visibleProducts = useMemo(() => {
    if (!config) return [];

    return products
      .filter(config.filter)
      .sort(config.sort ?? (() => 0));
  }, [config, products]);

  const handleContentScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceToBottom < 360 && hasNextPage && !isLoading && !isLoadingMore) {
      void loadMore();
    }
  }, [hasNextPage, isLoading, isLoadingMore, loadMore]);

  useEffect(() => {
    if (
      config &&
      visibleProducts.length < COLLECTION_PAGE_SIZE &&
      hasNextPage &&
      !isLoading &&
      !isLoadingMore
    ) {
      void loadMore();
    }
  }, [config, hasNextPage, isLoading, isLoadingMore, loadMore, visibleProducts.length]);

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 text-center">
        <p style={{ fontSize: "14px", color: "#64748b", fontWeight: 700 }}>
          Secao nao encontrada.
        </p>
      </div>
    );
  }

  const isPrimingCollection = isLoadingMore && visibleProducts.length === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex-shrink-0 bg-white px-4 pt-8 md:pt-4 pb-3 border-b"
        style={{ borderColor: "#d9e4f2" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 flex-shrink-0"
            style={{ backgroundColor: "#eef4fb" }}
          >
            <ChevronLeft size={20} color={primaryColor} />
          </button>

          <h1 className="min-w-0 flex-1 truncate" style={{ fontSize: "18px", fontWeight: 800, color: primaryColor }}>
            {config.title}
          </h1>

          <button
            className="relative rounded-full p-2 flex-shrink-0"
            style={{ backgroundColor: "#eef4fb" }}
            onClick={() => navigate(tenantPath("carrinho"))}
          >
            <ShoppingCart size={20} color={primaryColor} />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 text-white rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: primaryColor,
                  width: "18px",
                  height: "18px",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div
        onScroll={handleContentScroll}
        className="flex-1 overflow-y-auto px-4 pt-4 pb-6"
        style={{ background: "#f8fafc" }}
      >
        {(isLoading || isPrimingCollection) && visibleProducts.length === 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-[210px] animate-pulse rounded-2xl bg-white" />
            ))}
          </div>
        ) : error && products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <PackageSearch size={42} color="#94a3b8" />
            <p className="text-center" style={{ fontSize: "15px", color: "#64748b", fontWeight: 600 }}>
              Nao foi possivel carregar os produtos.
            </p>
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <PackageSearch size={42} color="#94a3b8" />
            <p className="text-center" style={{ fontSize: "15px", color: "#64748b", fontWeight: 600 }}>
              {config.emptyMessage}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pb-2">
              {visibleProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="product-fade-in"
                  style={{ animationDelay: `${Math.min(index % COLLECTION_PAGE_SIZE, 8) * 35}ms` }}
                >
                  <ProductCard product={product} compact fluid />
                </div>
              ))}
            </div>

            {isLoadingMore && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pt-2">
                {[0, 1].map((item) => (
                  <div key={item} className="h-[210px] animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
