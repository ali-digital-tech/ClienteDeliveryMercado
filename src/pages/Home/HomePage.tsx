import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Heart, MapPin, ShoppingCart, Timer } from 'lucide-react';
import {
  ALL_CITIES_VALUE,
  readFavoriteMarketIds,
  readSelectedMarketCity,
  saveFavoriteMarketIds,
  saveSelectedMarketCity,
  useMarkets,
} from '@/features/markets';

export function HomePage({ mode = 'principal' }: { mode?: 'principal' | 'teste' }) {
  const navigate = useNavigate();
  const { markets, isLoading, error } = useMarkets(mode);
  const isTestPage = mode === 'teste';
  const [selectedCity, setSelectedCity] = useState(readSelectedMarketCity);
  const [favoriteMarketIds, setFavoriteMarketIds] = useState(readFavoriteMarketIds);

  const cities = useMemo(() => {
    const uniqueCities = new Map<string, string>();

    markets.forEach((market) => {
      market.cities.forEach((city) => {
        const normalizedCity = city.trim();
        if (normalizedCity) uniqueCities.set(normalizedCity.toLocaleLowerCase('pt-BR'), normalizedCity);
      });
    });

    return [...uniqueCities.values()].sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }, [markets]);

  const activeCity = useMemo(() => {
    if (isTestPage || selectedCity === ALL_CITIES_VALUE) return ALL_CITIES_VALUE;

    return cities.find((city) => city.localeCompare(selectedCity, 'pt-BR', { sensitivity: 'accent' }) === 0)
      || ALL_CITIES_VALUE;
  }, [cities, isTestPage, selectedCity]);

  const visibleMarkets = useMemo(() => {
    const favoriteIds = new Set(favoriteMarketIds);
    const matchesCity = (marketCities: string[]) => (
      activeCity === ALL_CITIES_VALUE
      || marketCities.some((city) => city.localeCompare(activeCity, 'pt-BR', { sensitivity: 'accent' }) === 0)
    );

    return markets
      .filter((market) => matchesCity(market.cities))
      .sort((first, second) => Number(favoriteIds.has(second.id)) - Number(favoriteIds.has(first.id)));
  }, [activeCity, favoriteMarketIds, markets]);

  useEffect(() => {
    if (!isTestPage && !isLoading && activeCity !== selectedCity) {
      setSelectedCity(ALL_CITIES_VALUE);
      saveSelectedMarketCity(ALL_CITIES_VALUE);
    }
  }, [activeCity, isLoading, isTestPage, selectedCity]);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    saveSelectedMarketCity(city);
  };

  const toggleFavoriteMarket = (marketId: string) => {
    setFavoriteMarketIds((currentIds) => {
      const nextIds = currentIds.includes(marketId)
        ? currentIds.filter((id) => id !== marketId)
        : [...currentIds, marketId];

      saveFavoriteMarketIds(nextIds);
      return nextIds;
    });
  };

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: '#f8fafc' }}>
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-10 md:py-14">
        <div className="mb-8">
          <div
            className="mb-4 flex items-center justify-center rounded-2xl"
            style={{ width: '48px', height: '48px', background: 'var(--market-primary-color)' }}
          >
            <ShoppingCart size={24} color="white" />
          </div>
          <h1 style={{ color: 'var(--market-primary-color)', fontSize: '28px', fontWeight: 800, lineHeight: 1.1 }}>
            {isTestPage ? 'Lojas de teste' : 'Escolha seu estabelecimento'}
          </h1>
          <p className="mt-2 max-w-xl" style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            {isTestPage
              ? 'Ambiente destinado a validação. Cada loja mantém catálogo, categorias, ofertas e carrinho próprios.'
              : 'Cada estabelecimento possui catálogo, categorias, ofertas e carrinho próprios.'}
          </p>

          {!isTestPage && !isLoading && !error && cities.length > 0 && (
            <label className="mt-5 block max-w-xs" style={{ color: '#334155', fontSize: '13px', fontWeight: 700 }}>
              Cidade
              <select
                value={activeCity}
                onChange={(event) => handleCityChange(event.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 outline-none transition focus:ring-2"
                style={{ borderColor: '#cbd5e1', color: '#334155' }}
                aria-label="Filtrar lojas por cidade"
              >
                <option value={ALL_CITIES_VALUE}>Todas as cidades</option>
                {cities.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
              <span className="mt-1.5 block" style={{ color: '#64748b', fontSize: '12px', fontWeight: 400 }}>
                Lojas favoritas aparecem primeiro e ficam salvas neste dispositivo.
              </span>
            </label>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2" aria-label="Carregando estabelecimentos">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                style={{ borderColor: '#e2e8f0' }}
              >
                <div className="h-32 animate-pulse bg-slate-200" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-6 w-24 animate-pulse rounded-full bg-slate-100" />
                    <div className="h-6 w-32 animate-pulse rounded-full bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: '#fecaca' }}>
            <p style={{ color: '#991b1b', fontSize: '14px', fontWeight: 700 }}>
              Não foi possível carregar {isTestPage ? 'as lojas de teste' : 'os estabelecimentos ativos'}.
            </p>
            <p className="mt-1" style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
              Atualize a página ou tente novamente em alguns instantes.
            </p>
          </div>
        ) : markets.length === 0 ? (
          <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <p style={{ color: '#334155', fontSize: '14px', fontWeight: 700 }}>
              {isTestPage ? 'Nenhuma loja de teste encontrada.' : 'Nenhum estabelecimento ativo encontrado.'}
            </p>
          </div>
        ) : visibleMarkets.length === 0 ? (
          <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: '#e2e8f0' }}>
            <p style={{ color: '#334155', fontSize: '14px', fontWeight: 700 }}>
              Nenhum estabelecimento encontrado nesta cidade.
            </p>
            <p className="mt-1" style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
              Escolha outra cidade para ver mais opções.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleMarkets.map((market) => {
              const favorite = favoriteMarketIds.includes(market.id);
              const locationLabel = market.city && market.city !== market.neighborhood
                ? `${market.neighborhood} · ${market.city}`
                : market.neighborhood;

              return (
                <div
                  key={market.id}
                  className="relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/mercado/${market.id}`)}
                    className="w-full text-left transition-transform active:scale-[0.99]"
                    aria-label={`Abrir ${market.name}`}
                  >
                    <div className="relative h-32">
                      <img src={market.logo} alt={market.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))' }} />
                      {market.status === 'closed' && (
                        <span
                          className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-white"
                          style={{ background: '#64748b', fontSize: '11px', fontWeight: 700 }}
                        >
                          Aberto apenas para pedidos online
                        </span>
                      )}
                      <h2 className="absolute bottom-3 left-3 right-3 text-white" style={{ fontSize: '18px', fontWeight: 800 }}>
                        {market.name}
                      </h2>
                    </div>

                    <div className="p-4">
                      <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>{market.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: 'var(--market-primary-soft-color)', color: 'var(--market-primary-color)', fontSize: '11px', fontWeight: 700 }}>
                          <MapPin size={12} />
                          {locationLabel}
                        </span>
                        <span className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: '#f0fdf4', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>
                          <Timer size={12} />
                          Por ordem de pedido
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavoriteMarket(market.id)}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-transform active:scale-90"
                    style={{ borderColor: favorite ? '#fca5a5' : '#e2e8f0' }}
                    aria-label={favorite ? `Remover ${market.name} das favoritas` : `Adicionar ${market.name} às favoritas`}
                    aria-pressed={favorite}
                  >
                    <Heart size={17} fill={favorite ? '#ef4444' : 'none'} color={favorite ? '#ef4444' : '#475569'} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function TestMarketsPage() {
  return <HomePage mode="teste" />;
}
