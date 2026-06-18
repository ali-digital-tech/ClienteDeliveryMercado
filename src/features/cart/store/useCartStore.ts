import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { isConfigurableProduct } from '@/features/products';
import type { Product } from '@/features/products';
import { validateCoupon } from '../services/couponsService';
import type { CartItem } from '../types/cart';
import { getCartLineCount, getProductMinQty, roundCartQuantity } from '../utils/formatCartQuantity';

const CART_STORAGE_KEY = 'cliente_delivery_cart_by_market_v1';

interface StoredCartItem {
  lineId?: string;
  productId: string;
  catalogProductId: string;
  qty: number;
  productSnapshot: Product;
  productStoreVariationId?: string;
  variationName?: string;
  selections?: CartItem['selections'];
  notes?: string;
  configurationSignature?: string;
  configurationVersion?: number;
  basePrice?: number;
  optionsPrice?: number;
}

function createLineId(productId: string) {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${productId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function toPositiveQuantity(quantity: unknown) {
  const value = Number(quantity);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function isProductSnapshot(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;

  const product = value as Partial<Product>;
  return (
    typeof product.id === 'string' &&
    typeof product.catalogProductId === 'string' &&
    typeof product.marketId === 'string' &&
    typeof product.name === 'string' &&
    typeof product.price === 'number'
  );
}

function readStoredCarts(): Record<string, StoredCartItem[]> {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).map(([marketId, items]) => [
        marketId,
        Array.isArray(items)
          ? items
              .map((item): StoredCartItem | null => {
                if (!item || typeof item !== 'object') return null;

                const candidate = item as Partial<StoredCartItem>;
                const qty = toPositiveQuantity(candidate.qty);
                if (
                  typeof candidate.productId !== 'string' ||
                  typeof candidate.catalogProductId !== 'string' ||
                  !isProductSnapshot(candidate.productSnapshot) ||
                  qty <= 0
                ) {
                  return null;
                }

                return {
                  lineId: candidate.lineId,
                  productId: candidate.productId,
                  catalogProductId: candidate.catalogProductId,
                  qty,
                  productSnapshot: candidate.productSnapshot,
                  productStoreVariationId: candidate.productStoreVariationId,
                  variationName: candidate.variationName,
                  selections: Array.isArray(candidate.selections) ? candidate.selections : [],
                  notes: candidate.notes,
                  configurationSignature: candidate.configurationSignature,
                  configurationVersion: candidate.configurationVersion,
                  basePrice: candidate.basePrice,
                  optionsPrice: candidate.optionsPrice,
                };
              })
              .filter((item): item is StoredCartItem => item !== null)
          : [],
      ])
    );
  } catch {
    return {};
  }
}

function findCurrentProduct(storedItem: StoredCartItem, products: Product[]) {
  return products.find(
    product =>
      product.id === storedItem.productId ||
      product.catalogProductId === storedItem.catalogProductId
  );
}

function cartItemFromStored(storedItem: StoredCartItem, products: Product[]): CartItem | null {
  const currentProduct = findCurrentProduct(storedItem, products);
  const product = isConfigurableProduct(storedItem.productSnapshot)
    ? storedItem.productSnapshot
    : currentProduct ?? storedItem.productSnapshot;
  const qty = toPositiveQuantity(storedItem.qty);

  if (!isProductSnapshot(product) || qty <= 0) return null;

  return {
    lineId: storedItem.lineId || `simple:${product.id}`,
    product: {
      ...product,
      purchaseMode: product.purchaseMode || 'simples',
      stockMode: product.stockMode || 'quantidade',
      hasVariations: Boolean(product.hasVariations),
    },
    qty,
    productStoreVariationId: storedItem.productStoreVariationId,
    variationName: storedItem.variationName,
    selections: Array.isArray(storedItem.selections) ? storedItem.selections : [],
    notes: storedItem.notes,
    configurationSignature: storedItem.configurationSignature,
    configurationVersion: storedItem.configurationVersion,
    basePrice: storedItem.basePrice,
    optionsPrice: storedItem.optionsPrice,
  };
}

