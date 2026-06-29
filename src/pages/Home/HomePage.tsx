import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Heart,
  MapPin,
  Search,
  ShoppingBag,
  Store,
  Timer,
  UserRound,
  Utensils,
  Grid2X2,
  Sparkles,
  ChevronRight,
  Package,
} from "lucide-react";
import {
  readFavoriteMarketIds,
  saveFavoriteMarketIds,
  useMarkets,
  type EstablishmentType,
} from "@/features/markets";
import { authService } from "@/features/auth";
import { getAuthToken } from "@/shared/lib/api";
import { getOrdersByMarketId } from "@/features/orders";
import {
  usePlatformBanners,
  type PlatformBanner,
} from "@/features/platformBanners";
import logoTransparent from "@/assets/brand/LogoFavicon.png";

type HomeView = "all" | "favorites" | "orders";

const categories: Array<{
  type: EstablishmentType;
  label: string;
  icon: typeof Store;
  color: string;
}> = [
  { type: "mercado", label: "Mercados", icon: Store, color: "#ef4444" },
  {
    type: "restaurante",
    label: "Restaurantes",
    icon: Utensils,
    color: "#f97316",
  },
  {
    type: "lanchonete",
    label: "Lanchonetes",
    icon: Sparkles,
    color: "#ec4899",
  },
  { type: "hibrido", label: "Diversos", icon: Grid2X2, color: "#7c3aed" },
  { type: "outro", label: "Outros", icon: Package, color: "#0ea5e9" },
];

function firstName(name?: string) {
  return name?.trim().split(/\s+/)[0] || "cliente";
}

function routeForBanner(banner: PlatformBanner) {
  if (banner.destino_tipo === "link_externo") return banner.destino_url || null;
  if (!banner.destino_loja_id) return null;
  if (banner.destino_tipo === "produto" && banner.destino_produto_loja_id)
    return `/mercado/${banner.destino_loja_id}/product/${banner.destino_produto_loja_id}`;
  if (banner.destino_tipo === "rota_loja")
    return `/mercado/${banner.destino_loja_id}/${banner.destino_rota || "home"}`;
  return `/mercado/${banner.destino_loja_id}`;
}

