import { apiRequest } from '@/shared/lib/api';
import type { EstablishmentType, Market } from '../types/market';
import { getEstablishmentLabels } from '../utils/establishmentLabels';

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
  endereco_rua?: string | null;
  endereco_numero?: string | number | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  endereco_cep?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status?: string | null;
  aberta_agora?: boolean | null;
  cidades_atendidas?: string[] | null;
  logo_url?: string | null;
  valor_minimo_pedido?: string | number | null;
  taxa_entrega_padrao?: string | number | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  telefone?: string | null;
  email?: string | null;
  horario_abertura?: string | null;
  horario_fechamento?: string | null;
  tipo_estabelecimento?: EstablishmentType | null;
  cardapio_configuravel_ativo?: boolean | null;
  formas_pagamento?: string[] | null;
}

interface ApiStoreConfig {
  whatsapp_suporte?: string | null;
  formas_pagamento?: string[] | null;
}

export type MarketListMode = 'principal' | 'teste';

interface ApiStorePage {
  data?: ApiStore[];
  total_pages?: number;
}

const fallbackLogo = 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80';

function toNumber(value: string | number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unwrapData<T>(payload: any): T {
  return (payload?.data || payload || {}) as T;
}

function unwrapStorePage(payload: unknown) {
  const response = payload as { data?: ApiStorePage | ApiStore[] };
  const data = response?.data;

  if (Array.isArray(data)) {
    return { stores: data, totalPages: 1 };
  }

  return {
    stores: Array.isArray(data?.data) ? data.data : [],
    totalPages: Math.max(1, Number(data?.total_pages) || 1),
  };
}

function resolveEstablishmentType(store: ApiStore): EstablishmentType {
  if (store.tipo_estabelecimento) return store.tipo_estabelecimento;

  const searchableText = `${store.nome || ''} ${store.descricao || ''}`.toLowerCase();
  if (/lanchonete|hamburguer|burger|pizza|pastel|salgado/.test(searchableText)) return 'lanchonete';
  if (/restaurante|marmita|almoco|almoço|jantar|prato/.test(searchableText)) return 'restaurante';

  return 'mercado';
}

function normalizePaymentMethod(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function normalizeCities(store: ApiStore) {
  const cities = Array.isArray(store.cidades_atendidas)
    ? store.cidades_atendidas
    : [];
  const uniqueCities = new Map<string, string>();

  [...cities, store.cidade].forEach((city) => {
    if (typeof city !== 'string' || !city.trim()) return;
    const normalizedCity = city.trim();
    uniqueCities.set(normalizedCity.toLocaleLowerCase('pt-BR'), normalizedCity);
  });

  return [...uniqueCities.values()];
}

function formatStoreAddress(store: ApiStore) {
  const street = store.endereco_rua || store.endereco || store.rua || store.logradouro;
  const number = store.endereco_numero ?? store.numero;
  const neighborhood = store.endereco_bairro || store.bairro;
  const city = store.endereco_cidade || store.cidade;
  const state = store.endereco_estado || store.estado;

  return [
    [street, number].filter(Boolean).join(', '),
    store.endereco_complemento,
    neighborhood,
    [city, state].filter(Boolean).join(' - '),
    store.endereco_cep,
  ].filter(Boolean).join(' - ');
}

function mapStoreToMarket(store: ApiStore, config: ApiStoreConfig = {}): Market {
  const address = formatStoreAddress(store);
  const establishmentType = resolveEstablishmentType(store);
  const labels = getEstablishmentLabels(establishmentType);
  const cities = normalizeCities(store);
  const latitude = toNumber(store.latitude, Number.NaN);
  const longitude = toNumber(store.longitude, Number.NaN);
  const paymentMethods = Array.isArray(store.formas_pagamento)
    ? store.formas_pagamento
    : Array.isArray(config.formas_pagamento)
      ? config.formas_pagamento
      : [];

  return {
    id: store.id,
    name: store.nome || labels.singularCapitalized,
    description: store.descricao || `${labels.singularCapitalized} com entrega de produtos selecionados.`,
    establishmentType,
    configurableMenuEnabled: store.cardapio_configuravel_ativo === true,
    digitalLabel: labels.digital,
    neighborhood: store.endereco_bairro || store.bairro || cities[0] || 'Sua regiao',
    city: store.endereco_cidade?.trim() || store.cidade?.trim() || cities[0] || '',
    cities,
    address: address || store.endereco_bairro || store.bairro || store.endereco_cidade || store.cidade || 'Endereco da loja nao informado',
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    deliveryEstimate: '',
    minimumOrder: toNumber(store.valor_minimo_pedido),
    // The fee is resolved from the selected delivery area during checkout.
    deliveryFee: 0,
    status: store.aberta_agora === false ? 'closed' : 'open',
    logo: store.logo_url || fallbackLogo,
    primaryColor: store.cor_primaria || '#122a4c',
    secondaryColor: store.cor_secundaria || '#16a34a',
    phone: store.telefone || null,
    whatsappSupport: config.whatsapp_suporte || null,
    email: store.email || null,
    openingTime: store.horario_abertura || null,
    closingTime: store.horario_fechamento || null,
    paymentMethods,
    acceptsCash: paymentMethods.some((method) => normalizePaymentMethod(method) === 'dinheiro'),
  };
}

export async function getMarkets(mode: MarketListMode = 'principal'): Promise<Market[]> {
  const stores: ApiStore[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await apiRequest('/lojas', {
      cache: 'no-store',
      params: {
        status: 'ativa',
        visibilidade: mode,
        page,
        per_page: 100,
        _fresh: Date.now(),
      },
    });
    const storePage = unwrapStorePage(response);
    stores.push(...storePage.stores);
    totalPages = storePage.totalPages;
    page += 1;
  } while (page <= totalPages);

  return stores.map((store) => mapStoreToMarket(store));
}

export async function getMarketById(marketId: string): Promise<Market | null> {
  if (!marketId) return null;

  const [storeResult, configResult] = await Promise.allSettled([
    apiRequest<{ data: ApiStore }>(`/lojas/${marketId}`, {
      cache: 'no-store',
      params: { _fresh: Date.now() },
    }),
    apiRequest<{ data: ApiStoreConfig }>(`/lojas/${marketId}/configuracoes`, {
      cache: 'no-store',
      params: { _fresh: Date.now() },
    }),
  ]);

  if (storeResult.status !== 'fulfilled') {
    throw storeResult.reason;
  }

  const store = unwrapData<ApiStore>(storeResult.value);
  const config = configResult.status === 'fulfilled'
    ? unwrapData<ApiStoreConfig>(configResult.value)
    : {};

  return store.id ? mapStoreToMarket(store, config) : null;
}