function serializeCartItem(item: CartItem): StoredCartItem | null {
  const qty = toPositiveQuantity(item.qty);
  if (!isProductSnapshot(item.product) || qty <= 0) return null;

  return {
    lineId: item.lineId,
    productId: item.product.id,
    catalogProductId: item.product.catalogProductId,
    qty,
    productSnapshot: item.product,
    productStoreVariationId: item.productStoreVariationId,
    variationName: item.variationName,
    selections: item.selections,
    notes: item.notes,
    configurationSignature: item.configurationSignature,
    configurationVersion: item.configurationVersion,
    basePrice: item.basePrice,
    optionsPrice: item.optionsPrice,
  };
}

function readCartsFromStorage(): Record<string, CartItem[]> {
  const storedCarts = readStoredCarts();

  return Object.fromEntries(
    Object.entries(storedCarts).map(([marketId, items]) => [
      marketId,
      items
        .map(item => cartItemFromStored(item, []))
        .filter((item): item is CartItem => item !== null),
    ])
  );
}

function saveCartsToStorage(cartsByMarket: Record<string, CartItem[]>) {
  const serialized = Object.fromEntries(
    Object.entries(cartsByMarket).map(([marketId, items]) => [
      marketId,
      items
        .map(serializeCartItem)
        .filter((item): item is StoredCartItem => item !== null),
    ])
  );

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serialized));
}

function reconcileCart(cart: CartItem[], products: Product[]) {
  if (products.length === 0) return cart;

  return cart
    .map((item): CartItem | null => {
      const qty = toPositiveQuantity(item.qty);
      const product = isConfigurableProduct(item.product)
        ? item.product
        : products.find(candidate =>
          candidate.id === item.product.id ||
          candidate.catalogProductId === item.product.catalogProductId
        ) ?? item.product;

      if (!isProductSnapshot(product) || qty <= 0) return null;

      return { ...item, product, qty };
    })
    .filter((item): item is CartItem => item !== null);
}

function clearCouponState(
  marketId: string,
  setCouponByMarket: Dispatch<SetStateAction<Record<string, string>>>,
  setDiscountByMarket: Dispatch<SetStateAction<Record<string, number>>>,
  setCouponIdByMarket: Dispatch<SetStateAction<Record<string, string>>>
) {
  setCouponByMarket(prev => ({ ...prev, [marketId]: '' }));
  setDiscountByMarket(prev => ({ ...prev, [marketId]: 0 }));
  setCouponIdByMarket(prev => ({ ...prev, [marketId]: '' }));
}

