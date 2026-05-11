import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ShoppingCart,
} from "lucide-react";
import { useApp } from '@/app/providers/AppProvider';
import { useMarketContext } from '@/contexts/MarketContext';
import { BottomNav } from '@/shared/components/BottomNav';
import { ProductCard, filterProducts, useProducts } from '@/features/products';
import { useCategories } from '@/features/categories';

const filters = [
  "Todos",
  "Promoção",
  "Menor preço",
  "Mais vendidos",
  "Sem glúten",
];
const sortOptions = [
  "Relevância",
  "Menor preço",
  "Maior preço",
  "Desconto",
];

export function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { marketId } = useMarketContext();
  const { cartCount, tenantPath } = useApp();
  const { products } = useProducts(marketId);
  const { categories } = useCategories(marketId);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [showSort, setShowSort] = useState(false);
  const [sort, setSort] = useState("Relevância");

  const selectedCategoryId = searchParams.get("categoria") || "";
  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);
  const recents = ["Leite", "Pão", "Frango", "Café", "Ovos"];

  const filtered = filterProducts(products, query)
    .filter((p) => {
      if (!selectedCategoryId) return true;
      return p.category === selectedCategoryId;
    })
    .filter((p) => {
      if (activeFilter === "Promoção") return p.isPromo;
      if (activeFilter === "Mais vendidos")
        return p.isBestseller;
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
        {selectedCategory && (
          <div className="mb-2 flex items-center justify-between rounded-2xl px-3 py-2" style={{ backgroundColor: "#eef4fb" }}>
            <span style={{ fontSize: "12px", color: "#122a4c", fontWeight: 700 }}>
              {selectedCategory.emoji} {selectedCategory.name}
            </span>
            <button
              onClick={() => navigate(tenantPath("produtos"), { replace: true })}
              style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}
            >
              Limpar
            </button>
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex-shrink-0 rounded-full px-4 py-1.5 transition-all"
              style={{
                backgroundColor:
                  activeFilter === f ? "#122a4c" : "#eef4fb",
                color: activeFilter === f ? "white" : "#64748b",
                fontSize: "12px",
                fontWeight: activeFilter === f ? 700 : 500,
              }}
            >
              {f}
            </button>
          ))}

          <button
            onClick={() => setShowSort(!showSort)}
            className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: "#eef4fb" }}
          >
            <SlidersHorizontal size={13} color="#64748b" />
            <span
              style={{ fontSize: "12px", color: "#64748b" }}
            >
              Ordenar
            </span>
          </button>
        </div>

        {/* Sort dropdown */}
        {showSort && (
          <div
            className="mt-2 overflow-hidden rounded-2xl bg-white shadow-lg"
            style={{ border: "1px solid #d9e4f2" }}
          >
            {sortOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setSort(opt);
                  setShowSort(false);
                }}
                className="w-full text-left px-4 py-3 last:border-0"
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

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ background: "#f8fafc" }}
      >
        {!query && !selectedCategoryId ? (
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

            <div className="flex flex-col gap-3">
              {products.slice(0, 5).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        ) : (
          <>
            <p
              style={{ fontSize: "13px", color: "#64748b" }}
              className="mb-3"
            >
              {filtered.length} resultado
              {filtered.length !== 1 ? "s" : ""}
              {query ? ` para "${query}"` : selectedCategory ? ` em ${selectedCategory.name}` : ""}
            </p>

            {filtered.length === 0 ? (
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
              <div className="flex flex-col gap-3">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
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
