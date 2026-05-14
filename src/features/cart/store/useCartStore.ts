import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { Product } from '@/features/products';
import { validateCoupon } from '../services/couponsService';
import type { CartItem } from '../types/cart';

function clearCouponState(
  marketId: string,
  setCouponByMarket: Dispatch<SetStateAction<Record<string, string>>>,
  setDiscountByMarket: Dispatch<SetStateAction<Record<string, number>>>
) {
  setCouponByMarket(prev => ({ ...prev, [marketId]: '' }));
  setDiscountByMarket(prev => ({ ...prev, [marketId]: 0 }));
}

export function useCartStore(marketId: string) {
  const [cartsByMarket, setCartsByMarket] = useState<Record<string, CartItem[]>>({});
  const [couponByMarket, setCouponByMarket] = useState<Record<string, string>>({});
  const [discountByMarket, setDiscountByMarket] = useState<Record<string, number>>({});

  const cart = cartsByMarket[marketId] || [];
  const coupon = couponByMarket[marketId] || '';
  const discount = discountByMarket[marketId] || 0;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const setCart = useCallback((items: CartItem[]) => {
    setCartsByMarket(prevByMarket => ({
      ...prevByMarket,
      [marketId]: items,
    }));
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket);
  }, [marketId]);

  const addToCart = useCallback((product: Product, remoteItemId?: string, quantity?: number) => {
    if (product.marketId !== marketId) return;

    setCartsByMarket(prevByMarket => {
      const currentCart = prevByMarket[marketId] || [];
      const existing = currentCart.find(item => item.product.id === product.id);

      if (existing) {
        return {
          ...prevByMarket,
          [marketId]: currentCart.map(item =>
            item.product.id === product.id
              ? { ...item, qty: quantity ?? item.qty + 1, remoteItemId: remoteItemId || item.remoteItemId }
              : item
          ),
        };
      }

      return { ...prevByMarket, [marketId]: [...currentCart, { product, qty: quantity ?? 1, remoteItemId }] };
    });
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket);
  }, [marketId]);

  const removeFromCart = useCallback((productId: string) => {
    setCartsByMarket(prevByMarket => ({
      ...prevByMarket,
      [marketId]: (prevByMarket[marketId] || []).filter(item => item.product.id !== productId),
    }));
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket);
  }, [marketId]);

  const updateQty = useCallback((productId: string, qty: number) => {
    setCartsByMarket(prevByMarket => {
      const currentCart = prevByMarket[marketId] || [];

      return {
        ...prevByMarket,
        [marketId]: qty <= 0
          ? currentCart.filter(item => item.product.id !== productId)
          : currentCart.map(item => item.product.id === productId ? { ...item, qty } : item),
      };
    });
    clearCouponState(marketId, setCouponByMarket, setDiscountByMarket);
  }, [marketId]);

  const clearCart = useCallback(() => {
    setCartsByMarket(prev => ({ ...prev, [marketId]: [] }));
    setCouponByMarket(prev => ({ ...prev, [marketId]: '' }));
    setDiscountByMarket(prev => ({ ...prev, [marketId]: 0 }));
  }, [marketId]);

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
