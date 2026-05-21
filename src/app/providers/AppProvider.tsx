import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useMarketContext } from '@/contexts/MarketContext';
import { authService, type AuthUser, type LoginCredentials } from '@/features/auth';
import {
  useCartStore,
  type AppliedCoupon,
  type CartItem,
} from '@/features/cart';
import { useCategories, type Category } from '@/features/categories';
import { useMarkets, type Market } from '@/features/markets';
import { useOrdersStore, type Order } from '@/features/orders';
import type { Product } from '@/features/products';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';
import { getAuthToken, onSessionExpired } from '@/shared/lib/api';

const FAVORITES_STORAGE_KEY = 'cliente_delivery_favorites_by_market';

interface AppState {
  marketId: string;
  currentMarket: Market;
  markets: Market[];
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  favorites: string[];
  orders: Order[];
  isLoggedIn: boolean;
  currentUser: AuthUser | null;
  coupon: string;
  discount: number;
  currentScreen: string;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQty: (productId: string, qty: number) => Promise<void>;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  applyCoupon: (code: string) => Promise<AppliedCoupon>;
  placeOrder: (address: string, type: 'delivery' | 'pickup') => string;
  cartCount: number;
  cartTotal: number;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  refreshOrders: () => Promise<Order[]>;
  tenantPath: (path?: string) => string;
}

const AppContext = createContext<AppState | null>(null);

function readFavoritesFromStorage(): Record<string, string[]> {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).map(([marketId, productIds]) => [
        marketId,
        Array.isArray(productIds) ? productIds.filter((id): id is string => typeof id === 'string') : [],
      ])
    );
  } catch {
    return {};
  }
}

function saveFavoritesToStorage(favoritesByMarket: Record<string, string[]>) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoritesByMarket));
}

export function AppProvider({ children, marketId }: { children: React.ReactNode; marketId: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentMarket, isLoading } = useMarketContext();
  const { markets } = useMarkets();
  const { categories: allCategories } = useCategories(marketId);

  const products = useMemo<Product[]>(() => [], []);
  const categories = useMemo(() => allCategories, [allCategories]);
  const {
    cart,
    coupon,
    discount,
    cartCount,
    cartTotal,
    addToCart: addToLocalCart,
    removeFromCart: removeFromLocalCart,
    updateQty: updateLocalQty,
    clearCart,
    applyCoupon,
  } = useCartStore(marketId, products);
  const { orders, placeOrder: createOrder, refreshOrders } = useOrdersStore(marketId);
  const sessionExpiredHandledRef = useRef(false);
  const sessionValidatedRef = useRef(false);
  const [favoritesByMarket, setFavoritesByMarket] = useState<Record<string, string[]>>(() => readFavoritesFromStorage());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getStoredUser());

  const favorites = favoritesByMarket[marketId] || [];
  const storeId = currentMarket?.id || marketId;

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--market-primary-color',
      currentMarket?.primaryColor || '#122a4c'
    );

    return () => {
      document.documentElement.style.removeProperty('--market-primary-color');
    };
  }, [currentMarket?.primaryColor]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavoritesByMarket(prevByMarket => {
      const prev = prevByMarket[marketId] || [];
      const next = {
        ...prevByMarket,
        [marketId]: prev.includes(productId)
          ? prev.filter(id => id !== productId)
          : [...prev, productId],
      };

      saveFavoritesToStorage(next);
      return next;
    });
  }, [marketId]);

  const isFavorite = useCallback((productId: string) => {
    return favorites.includes(productId);
  }, [favorites]);

  const placeOrder = useCallback((address: string, type: 'delivery' | 'pickup') => {
    const orderId = createOrder(cart, Math.max(cartTotal - discount, 0), address, type);
    clearCart();
    return orderId;
  }, [cart, cartTotal, clearCart, createOrder, discount]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const session = await authService.login({ ...credentials, loja_id: credentials.loja_id || storeId });
    const user = authService.persistSession(session);
    sessionExpiredHandledRef.current = false;
    setCurrentUser(user);
    void refreshOrders();
    return user;
  }, [refreshOrders, storeId]);

  const logout = useCallback(() => {
    authService.clearSession();
    setCurrentUser(null);
  }, []);

  const isLoggedIn = Boolean(currentUser);
  const tenantPath = useCallback((path = '') => {
    const normalizedPath = path.replace(/^\/+/, '');
    return normalizedPath ? `/mercado/${marketId}/${normalizedPath}` : `/mercado/${marketId}`;
  }, [marketId]);

  useEffect(() => {
    return onSessionExpired((message) => {
      if (sessionExpiredHandledRef.current) return;

      sessionExpiredHandledRef.current = true;
      authService.clearSession();
      setCurrentUser(null);
      showSystemNotice(message, 'Sessão expirada');

      const loginPath = tenantPath('login');
      if (location.pathname === loginPath) return;

      navigate(loginPath, {
        replace: true,
        state: {
          redirectTo: `${location.pathname}${location.search}${location.hash}`,
        },
      });
    });
  }, [location.hash, location.pathname, location.search, navigate, tenantPath]);

  useEffect(() => {
    if (sessionValidatedRef.current || !getAuthToken()) return;

    sessionValidatedRef.current = true;
    let isActive = true;

    authService.getCurrentCustomer()
      .then((profile) => {
        if (!isActive) return;
        sessionExpiredHandledRef.current = false;
        setCurrentUser(profile);
      })
      .catch((error) => {
        console.error('Erro ao validar sessão do cliente:', error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const addToCart = useCallback(async (product: Product, quantity?: number) => {
    if (product.marketId !== marketId) return;
    addToLocalCart(product, quantity);
  }, [addToLocalCart, marketId]);

  const removeFromCart = useCallback(async (productId: string) => {
    removeFromLocalCart(productId);
  }, [removeFromLocalCart]);

  const updateQty = useCallback(async (productId: string, qty: number) => {
    updateLocalQty(productId, qty);
  }, [updateLocalQty]);

  if (isLoading) {
    return null;
  }

  if (!currentMarket) {
    throw new Error(`Market ${marketId} not found`);
  }

  return (
    <AppContext.Provider value={{
      marketId, currentMarket, markets, products, categories,
      cart, favorites, orders, isLoggedIn, currentUser, coupon, discount,
      currentScreen: '',
      addToCart, removeFromCart, updateQty, clearCart,
      toggleFavorite, isFavorite, applyCoupon, placeOrder,
      cartCount, cartTotal, login, logout, refreshOrders, tenantPath,
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