export function useCartStore(marketId: string, products: Product[] = []) {
  const [cartsByMarket, setCartsByMarket] = useState<Record<string, CartItem[]>>(() => readCartsFromStorage());
  const [couponByMarket, setCouponByMarket] = useState<Record<string, string>>({});
  const [discountByMarket, setDiscountByMarket] = useState<Record<string, number>>({});
  const [couponIdByMarket, setCouponIdByMarket] = useState<Record<string, string>>({});

  const cart = cartsByMarket[marketId] || [];
  const coupon = couponByMarket[marketId] || '';
  const couponId = couponIdByMarket[marketId] || '';
  const discount = discountByMarket[marketId] || 0;
  const cartCount = getCartLineCount(cart);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const updateCartsByMarket = useCallback((updater: (prev: Record<string, CartItem[]>) => Record<string, CartItem[]>) => {
    setCartsByMarket(prev => {
      const next = updater(prev);
      saveCartsToStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (products.length === 0) return;

    updateCartsByMarket(prevByMarket => {
      const currentCart = prevByMarket[marketId] || [];
      const reconciled = reconcileCart(currentCart, products);

      return {
        ...prevByMarket,
        [marketId]: reconciled,
      };
    });
  }, [marketId, products, updateCartsByMarket]);

  const setCart = useCallback((items: CartItem[]) => {
    updateCartsByMarket(prevByMarket => ({
      ...prevByMarket,
      [marketId]: items,
    }));
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket, setCouponIdByMarket);
  }, [marketId, updateCartsByMarket]);

  const addToCart = useCallback((product: Product, quantity?: number) => {
    if (product.marketId !== marketId) return;

    updateCartsByMarket(prevByMarket => {
      const currentCart = prevByMarket[marketId] || [];
      const existing = currentCart.find(item =>
        !isConfigurableProduct(item.product) && item.product.id === product.id
      );
      const quantityToAdd = roundCartQuantity(toPositiveQuantity(quantity) || getProductMinQty(product));

      if (existing) {
        return {
          ...prevByMarket,
          [marketId]: currentCart.map(item =>
            item.lineId === existing.lineId
              ? { ...item, product, qty: roundCartQuantity(item.qty + quantityToAdd) }
              : item
          ),
        };
      }

      return {
        ...prevByMarket,
        [marketId]: [...currentCart, {
          lineId: `simple:${product.id}`,
          product,
          qty: quantityToAdd,
          selections: [],
        }],
      };
    });
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket, setCouponIdByMarket);
  }, [marketId, updateCartsByMarket]);

  const removeFromCart = useCallback((lineIdOrProductId: string) => {
    updateCartsByMarket(prevByMarket => ({
      ...prevByMarket,
        [marketId]: (prevByMarket[marketId] || []).filter(item =>
          item.lineId !== lineIdOrProductId
        && !(!isConfigurableProduct(item.product) && item.product.id === lineIdOrProductId)
        ),
    }));
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket, setCouponIdByMarket);
  }, [marketId, updateCartsByMarket]);

  const updateQty = useCallback((lineIdOrProductId: string, qty: number) => {
    updateCartsByMarket(prevByMarket => {
      const currentCart = prevByMarket[marketId] || [];
      const nextQuantity = toPositiveQuantity(qty);

      return {
        ...prevByMarket,
        [marketId]: nextQuantity <= 0
          ? currentCart.filter(item =>
              item.lineId !== lineIdOrProductId
              && !(!isConfigurableProduct(item.product) && item.product.id === lineIdOrProductId)
            )
          : currentCart.map(item =>
              item.lineId === lineIdOrProductId
              || (!isConfigurableProduct(item.product) && item.product.id === lineIdOrProductId)
                ? { ...item, qty: roundCartQuantity(nextQuantity) }
                : item
            ),
      };
    });
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket, setCouponIdByMarket);
  }, [marketId, updateCartsByMarket]);

  const addConfiguredItem = useCallback((item: Omit<CartItem, 'lineId'> & { lineId?: string }) => {
    if (item.product.marketId !== marketId || !isConfigurableProduct(item.product)) return;
    const configuredItem: CartItem = {
      ...item,
      lineId: item.lineId || createLineId(item.product.id),
      selections: item.selections || [],
    };
    updateCartsByMarket(prevByMarket => ({
      ...prevByMarket,
      [marketId]: [...(prevByMarket[marketId] || []), configuredItem],
    }));
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket, setCouponIdByMarket);
  }, [marketId, updateCartsByMarket]);

  const updateConfiguredItem = useCallback((lineId: string, item: Omit<CartItem, 'lineId'>) => {
    updateCartsByMarket(prevByMarket => ({
      ...prevByMarket,
      [marketId]: (prevByMarket[marketId] || []).map(current =>
        current.lineId === lineId ? { ...item, lineId, selections: item.selections || [] } : current
      ),
    }));
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket, setCouponIdByMarket);
  }, [marketId, updateCartsByMarket]);

  const clearCart = useCallback(() => {
    updateCartsByMarket(prev => ({ ...prev, [marketId]: [] }));
    setCouponByMarket(prev => ({ ...prev, [marketId]: '' }));
    setDiscountByMarket(prev => ({ ...prev, [marketId]: 0 }));
    setCouponIdByMarket(prev => ({ ...prev, [marketId]: '' }));
  }, [marketId, updateCartsByMarket]);

  const applyCoupon = useCallback(async (code: string) => {
    const appliedCoupon = await validateCoupon(marketId, code, cart, cartTotal);

    setCouponByMarket(prev => ({ ...prev, [marketId]: appliedCoupon.code }));
    setDiscountByMarket(prev => ({ ...prev, [marketId]: appliedCoupon.discount }));
    setCouponIdByMarket(prev => ({ ...prev, [marketId]: appliedCoupon.id || '' }));

    return appliedCoupon;
  }, [cart, cartTotal, marketId]);

  return {
    cart,
    coupon,
    couponId,
    discount,
    cartCount,
    cartTotal,
    addToCart,
    addConfiguredItem,
    updateConfiguredItem,
    setCart,
    removeFromCart,
    updateQty,
    clearCart,
    applyCoupon,
  };
}
