import type { Product } from '@/features/products';

export interface Order {
  id: string;
  marketId: string;
  date: string;
  items: { product: Product; qty: number }[];
  total: number;
  status: 'recebido' | 'confirmado' | 'separacao' | 'saiu' | 'entregue';
  address: string;
  type: 'delivery' | 'pickup';
}
