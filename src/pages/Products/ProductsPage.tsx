import { useEffect, useMemo, useState } from "react";
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
import { useCategories } from '@/features/categories';
import { BannerRenderer, getBannerProducts, useBanners } from '@/features/banners';

const sortOptions = [
  "Relevância",
  "Promoções",
  "Mais vendidos",
  "Menor preço",
  "Maior preço",
  "Desconto",
];

function sortByOrder<T extends { order?: number; name: string }>(items: T[]) {
  return [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { marketId } = useMarketContext();
  const { cartCount, currentMarket, tenantPath } = useApp();
  const { products, isLoading: isLoadingProducts, error: productsError } = useProducts(marketId);
  const { categories } = useCategories(marketId);
  const [query, setQuery] = useState("");
  const [showSort, setShowSort] = useState(false);
  const [sort, setSort] = useState("Relevância");

  const selectedDepartmentId = searchParams.get("categoria") || "";
  const selectedLevel2Id = searchParams.get("categoriaNivel2") || "";
  const selectedSubcategoryId = searchParams.get("subcategoria") || "";
  const bannerId = searchParams.get("banner") || "";
  const { banners } = useBanners(marketId, 'products');
  const [bannerProducts, setBannerProducts] = useState<Product[] | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [isLoadingBannerProducts, setIsLoadingBannerProducts] = useState(false);
  const selectedDepartment = categories.find((cat) => cat.id === selectedDepartmentId);
  const level2Categories = useMemo(
    () => sortByOrder(categories.filter((cat) => cat.parentId === selectedDepartmentId && cat.level === 2)),
    [categories, selectedDepartmentId],
  );
  const selectedLevel2 = categories.find((cat) => cat.id === selectedLevel2Id);
  const level3Categories = useMemo(
    () => sortByOrder(categories.filter((cat) => cat.parentId === selectedLevel2Id && cat.level === 3)),
    [categories, selectedLevel2Id],
  );
  const selectedFilterCategoryId = selectedSubcategoryId || selectedLevel2Id || selectedDepartmentId;
  const selectedCategory = categories.find((cat) => cat.id === selectedFilterCategoryId);
  const recents = ["Leite", "Pão", "Frango", "Café", "Ovos"];
  const getCategoryPathIds = (categoryId: string) => {
    const ids = new Set<string>();
    let current = categories.find((cat) => cat.id === categoryId);

    while (current) {
      ids.add(current.id);
      current = current.parentId ? categories.find((cat) => cat.id === current!.parentId) : undefined;
    }

    return ids;
  };

  const updateNavigation = (values: { departamento?: string; categoriaNivel2?: string; subcategoria?: string | null }) => {
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
  };

  useEffect(() => {
    if (!selectedDepartmentId || selectedLevel2Id || level2Categories.length === 0) return;
    updateNavigation({ categoriaNivel2: level2Categories[0].id, subcategoria: null });
  }, [level2Categories, selectedDepartmentId, selectedLevel2Id]);

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

  const sourceProducts = bannerProducts ?? products;

  const filtered = filterProducts(sourceProducts, query)
    .filter((p) => {
      if (bannerId) return true;
      if (!selectedFilterCategoryId) return true;
      return getCategoryPathIds(p.category).has(selectedFilterCategoryId);
    })
    .filter((p) => {
      if (sort === "Promoções") return p.isPromo;
      if (sort === "Mais vendidos") return p.isBestseller;
      if (sort === "Desconto") return p.originalPrice && p.price < p.originalPrice;
      return true;
    })
    .sort((a, b) => {
      if (sort === "Menor preço") return a.price - b.price;
      if (sort === "Maior preço") return b.price - a.price;
      return 0;
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 bg-white px-4 pt-12 md:pt-5 pb-3 border-b"
        style={{ borderColor: "#d9e4f2" }}
      >
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2"
            style={{ backgroundColor: "#eef4fb" }}
          >
            <ChevronLeft size={20} color="#122a4c" />
          </button>

          <div
            className="flex-1 flex items-center gap-3 rounded-2xl px-4 py-3"
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
              className="flex-1 bg-transparent outline-none placeholder:text-gray-400"
              style={{ fontSize: "14px", color: "#334155" }}
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X size={16} color="#94a3b8" />
              </button>
            )}
          </div>

          <button
            className="relative rounded-full p-2"
            style={{ backgroundColor: "#eef4fb" }}
            onClick={() => navigate(tenantPath("carrinho"))}
          >
            <ShoppingCart size={20} color="#122a4c" />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 text-white rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: "#122a4c",
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
          <div className="mb-2 flex items-center justify-between rounded-2xl px-3 py-2" style={{ backgroundColor: "#eef4fb" }}>
            <span style={{ fontSize: "12px", color: "#122a4c", fontWeight: 700 }}>
              {selectedDepartment.emoji} {selectedDepartment.name}
            </span>
            <button
              onClick={() => navigate(tenantPath("produtos"), { replace: true })}
              style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}
            >
              Limpar
            </button>
          </div>
        )}

        {selectedDepartment && level2Categories.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
            {level2Categories.map((category) => {
              const isActive = selectedLevel2Id === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => updateNavigation({ categoriaNivel2: category.id, subcategoria: null })}
                  className="flex-shrink-0 rounded-xl px-4 py-2 transition-all shadow-sm"
                  style={{
                    backgroundColor: isActive ? "white" : "#f1f5f9",
                    color: isActive ? (currentMarket?.primaryColor || "#122a4c") : "#64748b",
                    border: `1.5px solid ${isActive ? (currentMarket?.primaryColor || "#122a4c") : "transparent"}`,
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 600,
                  }}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}

        {selectedLevel2 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
            <button
              onClick={() => updateNavigation({ subcategoria: null })}
              className="flex-shrink-0 rounded-xl px-4 py-2 transition-all shadow-sm"
              style={{
                backgroundColor: !selectedSubcategoryId ? "white" : "#f1f5f9",
                color: !selectedSubcategoryId ? (currentMarket?.primaryColor || "#16a34a") : "#64748b",
                border: `1.5px solid ${!selectedSubcategoryId ? (currentMarket?.primaryColor || "#16a34a") : "transparent"}`,
                fontSize: "13px",
                fontWeight: !selectedSubcategoryId ? 700 : 600,
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
                  className="flex-shrink-0 rounded-xl px-4 py-2 transition-all shadow-sm"
                  style={{
                    backgroundColor: isActive ? "white" : "#f1f5f9",
                    color: isActive ? (currentMarket?.primaryColor || "#16a34a") : "#64748b",
                    border: `1.5px solid ${isActive ? (currentMarket?.primaryColor || "#16a34a") : "transparent"}`,
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 600,
                  }}
                >
                  {subcategory.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Sort */}
        <div className="flex justify-end px-1 mb-2">
          <div className="relative">
            <button
              onClick={() => setShowSort(!showSort)}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 shadow-sm transition-all"
              style={{ backgroundColor: "#f1f5f9" }}
            >
              <SlidersHorizontal size={14} color="#64748b" />
              <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>
                Ordenar
              </span>
            </button>

            {/* Sort dropdown */}
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
                      color: sort === opt ? "#122a4c" : "#334155",
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
        </div>
      </div>

      {/* Content */}
      <div
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
              Buscas recentes
            </p>

            <div className="mb-6 flex flex-wrap gap-2">
              {recents.map((r) => (
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

            <p
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#64748b",
              }}
              className="mb-3"
            >
              Populares agora
            </p>

            {isLoadingProducts && products.length === 0 ? (
              <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide">
                {[0, 1, 2, 3].map(item => (
                  <div key={item} className="h-[180px] w-[150px] shrink-0 animate-pulse rounded-2xl bg-white" />
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
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <PackageSearch size={42} color="#94a3b8" />
                <p className="text-center" style={{ fontSize: "15px", color: "#64748b", fontWeight: 600 }}>
                  Este mercado ainda não possui produtos disponíveis
                </p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide">
                {products.slice(0, 5).map((p) => (
                  <ProductCard key={p.id} product={p} compact />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p
              style={{ fontSize: "13px", color: "#64748b" }}
              className="mb-3"
            >
              {isLoadingBannerProducts ? "Carregando" : filtered.length} resultado
              {filtered.length !== 1 ? "s" : ""}
              {query ? ` para "${query}"` : bannerId && bannerTitle ? ` em ${bannerTitle}` : selectedCategory ? ` em ${selectedCategory.name}` : ""}
            </p>

            {isLoadingBannerProducts ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pb-2">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="h-[210px] animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <span style={{ fontSize: "48px" }}>🔍</span>
                <p
                  className="text-center"
                  style={{ fontSize: "15px", color: "#64748b" }}
                >
                  Nenhum produto encontrado
                  {query && (
                    <>
                      <br />
                      para "{query}"
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pb-2">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} compact fluid />
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
