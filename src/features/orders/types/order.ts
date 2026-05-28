import type { Product } from '@/features/products';

export interface Order {
  id: string;
  rawId?: string;
  number?: string;
  marketId: string;
  cartId?: string;
  date: string;
  createdAt?: string | null;
  scheduledFor?: string | null;
  confirmedAt?: string | null;
  canceledAt?: string | null;
  deliveredAt?: string | null;
  items: { product: Product; qty: number }[];
  itemCount?: number;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  total: number;
  status: 'pendente' | 'recebido' | 'confirmado' | 'separacao' | 'pronto' | 'saiu' | 'entregue' | 'cancelado';
  backendStatus?: string;
  address: string;
  type: 'delivery' | 'pickup';
  deliveryInfo?: {
    status?: string | null;
    driver?: {
      id?: string;
      name?: string | null;
      phone?: string | null;
    } | null;
    vehicle?: {
      id?: string;
      type?: string | null;
      brand?: string | null;
      model?: string | null;
      plate?: string | null;
      color?: string | null;
      year?: number | null;
    } | null;
  } | null;
  cpfNaNota?: boolean;
  cpfNaNotaCpf?: string | null;
  source?: string | null;
  notes?: string | null;
}
