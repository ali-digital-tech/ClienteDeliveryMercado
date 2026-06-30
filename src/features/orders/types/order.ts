import type { CartItemSelection } from '@/features/cart';
import type { Product } from '@/features/products';

export interface OrderItem {
  lineId?: string;
  product: Product;
  qty: number;
  unitPrice?: number;
  totalPrice?: number;
  variationName?: string;
  productStoreVariationId?: string;
  selections?: CartItemSelection[];
  notes?: string;
}

export interface OrderPayment {
  id: string;
  method: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | string;
  status: string;
  statusDetail?: string | null;
  value: number;
  applicationFee?: number;
  gatewayPaymentId?: string | null;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  paymentLink?: string | null;
  expiresAt?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  noChange?: boolean;
  changeFor?: number | null;
  changeValue?: number | null;
  paymentOnDeliveryMethod?: 'dinheiro' | 'cartao' | string | null;
}

export interface OrderCancellationRequest {
  status: 'pendente' | 'aprovada' | 'recusada';
  refundValue?: number | null;
  note?: string | null;
  requestedAt?: string | null;
  resolvedAt?: string | null;
}

export interface OrderRefund {
  id: string;
  paymentId?: string | null;
  value: number;
  reason?: string | null;
  status: string;
  refundedAt?: string | null;
  createdAt?: string | null;
  type?: 'produto_em_falta' | 'outro_motivo' | string | null;
  missingItems?: Array<{
    orderItemId?: string | null;
    productId?: string | null;
    name: string;
    boughtQuantity?: number | null;
    missingQuantity: number;
    unitPrice?: number | null;
    refundValue?: number | null;
  }>;
}

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
  separationAt?: string | null;
  readyAt?: string | null;
  outForDeliveryAt?: string | null;
  canceledAt?: string | null;
  deliveredAt?: string | null;
  receiptKey?: string | null;
  items: OrderItem[];
  itemCount?: number;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  total: number;
  isPaid?: boolean;
  payment?: OrderPayment | null;
  refunds?: OrderRefund[];
  cancellationRequest?: OrderCancellationRequest | null;
  status: 'pendente' | 'recebido' | 'confirmado' | 'separacao' | 'pronto' | 'saiu' | 'entregue' | 'nao_entregue' | 'cancelado';
  backendStatus?: string;
  address: string;
  type: 'delivery' | 'pickup';
  deliveryInfo?: {
    status?: string | null;
    outForDeliveryAt?: string | null;
    deliveredAt?: string | null;
    failedAt?: string | null;
    failureReason?: string | null;
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
