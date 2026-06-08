import type { Product } from '@/features/products/types/product';
import type { CartItem } from '../types/cart';

export function toCartQuantityNumber(quantity: number | string) {
  const value = typeof quantity === 'string' ? Number(quantity) : quantity;
  return Number.isFinite(value) ? value : 0;
}

export function isWeightProduct(product?: Pick<Product, 'saleType'> | null) {
  return product?.saleType === 'peso';
}

export function getProductMinQty(product: Pick<Product, 'minQty' | 'saleType'>) {
  return isWeightProduct(product) ? Math.max(0.001, product.minQty || 0.1) : Math.max(1, product.minQty || 1);
}

export function getProductStepQty(product: Pick<Product, 'stepQty' | 'saleType'>) {
  return isWeightProduct(product) ? Math.max(0.001, product.stepQty || 0.1) : Math.max(1, product.stepQty || 1);
}

export function roundCartQuantity(quantity: number) {
  return Number(quantity.toFixed(3));
}

function toScaledQuantity(quantity: number) {
  return Math.round(roundCartQuantity(quantity) * 1000);
}

export function getNextCartQuantity(product: Product, currentQuantity: number, direction: 1 | -1) {
  const step = getProductStepQty(product);
  const minimum = getProductMinQty(product);
  const currentInt = toScaledQuantity(Math.max(0, currentQuantity));
  const minimumInt = toScaledQuantity(minimum);
  const stepInt = toScaledQuantity(step);

  if (stepInt <= 0) return 0;

  if (direction === 1) {
    const stepsFromMinimum = currentInt < minimumInt
      ? 0
      : Math.floor((currentInt - minimumInt) / stepInt) + 1;
    const next = roundCartQuantity((minimumInt + stepsFromMinimum * stepInt) / 1000);

    return isWeightProduct(product) ? next : Math.round(next);
  }

  if (currentInt <= minimumInt) return 0;

  const diffFromMinimum = currentInt - minimumInt;
  const stepsFromMinimum = diffFromMinimum % stepInt === 0
    ? diffFromMinimum / stepInt - 1
    : Math.floor(diffFromMinimum / stepInt);

  if (stepsFromMinimum < 0) return 0;

  const next = roundCartQuantity((minimumInt + stepsFromMinimum * stepInt) / 1000);

  if (next < minimum) return 0;
  return isWeightProduct(product) ? next : Math.round(next);
}

export function getCartLineCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + (isWeightProduct(item.product) ? 1 : item.qty), 0);
}

export function formatCartQuantity(quantity: number | string, product?: Pick<Product, 'saleType'> | null) {
  const value = toCartQuantityNumber(quantity);

  if (isWeightProduct(product)) {
    if (value < 1) return `${Math.round(value * 1000)} g`;
    return `${value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })} kg`;
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}
