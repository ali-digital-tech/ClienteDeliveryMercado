import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, UIEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ShoppingCart,
  PackageSearch,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { useMarketContext } from '@/contexts/MarketContext';
import { BottomNav } from '@/shared/components/BottomNav';
import { ProductCard, filterProducts, useProducts } from '@/features/products';
import type { Product } from '@/features/products';
import { getCategoriesByMarketId, useCategories } from '@/features/categories';
import type { Category } from '@/features/categories';
import { BannerRenderer, getBannerProducts, useBanners } from '@/features/banners';

const sortOptions = [
  "Relevância",
  "Promoções",
  "Mais vendidos",
  "Menor preço",
  "Maior preço",
  "Desconto",
];

const RECENT_SEARCHES_CACHE_KEY = 'cliente_delivery_recent_searches_by_market';
const DEFAULT_SEARCH_SUGGESTIONS = ["Leite", "Pão", "Frango", "Café", "Ovos"];
const MAX_RECENT_SEARCHES = 8;
const MIN_SEARCH_LENGTH = 3;

function readRecentSearches(marketId: string): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_CACHE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    const searches = parsed?.[marketId];
    return Array.isArray(searches) ? searches.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(marketId: string, term: string) {
  const normalized = term.trim();
  if (normalized.length < MIN_SEARCH_LENGTH) return readRecentSearches(marketId);

  const current = readRecentSearches(marketId);
  const next = [
    normalized,
    ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
  ].slice(0, MAX_RECENT_SEARCHES);

  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_CACHE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    localStorage.setItem(RECENT_SEARCHES_CACHE_KEY, JSON.stringify({
      ...(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}),
      [marketId]: next,
    }));
  } catch {
    // Recent searches should never block the product search flow.
  }

  return next;
}

