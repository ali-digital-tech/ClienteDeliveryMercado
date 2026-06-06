import { useNavigate } from 'react-router';
import { MapPin, ShoppingCart, Timer } from 'lucide-react';
import { useMarkets } from '@/features/markets';

export function HomePage() {
  const navigate = useNavigate();
  const { markets } = useMarkets();

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
            Escolha seu mercado
          </h1>
          <p className="mt-2 max-w-xl" style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
            Cada mercado possui catálogo, categorias, ofertas e carrinho próprios.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {markets.map(market => (
            <button
              key={market.id}
              onClick={() => navigate(`/mercado/${market.id}`)}
              className="overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-transform active:scale-[0.99]"
              style={{ borderColor: '#e2e8f0' }}
            >
              <div className="relative h-32">
                <img src={market.logo} alt={market.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))' }} />
                <span
                  className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-white"
                  style={{ background: market.status === 'open' ? '#16a34a' : '#64748b', fontSize: '11px', fontWeight: 700 }}
                >
                  {market.status === 'open' ? 'Aberto' : 'Fechado'}
                </span>
                <h2 className="absolute bottom-3 left-3 right-3 text-white" style={{ fontSize: '18px', fontWeight: 800 }}>
                  {market.name}
                </h2>
              </div>

              <div className="p-4">
                <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>{market.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: 'var(--market-primary-soft-color)', color: 'var(--market-primary-color)', fontSize: '11px', fontWeight: 700 }}>
                    <MapPin size={12} />
                    {market.neighborhood}
                  </span>
                  <span className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: '#f0fdf4', color: '#15803d', fontSize: '11px', fontWeight: 700 }}>
                    <Timer size={12} />
                    Por ordem de pedido
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
