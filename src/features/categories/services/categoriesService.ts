import { apiRequest, unwrapList } from '@/shared/lib/api';
import type { Category } from '../types/category';

interface ApiCategory {
  id: string;
  nome?: string;
  slug?: string | null;
  emoji?: string | null;
  ativa?: boolean | null;
  categoria_pai_id?: string | null;
  nivel?: number | null;
  ordem_exibicao?: number | null;
  caminho?: string | null;
}

const categoryColors = [
  { color: '#16a34a', bgColor: '#f0fdf4' },
  { color: '#2563eb', bgColor: '#eff6ff' },
  { color: '#d97706', bgColor: '#fffbeb' },
  { color: '#7c3aed', bgColor: '#f5f3ff' },
  { color: '#0891b2', bgColor: '#ecfeff' },
  { color: '#db2777', bgColor: '#fdf2f8' },
];

function mapCategory(category: ApiCategory, marketId: string, index: number): Category {
  const palette = categoryColors[index % categoryColors.length];

  return {
    id: category.id,
    marketId,
    name: category.nome || 'Categoria',
    emoji: category.emoji || '🛒',
    color: palette.color,
    bgColor: palette.bgColor,
    slug: category.slug,
    parentId: category.categoria_pai_id || null,
    level: category.nivel || 1,
    order: category.ordem_exibicao || 0,
    path: category.caminho || category.nome || 'Categoria',
  };
}

export async function getCategoriesByMarketId(marketId: string): Promise<Category[]> {
  if (!marketId) return [];

  const response = await apiRequest(`/lojas/${marketId}/categorias`, {
    params: {
      ativa: true,
      per_page: 100,
    },
  });

  return unwrapList<ApiCategory>(response)
    .filter(category => category.ativa !== false)
    .sort((a, b) => (a.nivel || 1) - (b.nivel || 1) || (a.ordem_exibicao || 0) - (b.ordem_exibicao || 0) || (a.nome || '').localeCompare(b.nome || ''))
    .map((category, index) => mapCategory(category, marketId, index));
}