function sortByOrder<T extends { order?: number; name: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

function colorWithAlpha(color: string, alpha: number) {
  const normalized = color.trim();

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [, r, g, b] = normalized;
    return `rgba(${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(b + b, 16)}, ${alpha})`;
  }

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    const hex = normalized.slice(1);
    return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${alpha})`;
  }

  return normalized;
}

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

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { marketId } = useMarketContext();
  const { cartCount, currentMarket, tenantPath } = useApp();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentSearches(marketId));
  const [showSort, setShowSort] = useState(false);
  const [sort, setSort] = useState("Relevância");
  const categoryDrag = useHorizontalDragScroll<HTMLDivElement>();
  const subcategoryDrag = useHorizontalDragScroll<HTMLDivElement>();

  const selectedDepartmentId = searchParams.get("categoria") || "";
  const selectedLevel2Id = searchParams.get("categoriaNivel2") || "";
  const selectedSubcategoryId = searchParams.get("subcategoria") || "";
  const bannerId = searchParams.get("banner") || "";
  const { banners } = useBanners(marketId, 'products');
  const [bannerProducts, setBannerProducts] = useState<Product[] | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [isLoadingBannerProducts, setIsLoadingBannerProducts] = useState(false);
  const { categories: departments } = useCategories(marketId, { level: 1 });
  const [level2Categories, setLevel2Categories] = useState<Category[]>([]);
  const [level3Categories, setLevel3Categories] = useState<Category[]>([]);
  const [isLoadingLevel2Categories, setIsLoadingLevel2Categories] = useState(false);
  const [isLoadingLevel3Categories, setIsLoadingLevel3Categories] = useState(false);
  const [level2CategoriesError, setLevel2CategoriesError] = useState<Error | null>(null);
  const [level3CategoriesError, setLevel3CategoriesError] = useState<Error | null>(null);
  const selectedDepartment = departments.find((cat) => cat.id === selectedDepartmentId);
  const selectedLevel2 = level2Categories.find((cat) => cat.id === selectedLevel2Id);
  const selectedSubcategory = selectedSubcategoryId
    ? level3Categories.find((cat) => cat.id === selectedSubcategoryId)
    : null;
  const selectedCategory =
    selectedSubcategoryId
      ? selectedSubcategory
      : selectedLevel2 || selectedDepartment;
  const searchChips = recentSearches.length > 0 ? recentSearches : DEFAULT_SEARCH_SUGGESTIONS;
  const primaryColor = currentMarket?.primaryColor || "#122a4c";
  const categorySurface = colorWithAlpha(primaryColor, 0.08);
  const categorySurfaceStrong = colorWithAlpha(primaryColor, 0.14);
  const categoryBorder = colorWithAlpha(primaryColor, 0.2);
  const categoryShadow = colorWithAlpha(primaryColor, 0.18);
  const normalizedQuery = query.trim();
  const normalizedSubmittedQuery = submittedQuery.trim();
  const hasSearchQuery = normalizedSubmittedQuery.length >= MIN_SEARCH_LENGTH;
  const canSubmitSearch = normalizedQuery.length >= MIN_SEARCH_LENGTH;
  const isAwaitingSearchSubmit = normalizedQuery.length > 0 && normalizedQuery !== normalizedSubmittedQuery;
  const isLoadingCategories = isLoadingLevel2Categories || isLoadingLevel3Categories;
  const canLoadProducts = !bannerId && Boolean(
    marketId
    && (
      hasSearchQuery
      || (
        selectedDepartmentId
        && selectedLevel2
        && (!selectedSubcategoryId || selectedSubcategory)
      )
    ),
  );
  const {
    products,
    isLoading: isLoadingProducts,
    isLoadingMore,
    error: productsError,
    hasNextPage,
    loadMore,
    total,
  } = useProducts(marketId, {
    departmentId: selectedDepartmentId || null,
    categoryId: selectedLevel2Id || null,
    subcategoryId: selectedSubcategoryId || null,
    search: hasSearchQuery ? normalizedSubmittedQuery : '',
    perPage: 30,
    enabled: canLoadProducts,
    allowGlobal: hasSearchQuery,
  });

  const submitSearch = useCallback(() => {
    const nextQuery = query.trim();
    if (nextQuery.length < MIN_SEARCH_LENGTH) return;

    setSubmittedQuery(nextQuery);
    setRecentSearches(saveRecentSearch(marketId, nextQuery));
  }, [marketId, query]);

  const updateNavigation = useCallback((values: { departamento?: string; categoriaNivel2?: string; subcategoria?: string | null }) => {
    const next = new URLSearchParams(searchParams);

    if (values.departamento !== undefined) {
      if (values.departamento) next.set("categoria", values.departamento);
      else next.delete("categoria");
      next.delete("categoriaNivel2");
      next.delete("subcategoria");
    }

    if (values.categoriaNivel2 !== undefined) {
      if (values.categoriaNivel2) next.set("categoriaNivel2", values.categoriaNivel2);
      else next.delete("categoriaNivel2");
      next.delete("subcategoria");
    }

    if (values.subcategoria !== undefined) {
      if (values.subcategoria) next.set("subcategoria", values.subcategoria);
      else next.delete("subcategoria");
    }

    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setRecentSearches(readRecentSearches(marketId));
  }, [marketId]);

  useEffect(() => {
    let ignore = false;

    setLevel2Categories([]);
    setLevel3Categories([]);
    setLevel2CategoriesError(null);
    setLevel3CategoriesError(null);

    if (!selectedDepartmentId) {
      setIsLoadingLevel2Categories(false);
      setIsLoadingLevel3Categories(false);
      return;
    }

    setIsLoadingLevel2Categories(true);
    getCategoriesByMarketId(marketId, { parentId: selectedDepartmentId })
      .then((data) => {
        if (!ignore) {
          setLevel2Categories(sortByOrder(data.filter((category) => category.parentId === selectedDepartmentId)));
        }
      })
      .catch((error) => {
        if (!ignore) {
          setLevel2CategoriesError(error);
          setLevel2Categories([]);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoadingLevel2Categories(false);
      });

    return () => {
      ignore = true;
    };
  }, [marketId, selectedDepartmentId]);

  useEffect(() => {
    if (!selectedDepartmentId || isLoadingLevel2Categories || level2CategoriesError) return;
    if (level2Categories.length === 0) {
      if (selectedLevel2Id || selectedSubcategoryId) {
        updateNavigation({ categoriaNivel2: "", subcategoria: null });
      }
      return;
    }
    if (selectedLevel2Id && level2Categories.some((category) => category.id === selectedLevel2Id)) return;

    updateNavigation({ categoriaNivel2: level2Categories[0].id, subcategoria: null });
  }, [
    isLoadingLevel2Categories,
    level2Categories,
    level2CategoriesError,
    selectedDepartmentId,
    selectedLevel2Id,
    selectedSubcategoryId,
    updateNavigation,
  ]);

  useEffect(() => {
    let ignore = false;

    setLevel3Categories([]);
    setLevel3CategoriesError(null);

    if (!selectedDepartmentId || !selectedLevel2Id || isLoadingLevel2Categories || !selectedLevel2) {
      setIsLoadingLevel3Categories(false);
      return;
    }

    setIsLoadingLevel3Categories(true);
    getCategoriesByMarketId(marketId, { parentId: selectedLevel2Id })
      .then((data) => {
        if (!ignore) {
          setLevel3Categories(sortByOrder(data.filter((category) => category.parentId === selectedLevel2Id)));
        }
      })
      .catch((error) => {
        if (!ignore) {
          setLevel3CategoriesError(error);
          setLevel3Categories([]);
        }
      })
      .finally(() => {
        if (!ignore) setIsLoadingLevel3Categories(false);
      });

    return () => {
      ignore = true;
    };
  }, [isLoadingLevel2Categories, marketId, selectedDepartmentId, selectedLevel2, selectedLevel2Id]);

  useEffect(() => {
    if (!selectedSubcategoryId || isLoadingLevel3Categories || level3CategoriesError) return;
    if (level3Categories.some((category) => category.id === selectedSubcategoryId)) return;

    updateNavigation({ subcategoria: null });
  }, [isLoadingLevel3Categories, level3Categories, level3CategoriesError, selectedSubcategoryId, updateNavigation]);

  useEffect(() => {
    let ignore = false;

    if (!bannerId) {
      setBannerProducts(null);
      setBannerTitle("");
      return;
    }

    setIsLoadingBannerProducts(true);
    getBannerProducts(marketId, bannerId)
      .then((result) => {
        if (ignore) return;
        setBannerProducts(result.products);
        setBannerTitle(result.banner.titulo);
      })
      .catch(() => {
        if (ignore) return;
        setBannerProducts([]);
        setBannerTitle("");
      })
      .finally(() => {
        if (!ignore) setIsLoadingBannerProducts(false);
      });

    return () => {
      ignore = true;
    };
  }, [bannerId, marketId]);

  const handleContentScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;

    if (distanceToBottom < 360 && hasNextPage && !isLoadingProducts && !isLoadingMore) {
      void loadMore();
    }
  }, [hasNextPage, isLoadingMore, isLoadingProducts, loadMore]);

  const sourceProducts = bannerProducts ?? products;

  const filtered = (bannerId ? filterProducts(sourceProducts, normalizedSubmittedQuery) : sourceProducts)
    .filter((p) => {
      if (sort === "Promoções") return p.isPromo;
      if (sort === "Mais vendidos") return p.isBestseller;
      if (sort === "Desconto") return p.originalPrice && p.price < p.originalPrice;
      return true;
    })
    .sort((a, b) => {
      if (sort === "Mais vendidos") return (b.salesCount ?? 0) - (a.salesCount ?? 0) || a.name.localeCompare(b.name);
      if (sort === "Menor preço") return a.price - b.price;
      if (sort === "Maior preço") return b.price - a.price;
      return 0;
    });
  const visibleResultCount = bannerId ? filtered.length : total;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white px-4 pt-8 md:pt-4 pb-2 border-b"
        style={{ borderColor: "#d9e4f2" }}
      >
        <div className="mb-2 flex items-center gap-1.5">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 flex-shrink-0"
            style={{ backgroundColor: "#eef4fb" }}
          >
            <ChevronLeft size={20} color="#122a4c" />
          </button>

          <div
            className="flex-1 flex min-w-0 items-center gap-2 rounded-xl px-3 py-2"
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #d9e4f2",
            }}
          >
            <Search size={17} color="#94a3b8" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar produtos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitSearch();
                }
              }}
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400"
              style={{ fontSize: "13px", color: "#334155" }}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSubmittedQuery("");
                }}
              >
                <X size={16} color="#94a3b8" />
              </button>
            )}
            <button
              type="button"
              onClick={submitSearch}
              disabled={!canSubmitSearch}
              aria-label="Buscar produtos"
              title={`Buscar com pelo menos ${MIN_SEARCH_LENGTH} letras`}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all"
              style={{
                backgroundColor: canSubmitSearch ? primaryColor : "#d9e4f2",
                color: canSubmitSearch ? "#ffffff" : "#94a3b8",
              }}
            >
              <Search size={15} />
            </button>
          </div>

          <div className="relative flex-shrink-0">
            <button
              type="button"
              aria-label="Ordenar produtos"
              title="Ordenar"
              onClick={() => setShowSort(!showSort)}
              className="rounded-full p-2 transition-all"
              style={{ backgroundColor: "#eef4fb" }}
            >
              <SlidersHorizontal size={20} color="#122a4c" />
            </button>

            {showSort && (
              <div
                className="absolute right-0 top-[calc(100%+8px)] w-48 overflow-hidden rounded-2xl bg-white shadow-xl z-[100]"
                style={{
                  border: "1px solid #d9e4f2",
                  animation: "fadeIn 0.2s ease-out forwards"
                }}
              >
                <style>{`
                  @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                {sortOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSort(opt);
                      setShowSort(false);
                    }}
                    className="w-full text-left px-4 py-3 last:border-0 hover:bg-gray-50 transition-colors"
                    style={{
                      fontSize: "14px",
                      color: sort === opt ? primaryColor : "#334155",
                      fontWeight: sort === opt ? 600 : 400,
                      borderBottom: "1px solid #eef2f7",
                    }}
                  >
                    {opt} {sort === opt && "✓"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="relative rounded-full p-2 flex-shrink-0"
            style={{ backgroundColor: "#eef4fb" }}
            onClick={() => navigate(tenantPath("carrinho"))}
          >
            <ShoppingCart size={20} color="#122a4c" />
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

        {/* Filter chips */}
        {selectedDepartment && (
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="min-w-0 truncate" style={{ fontSize: "11px", color: primaryColor, fontWeight: 700 }}>
              {selectedDepartment.emoji} {selectedDepartment.name}
            </span>
            <button
              onClick={() => navigate(tenantPath("produtos"), { replace: true })}
              className="flex-shrink-0"
              style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}
            >
              Limpar
            </button>
          </div>
        )}

        {selectedDepartment && level2Categories.length > 0 && (
          <div className={selectedLevel2 ? "pt-0.5" : "pb-0.5 pt-0.5"}>
            <div
              {...categoryDrag}
              className="flex cursor-grab gap-1.5 overflow-x-auto px-1 pb-1.5 pt-1.5 scrollbar-hide"
            >
              {level2Categories.map((category) => {
                const isActive = selectedLevel2Id === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => updateNavigation({ categoriaNivel2: category.id, subcategoria: null })}
                    className="flex-shrink-0 rounded-full px-3 py-1.5 transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? primaryColor : "#f8fafc",
                      border: `1px solid ${isActive ? primaryColor : "#d9e4f2"}`,
                      boxShadow: isActive ? `0 5px 12px ${categoryShadow}` : "none",
                      color: isActive ? "#ffffff" : "#64748b",
                      fontSize: "11px",
                      fontWeight: isActive ? 800 : 650,
                      transform: isActive ? "translateY(-2px)" : "translateY(0)",
                    }}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedLevel2 && (
          <div
            className="relative -mt-0.5 rounded-2xl px-2 py-2"
            style={{
              background: `linear-gradient(180deg, ${categorySurfaceStrong} 0%, ${categorySurface} 100%)`,
              border: `1px solid ${categoryBorder}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.85), 0 5px 14px rgba(15, 23, 42, 0.05)`,
            }}
          >
            <div
              {...subcategoryDrag}
              className="flex cursor-grab gap-1.5 overflow-x-auto scrollbar-hide"
            >
              <button
                onClick={() => updateNavigation({ subcategoria: null })}
                className="flex-shrink-0 rounded-full px-3 py-1.5 transition-all duration-200"
                style={{
                  backgroundColor: !selectedSubcategoryId ? primaryColor : "#ffffff",
                  border: `1px solid ${!selectedSubcategoryId ? primaryColor : categoryBorder}`,
                  boxShadow: !selectedSubcategoryId ? `0 4px 10px ${categoryShadow}` : "0 1px 2px rgba(15, 23, 42, 0.04)",
                  color: !selectedSubcategoryId ? "#ffffff" : primaryColor,
                  fontSize: "11px",
                  fontWeight: !selectedSubcategoryId ? 800 : 700,
                }}
              >
                Todos
              </button>
              {level3Categories.map((subcategory) => {
                const isActive = selectedSubcategoryId === subcategory.id;
                return (
                  <button
                    key={subcategory.id}
                    onClick={() => updateNavigation({ subcategoria: subcategory.id })}
                    className="flex-shrink-0 rounded-full px-3 py-1.5 transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? primaryColor : "#ffffff",
                      border: `1px solid ${isActive ? primaryColor : categoryBorder}`,
                      boxShadow: isActive ? `0 4px 10px ${categoryShadow}` : "0 1px 2px rgba(15, 23, 42, 0.04)",
                      color: isActive ? "#ffffff" : "#334155",
                      fontSize: "11px",
                      fontWeight: isActive ? 800 : 700,
                    }}
                  >
                    {subcategory.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        onScroll={handleContentScroll}
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        <BannerRenderer banners={banners} placement="products_top" page="products" className="mb-4" />

        {bannerId && (
          <div className="mb-4 flex items-center justify-between rounded-2xl px-4 py-3" style={{ backgroundColor: "#eef4fb" }}>
            <span style={{ fontSize: "13px", color: "#122a4c", fontWeight: 700 }}>
              {bannerTitle || "Ofertas do banner"}
            </span>
            <button
              onClick={() => navigate(tenantPath("produtos"), { replace: true })}
              style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}
            >
              Limpar
            </button>
          </div>
        )}

        {!query && !selectedDepartmentId && !bannerId ? (
          <>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#64748b",
              }}
              className="mb-3"
            >
              {recentSearches.length > 0 ? "Buscas recentes" : "Sugestões de busca"}
            </p>

            <div className="mb-6 flex flex-wrap gap-2">
              {searchChips.map((r) => (
                <button
                  key={r}
                  onClick={() => setQuery(r)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 bg-white"
                  style={{ border: "1px solid #d9e4f2" }}
                >
                  <Search size={12} color="#94a3b8" />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#334155",
                    }}
                  >
                    {r}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : isAwaitingSearchSubmit && !selectedDepartmentId && !bannerId ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <PackageSearch size={42} color="#94a3b8" />
            <p className="max-w-xs text-center" style={{ fontSize: "15px", color: "#64748b", lineHeight: 1.5 }}>
              {normalizedQuery.length < MIN_SEARCH_LENGTH
                ? `Digite pelo menos ${MIN_SEARCH_LENGTH} letras para buscar.`
                : `Toque em Buscar para pesquisar por "${normalizedQuery}".`}
            </p>
          </div>
        ) : (
          <>
            <p
              style={{ fontSize: "13px", color: "#64748b" }}
              className="mb-3"
            >
              {isLoadingBannerProducts || isLoadingCategories ? "Carregando" : visibleResultCount} resultado
              {visibleResultCount !== 1 ? "s" : ""}
              {normalizedSubmittedQuery ? ` para "${normalizedSubmittedQuery}"` : bannerId && bannerTitle ? ` em ${bannerTitle}` : selectedCategory ? ` em ${selectedCategory.name}` : ""}
            </p>

            {isLoadingBannerProducts || isLoadingCategories || (isLoadingProducts && filtered.length === 0) ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pb-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-[210px] animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            ) : productsError && products.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <PackageSearch size={42} color="#94a3b8" />
                <p className="text-center" style={{ fontSize: "15px", color: "#64748b", fontWeight: 600 }}>
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
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <span style={{ fontSize: "48px" }}>🔍</span>
                <p
                  className="text-center"
                  style={{ fontSize: "15px", color: "#64748b" }}
                >
                  Nenhum produto encontrado
                  {normalizedSubmittedQuery && (
                    <>
                      <br />
                      para "{normalizedSubmittedQuery}"
                    </>
                  )}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pb-2">
                  {filtered.map((p) => (
                    <ProductCard key={p.id} product={p} compact fluid />
                  ))}
                </div>
                {isLoadingMore && (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pt-2 pb-2">
                    {[0, 1].map((item) => (
                      <div key={item} className="h-[210px] animate-pulse rounded-2xl bg-white" />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
