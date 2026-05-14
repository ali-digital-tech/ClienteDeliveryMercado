import { apiRequest } from '@/shared/lib/api';
import type { CartItem } from '../types/cart';

export interface AppliedCoupon {
  code: string;
  discount: number;
  message?: string;
}

type CouponValidationPayload = {
  codigo: string;
  loja_id: string;
  subtotal: number;
  itens: {
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
  }[];
};

type ApiCouponResponse = {
  success?: boolean;
  message?: string;
  data?: any;
  valid?: boolean;
  valido?: boolean;
  desconto?: string | number | null;
  discount?: string | number | null;
  valor_desconto?: string | number | null;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFirstNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = toNumber(value, Number.NaN);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function normalizeDiscount(payload: any, subtotal: number) {
  const data = payload?.data ?? payload;
  const coupon = data?.cupom ?? data?.coupon ?? data;

  const explicitDiscount = readFirstNumber(
    data?.desconto,
    data?.discount,
    data?.valor_desconto,
    data?.discountAmount,
    coupon?.desconto,
    coupon?.discount,
    coupon?.valor_desconto,
    coupon?.discountAmount
  );

  if (explicitDiscount > 0) {
    return Math.min(explicitDiscount, subtotal);
  }

  const type = String(coupon?.tipo_desconto ?? coupon?.tipo ?? coupon?.discount_type ?? '').toLowerCase();
  const value = readFirstNumber(coupon?.valor, coupon?.value, coupon?.percentual, coupon?.porcentagem);

  if (value <= 0) return 0;
  if (type.includes('percent') || type.includes('porcent')) {
    return Math.min((subtotal * value) / 100, subtotal);
  }

  return Math.min(value, subtotal);
}

function isValidCouponResponse(payload: ApiCouponResponse) {
  const data = payload?.data ?? payload;
  const valid = data?.valid ?? data?.valido ?? data?.isValid ?? payload?.valid ?? payload?.valido;

  return valid !== false && payload?.success !== false;
}

function normalizeCouponResponse(code: string, subtotal: number, payload: ApiCouponResponse): AppliedCoupon {
  if (!isValidCouponResponse(payload)) {
    const message = payload?.data?.message || payload?.message || 'Cupom invalido.';
    throw new Error(message);
  }

  const discount = normalizeDiscount(payload, subtotal);
  const message = payload?.data?.message || payload?.message;

  return {
    code,
    discount,
    message,
  };
}

export async function validateCoupon(
  marketId: string,
  code: string,
  cart: CartItem[],
  subtotal: number
): Promise<AppliedCoupon> {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    throw new Error('Informe um cupom.');
  }

  if (cart.length === 0 || subtotal <= 0) {
    throw new Error('Adicione produtos ao carrinho antes de aplicar o cupom.');
  }

  const payload: CouponValidationPayload = {
    codigo: normalizedCode,
    loja_id: marketId,
    subtotal,
    itens: cart.map(item => ({
      produto_id: item.product.catalogProductId,
      quantidade: item.qty,
      preco_unitario: item.product.price,
    })),
  };

  const response = await apiRequest<ApiCouponResponse>('/cupons/validar', {
    method: 'POST',
    body: payload as any,
  });

  return normalizeCouponResponse(normalizedCode, subtotal, response);
}
