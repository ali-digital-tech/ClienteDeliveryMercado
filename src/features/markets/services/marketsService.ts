import { apiRequest, unwrapList } from '@/shared/lib/api';
import type { Market } from '../types/market';

interface ApiStore {
  id: string;
  nome?: string;
  descricao?: string | null;
  endereco?: string | null;
  rua?: string | null;
  logradouro?: string | null;
  numero?: string | number | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  status?: string | null;
  logo_url?: string | null;
  valor_minimo_pedido?: string | number | null;
  taxa_entrega_padrao?: string | number | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
}

const fallbackLogo = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80';

function toNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapStoreToMarket(store: ApiStore): Market {
  const street = store.endereco || store.rua || store.logradouro;
  const address = [
    [street, store.numero].filter(Boolean).join(', '),
    store.bairro,
    [store.cidade, store.estado].filter(Boolean).join(' - '),
  ].filter(Boolean).join(' · ');

  return {
    id: store.id,
    name: store.nome || 'Mercado',
    description: store.descricao || 'Mercado com entrega de produtos selecionados.',
    neighborhood: store.bairro || store.cidade || 'Sua região',
    address: address || store.bairro || store.cidade || 'Endereco da loja nao informado',
    deliveryEstimate: '35-50 min',
    minimumOrder: toNumber(store.valor_minimo_pedido),
    deliveryFee: toNumber(store.taxa_entrega_padrao),
    status: store.status === 'ativa' ? 'open' : 'closed',
    logo: store.logo_url || fallbackLogo,
    primaryColor: store.cor_primaria || '#122a4c',
    secondaryColor: store.cor_secundaria || '#16a34a',
  };
}

export async function getMarkets(): Promise<Market[]> {
  const response = await apiRequest('/lojas', {
    params: {
      status: 'ativa',
      per_page: 100,
    },
  });

  return unwrapList<ApiStore>(response).map(mapStoreToMarket);
}

export async function getMarketById(marketId: string): Promise<Market | null> {
  if (!marketId) return null;

  const response = await apiRequest<{ data: ApiStore }>(`/lojas/${marketId}`);
  return response.data ? mapStoreToMarket(response.data) : null;
}
