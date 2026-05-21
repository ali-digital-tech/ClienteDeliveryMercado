import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { Product } from '@/features/products';
import { validateCoupon } from '../services/couponsService';
import type { CartItem } from '../types/cart';

const CART_STORAGE_KEY = 'cliente_delivery_cart_by_market_v1';

interface StoredCartItem {
  productId: string;
  catalogProductId: string;
  qty: number;
  productSnapshot: Product;
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
                  productId: candidate.productId,
                  catalogProductId: candidate.catalogProductId,
                  qty,
                  productSnapshot: candidate.productSnapshot,
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
  const product = findCurrentProduct(storedItem, products) ?? storedItem.productSnapshot;
  const qty = toPositiveQuantity(storedItem.qty);

  if (!isProductSnapshot(product) || qty <= 0) return null;

  return { product, qty };
}

function serializeCartItem(item: CartItem): StoredCartItem | null {
  const qty = toPositiveQuantity(item.qty);
  if (!isProductSnapshot(item.product) || qty <= 0) return null;

  return {
    productId: item.product.id,
    catalogProductId: item.product.catalogProductId,
    qty,
    productSnapshot: item.product,
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
      const product =
        products.find(candidate =>
          candidate.id === item.product.id ||
          candidate.catalogProductId === item.product.catalogProductId
        ) ?? item.product;

      if (!isProductSnapshot(product) || qty <= 0) return null;

      return { product, qty };
    })
    .filter((item): item is CartItem => item !== null);
}

function clearCouponState(
  marketId: string,
  setCouponByMarket: Dispatch<SetStateAction<Record<string, string>>>,
  setDiscountByMarket: Dispatch<SetStateAction<Record<string, number>>>
) {
  setCouponByMarket(prev => ({ ...prev, [marketId]: '' }));
  setDiscountByMarket(prev => ({ ...prev, [marketId]: 0 }));
}

export function useCartStore(marketId: string, products: Product[] = []) {
  const [cartsByMarket, setCartsByMarket] = useState<Record<string, CartItem[]>>(() => readCartsFromStorage());
  const [couponByMarket, setCouponByMarket] = useState<Record<string, string>>({});
  const [discountByMarket, setDiscountByMarket] = useState<Record<string, number>>({});

  const cart = cartsByMarket[marketId] || [];
  const coupon = couponByMarket[marketId] || '';
  const discount = discountByMarket[marketId] || 0;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
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
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket);
  }, [marketId, updateCartsByMarket]);

  const addToCart = useCallback((product: Product, quantity?: number) => {
    if (product.marketId !== marketId) return;

    updateCartsByMarket(prevByMarket => {
      const currentCart = prevByMarket[marketId] || [];
      const existing = currentCart.find(item => item.product.id === product.id);
      const quantityToAdd = toPositiveQuantity(quantity) || 1;

      if (existing) {
        return {
          ...prevByMarket,
          [marketId]: currentCart.map(item =>
            item.product.id === product.id
              ? { ...item, product, qty: item.qty + quantityToAdd }
              : item
          ),
        };
      }

      return { ...prevByMarket, [marketId]: [...currentCart, { product, qty: quantityToAdd }] };
    });
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket);
  }, [marketId, updateCartsByMarket]);

  const removeFromCart = useCallback((productId: string) => {
    updateCartsByMarket(prevByMarket => ({
      ...prevByMarket,
      [marketId]: (prevByMarket[marketId] || []).filter(item => item.product.id !== productId),
    }));
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket);
  }, [marketId, updateCartsByMarket]);

  const updateQty = useCallback((productId: string, qty: number) => {
    updateCartsByMarket(prevByMarket => {
      const currentCart = prevByMarket[marketId] || [];
      const nextQuantity = toPositiveQuantity(qty);

      return {
        ...prevByMarket,
        [marketId]: nextQuantity <= 0
          ? currentCart.filter(item => item.product.id !== productId)
          : currentCart.map(item => item.product.id === productId ? { ...item, qty: nextQuantity } : item),
      };
    });
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket);
  }, [marketId, updateCartsByMarket]);

  const clearCart = useCallback(() => {
    updateCartsByMarket(prev => ({ ...prev, [marketId]: [] }));
    setCouponByMarket(prev => ({ ...prev, [marketId]: '' }));
    setDiscountByMarket(prev => ({ ...prev, [marketId]: 0 }));
  }, [marketId, updateCartsByMarket]);

  const applyCoupon = useCallback(async (code: string) => {
    const appliedCoupon = await validateCoupon(marketId, code, cart, cartTotal);

    setCouponByMarket(prev => ({ ...prev, [marketId]: appliedCoupon.code }));
    setDiscountByMarket(prev => ({ ...prev, [marketId]: appliedCoupon.discount }));

    return appliedCoupon;
  }, [cart, cartTotal, marketId]);

  return {
    cart,
    coupon,
    discount,
    cartCount,
    cartTotal,
    addToCart,
    setCart,
    removeFromCart,
    updateQty,
    clearCart,
    applyCoupon,
  };
}
