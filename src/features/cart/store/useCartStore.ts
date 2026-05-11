import { useCallback, useState } from 'react';
import type { Product } from '@/features/products';
import type { CartItem } from '../types/cart';

export function useCartStore(marketId: string) {
  const [cartsByMarket, setCartsByMarket] = useState<Record<string, CartItem[]>>({});
  const [couponByMarket, setCouponByMarket] = useState<Record<string, string>>({});
  const [discountByMarket, setDiscountByMarket] = useState<Record<string, number>>({});

  const cart = cartsByMarket[marketId] || [];
  const coupon = couponByMarket[marketId] || '';
  const discount = discountByMarket[marketId] || 0;
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const addToCart = useCallback((product: Product) => {
    if (product.marketId !== marketId) return;

    setCartsByMarket(prevByMarket => {
      const currentCart = prevByMarket[marketId] || [];
      const existing = currentCart.find(item => item.product.id === product.id);

      if (existing) {
        return {
          ...prevByMarket,
          [marketId]: currentCart.map(item =>
            item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
          ),
        };
      }

      return { ...prevByMarket, [marketId]: [...currentCart, { product, qty: 1 }] };
    });
  }, [marketId]);

  const removeFromCart = useCallback((productId: string) => {
    setCartsByMarket(prevByMarket => ({
      ...prevByMarket,
      [marketId]: (prevByMarket[marketId] || []).filter(item => item.product.id !== productId),
    }));
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
  }, [marketId]);

  const clearCart = useCallback(() => {
    setCartsByMarket(prev => ({ ...prev, [marketId]: [] }));
    setCouponByMarket(prev => ({ ...prev, [marketId]: '' }));
    setDiscountByMarket(prev => ({ ...prev, [marketId]: 0 }));
  }, [marketId]);

  const applyCoupon = useCallback((code: string) => {
    const normalizedCode = code.toUpperCase();

    if (normalizedCode === 'PROMO10') {
      setCouponByMarket(prev => ({ ...prev, [marketId]: code }));
      setDiscountByMarket(prev => ({ ...prev, [marketId]: 10 }));
      return true;
    }

    if (normalizedCode === 'FRETE0') {
      setCouponByMarket(prev => ({ ...prev, [marketId]: code }));
      setDiscountByMarket(prev => ({ ...prev, [marketId]: 0 }));
      return true;
    }

    return false;
  }, [marketId]);

  return {
    cart,
    coupon,
    discount,
    cartCount,
    cartTotal,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    applyCoupon,
  };
}
