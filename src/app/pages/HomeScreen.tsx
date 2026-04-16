import { useNavigate } from "react-router";
import {
  Search,
  ShoppingCart,
  MapPin,
  Bell,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { BottomNav } from "../components/BottomNav";
import { ProductCard } from "../components/ProductCard";
import { products, categories } from "../data/mockData";

const banners = [
  {
    id: 1,
    title: "Até 40% OFF",
    subtitle: "em hortifruti selecionados",
    badge: "OFERTA ESPECIAL",
    image:
      "https://images.unsplash.com/photo-1619617257069-3dc8f124c512?w=600&q=80",
    color: "#122a4c",
  },
  {
    id: 2,
    title: "Frete Grátis",
    subtitle: "em compras acima de R$ 89",
    badge: "PROMOÇÃO",
    image:
      "https://images.unsplash.com/photo-1774312081005-cab8b6fa0c9b?w=600&q=80",
    color: "#1b3d6d",
  },
];

export function HomeScreen() {
  const navigate = useNavigate();
  const { cartCount } = useApp();

  const promoProducts = products.filter((p) => p.isPromo);
  const bestsellers = products.filter((p) => p.isBestseller);
  const featured = products.filter((p) => p.isFeatured);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-12 pb-3"
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
          </div>

          <div className="flex items-center gap-3">
            <button
              className="relative rounded-full p-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
              }}
            >
              <Bell size={18} color="white" />
            </button>

            <button
              className="relative rounded-full p-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
              }}
              onClick={() => navigate("/cart")}
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
          onClick={() => navigate("/search")}
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
        <div className="px-4 pt-4">
          <div
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="flex-shrink-0 rounded-2xl overflow-hidden relative"
                style={{
                  width: "280px",
                  height: "140px",
                  scrollSnapAlign: "start",
                }}
              >
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, ${banner.color}ee 0%, ${banner.color}55 100%)`,
                  }}
                />
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <span
                    className="text-white rounded-full px-2 py-0.5 self-start"
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      backgroundColor: "rgba(255,255,255,0.18)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {banner.badge}
                  </span>

                  <div>
                    <h3
                      className="text-white"
                      style={{
                        fontSize: "22px",
                        fontWeight: 800,
                        lineHeight: 1.1,
                      }}
                    >
                      {banner.title}
                    </h3>
                    <p
                      className="text-white/80"
                      style={{ fontSize: "12px" }}
                    >
                      {banner.subtitle}
                    </p>
                    <button
                      className="mt-2 bg-white rounded-full px-3 py-1"
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#122a4c",
                      }}
                    >
                      Ver ofertas →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
              onClick={() => navigate("/categories")}
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
            {categories.slice(0, 7).map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate("/categories")}
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

        {/* Ofertas do dia */}
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

        {/* Mais Vendidos */}
        <div className="pt-5 px-4">
          <div className="flex items-center justify-between mb-3">
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

          <div className="flex flex-col gap-3">
            {bestsellers.slice(0, 3).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>

        {/* Banner destacado */}
        <div className="px-4 pt-5">
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{ height: "100px" }}
          >
            <img
              src="https://images.unsplash.com/photo-1774312081005-cab8b6fa0c9b?w=600&q=80"
              alt="Promo"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 flex items-center px-5"
              style={{
                background:
                  "linear-gradient(90deg, rgba(18,42,76,0.94) 0%, rgba(18,42,76,0.35) 100%)",
              }}
            >
              <div>
                <p
                  className="text-white"
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    opacity: 0.8,
                  }}
                >
                  PROMOÇÃO EXCLUSIVA
                </p>
                <p
                  className="text-white"
                  style={{ fontSize: "18px", fontWeight: 800 }}
                >
                  Use PROMO10
                </p>
                <p
                  style={{ fontSize: "12px", color: "#c7d7ee" }}
                >
                  R$10 OFF na sua compra!
                </p>
              </div>
            </div>
          </div>
        </div>

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

        {/* Produtos em destaque */}
        <div className="pt-5 px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
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

          <div className="flex flex-col gap-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}