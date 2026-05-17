export interface Category {
  id: string;
  marketId: string;
  name: string;
  emoji: string;
  color: string;
  bgColor: string;
  slug?: string | null;
  parentId?: string | null;
  level: number;
  order: number;
  path?: string;
  productCount?: number;
}