export function HomePage({
  mode = "principal",
}: {
  mode?: "principal" | "teste";
}) {
  const navigate = useNavigate();
  const { markets, isLoading, error } = useMarkets(mode);
  const { banners } = usePlatformBanners();
  const isTestPage = mode === "teste";
  const [favoriteMarketIds, setFavoriteMarketIds] = useState(
    readFavoriteMarketIds,
  );
  const [selectedCategory, setSelectedCategory] =
    useState<EstablishmentType | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<HomeView>("all");
  const [userName, setUserName] = useState(
    () => authService.getStoredUser()?.nome,
  );
  const [orderMarketIds, setOrderMarketIds] = useState<string[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) return;
    authService
      .getCurrentCustomer()
      .then((user) => setUserName(user.nome))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    markets.forEach((market) => {
      if (!market.logo) return;
      const image = new window.Image();
      image.decoding = "async";
      image.src = market.logo;
    });
  }, [markets]);

  useEffect(() => {
    if (view !== "orders" || !getAuthToken()) return;
    let cancelled = false;
    setOrdersLoading(true);
    getOrdersByMarketId("")
      .then((orders) => {
        if (!cancelled)
          setOrderMarketIds([
            ...new Set(orders.map((order) => order.marketId).filter(Boolean)),
          ]);
      })
      .catch(() => {
        if (!cancelled) setOrderMarketIds([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  const visibleMarkets = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
    return markets
      .filter((market) => {
        if (selectedCategory && market.establishmentType !== selectedCategory)
          return false;
        if (view === "favorites" && !favoriteMarketIds.includes(market.id))
          return false;
        if (view === "orders" && !orderMarketIds.includes(market.id))
          return false;
        return (
          !normalizedSearch ||
          `${market.name} ${market.description} ${market.city} ${market.neighborhood}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedSearch)
        );
      })
      .sort(
        (a, b) =>
          Number(favoriteMarketIds.includes(b.id)) -
          Number(favoriteMarketIds.includes(a.id)),
      );
  }, [
    favoriteMarketIds,
    markets,
    orderMarketIds,
    search,
    selectedCategory,
    view,
  ]);

  const toggleFavoriteMarket = (marketId: string) => {
    setFavoriteMarketIds((current) => {
      const next = current.includes(marketId)
        ? current.filter((id) => id !== marketId)
        : [...current, marketId];
      saveFavoriteMarketIds(next);
      return next;
    });
  };

  const openBanner = (banner: PlatformBanner) => {
    const target = routeForBanner(banner);
    if (!target) return;
    if (banner.destino_tipo === "link_externo")
      window.open(target, "_blank", "noopener,noreferrer");
    else navigate(target);
  };

  const contentTitle =
    view === "favorites"
      ? "Lojas favoritas"
      : view === "orders"
        ? "Onde você tem pedidos"
        : selectedCategory
          ? categories.find((item) => item.type === selectedCategory)?.label ||
            "Estabelecimentos"
          : "Estabelecimentos em destaque";

  return (
    <main className="h-full overflow-y-auto bg-[#f8fafc] pb-8">
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:py-10">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center">
                <img
                  src={logoTransparent}
                  alt=""
                  className="h-14 w-14 object-contain"
                />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold uppercase tracking-wide text-slate-500">
                  Entregaí
                </p>
                <p className="truncate text-sm font-semibold text-slate-700">
                  Delivery local, do seu jeito
                </p>
              </div>
            </div>
            <h1
              className="text-slate-950"
              style={{ fontSize: "28px", fontWeight: 800 }}
            >
              Olá, {firstName(userName)}!
            </h1>
            <p className="mt-1 text-slate-500" style={{ fontSize: "16px" }}>
              Onde você deseja comprar hoje?
            </p>
          </div>
          <button
            aria-label="Abrir perfil"
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm"
            onClick={() =>
              navigate(markets[0] ? `/mercado/${markets[0].id}/profile` : "/")
            }
          >
            <UserRound size={21} />
          </button>
        </header>

        <label
          className="mb-6 flex h-13 items-center gap-3 rounded-2xl border bg-white px-4 shadow-sm"
          style={{ borderColor: "#e2e8f0" }}
        >
          <Search size={23} color="#94a3b8" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar estabelecimento"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>

        {!isTestPage && banners.length > 0 && (
          <section className="mb-7" aria-label="Banners da plataforma">
            <div className="flex snap-x gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {banners.map((banner) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => openBanner(banner)}
                  className="relative h-40 min-w-full snap-center overflow-hidden rounded-3xl text-left shadow-sm sm:h-48"
                >
                  <img
                    src={banner.imagem_url}
                    alt={banner.titulo}
                    className="h-full w-full object-cover"
                  />
                  {(banner.titulo || banner.subtitulo || banner.cta_text) && (
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/5 to-transparent p-5 text-white">
                      <h2 className="text-lg font-extrabold">
                        {banner.titulo}
                      </h2>
                      {banner.subtitulo && (
                        <p className="mt-0.5 text-sm text-white/90">
                          {banner.subtitulo}
                        </p>
                      )}
                      {banner.cta_text && (
                        <span className="mt-2 text-xs font-bold">
                          {banner.cta_text} →
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {!isTestPage && (
          <section className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">
                Categorias
              </h2>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-sm font-bold text-red-600"
              >
                Ver todas
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setView("all");
                    setSelectedCategory(
                      selectedCategory === type ? null : type,
                    );
                  }}
                  className="min-w-[76px] text-center"
                >
                  <span
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: `${color}14`, color }}
                  >
                    <Icon size={26} />
                  </span>
                  <span className="mt-2 block text-xs font-semibold text-slate-700">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <nav className="mb-5 flex gap-2" aria-label="Atalhos">
          <button
            type="button"
            onClick={() => {
              setView("all");
              setSelectedCategory(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold ${view === "all" ? "bg-red-600 text-white" : "bg-white text-slate-600 border"}`}
          >
            Início
          </button>
          <button
            type="button"
            onClick={() => setView("favorites")}
            className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold ${view === "favorites" ? "bg-red-600 text-white" : "bg-white text-slate-600 border"}`}
          >
            <Heart size={15} />
            Favoritos
          </button>
          <button
            type="button"
            onClick={() => setView("orders")}
            className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-bold ${view === "orders" ? "bg-red-600 text-white" : "bg-white text-slate-600 border"}`}
          >
            <ShoppingBag size={15} />
            Pedidos
          </button>
        </nav>

        <section>
          <h2 className="mb-4 text-xl font-extrabold text-slate-900">
            {contentTitle}
          </h2>
          {view === "orders" && !getAuthToken() ? (
            <p className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
              Entre na sua conta para escolher o estabelecimento cujos pedidos
              deseja acompanhar.
            </p>
          ) : ordersLoading ? (
            <p className="text-sm text-slate-500">
              Carregando seus estabelecimentos…
            </p>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl bg-slate-200"
                />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-red-200 bg-white p-4 text-sm font-semibold text-red-700">
              Não foi possível carregar os estabelecimentos.
            </p>
          ) : visibleMarkets.length === 0 ? (
            <p className="rounded-2xl border bg-white p-4 text-sm text-slate-600">
              {view === "favorites"
                ? "Você ainda não favoritou nenhuma loja."
                : view === "orders"
                  ? "Não encontramos pedidos em estabelecimentos disponíveis."
                  : "Nenhum estabelecimento encontrado com estes filtros."}
            </p>
          ) : (
            <div className="space-y-4">
              {visibleMarkets.map((market) => {
                const favorite = favoriteMarketIds.includes(market.id);
                return (
                  <article
                    key={market.id}
                    className="relative overflow-hidden rounded-3xl border bg-white p-3 shadow-sm"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          view === "orders"
                            ? `/mercado/${market.id}/orders`
                            : `/mercado/${market.id}`,
                        )
                      }
                      className="flex w-full gap-3 text-left"
                    >
                      <img
                        src={market.logo}
                        alt=""
                        className="h-28 w-28 shrink-0 rounded-2xl object-cover bg-slate-100"
                      />
                      <div className="min-w-0 flex-1 py-1 pr-7">
                        <h3 className="truncate text-lg font-extrabold text-slate-900">
                          {market.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin size={14} />
                          {market.city || market.neighborhood}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {market.status === "open"
                              ? "Aberto agora"
                              : "Pedidos online"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <Timer size={12} />
                            Por ordem de pedido
                          </span>
                        </div>
                        {view === "orders" && (
                          <p className="mt-2 text-xs font-semibold text-red-600">
                            Ver pedidos desta loja
                          </p>
                        )}
                      </div>
                      <ChevronRight className="my-auto text-slate-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavoriteMarket(market.id)}
                      className="absolute right-4 top-4 rounded-full bg-white p-2 shadow-sm"
                      aria-label={
                        favorite
                          ? "Remover dos favoritos"
                          : "Adicionar aos favoritos"
                      }
                    >
                      <Heart
                        size={18}
                        fill={favorite ? "#ef4444" : "none"}
                        color={favorite ? "#ef4444" : "#64748b"}
                      />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function TestMarketsPage() {
  return <HomePage mode="teste" />;
}
