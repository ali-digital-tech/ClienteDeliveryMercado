import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product, Order, mockOrders } from '../data/mockData';

export interface CartItem {
  product: Product;
  qty: number;
}

interface AppState {
  cart: CartItem[];
  favorites: string[];
  orders: Order[];
  isLoggedIn: boolean;
  coupon: string;
  discount: number;
  currentScreen: string;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  applyCoupon: (code: string) => boolean;
  placeOrder: (address: string, type: 'delivery' | 'pickup') => string;
  cartCount: number;
  cartTotal: number;
  login: () => void;
  logout: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>(['1', '5', '11']);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);

  // Derived values computed first
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setCart(prev =>
        prev.map(item =>
          item.product.id === productId ? { ...item, qty } : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCoupon('');
    setDiscount(0);
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const isFavorite = useCallback((productId: string) => {
    return favorites.includes(productId);
  }, [favorites]);

  const applyCoupon = useCallback((code: string) => {
    if (code.toUpperCase() === 'PROMO10') {
      setCoupon(code);
      setDiscount(10);
      return true;
    }
    if (code.toUpperCase() === 'FRETE0') {
      setCoupon(code);
      setDiscount(0);
      return true;
    }
    return false;
  }, []);

  const placeOrder = useCallback((address: string, type: 'delivery' | 'pickup') => {
    const orderId = `#${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: Order = {
      id: orderId,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: cart.map(item => ({ product: item.product, qty: item.qty })),
      total: cartTotal - discount,
      status: 'recebido',
      address,
      type,
    };
    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    setCoupon('');
    setDiscount(0);
    return orderId;
  }, [cart, cartTotal, discount]);

  const login = () => setIsLoggedIn(true);
  const logout = () => setIsLoggedIn(false);

  return (
    <AppContext.Provider value={{
      cart, favorites, orders, isLoggedIn, coupon, discount,
      currentScreen: '',
      addToCart, removeFromCart, updateQty, clearCart,
      toggleFavorite, isFavorite, applyCoupon, placeOrder,
      cartCount, cartTotal, login, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
