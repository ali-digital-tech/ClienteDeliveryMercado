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
import { isConfigurableProduct, type Product } from '@/features/products';
import { disableCustomerPush, listenForCustomerPush, refreshCustomerPushIfGranted } from '@/features/notifications';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';
import { getAuthToken, onSessionExpired } from '@/shared/lib/api';

const FAVORITES_STORAGE_KEY = 'cliente_delivery_favorites_by_market';
const DEFAULT_MARKET_PRIMARY_COLOR = '#122a4c';
const DEFAULT_MARKET_SECONDARY_COLOR = '#16a34a';

const MARKET_THEME_PROPERTIES = [
  '--market-primary-color',
  '--market-secondary-color',
  '--market-primary-foreground-color',
  '--market-secondary-foreground-color',
  '--market-primary-soft-color',
  '--market-primary-border-color',
  '--market-primary-muted-color',
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--accent',
  '--accent-foreground',
  '--ring',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
] as const;

function normalizeHexColor(color: string | null | undefined, fallback: string) {
  if (!color) return fallback;

  const trimmed = color.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    return `#${withHash.slice(1).split('').map((char) => `${char}${char}`).join('')}`;
  }

  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash : fallback;
}

function getReadableTextColor(background: string) {
  const hex = normalizeHexColor(background, DEFAULT_MARKET_PRIMARY_COLOR).slice(1);
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [sr, sg, sb] = [r, g, b].map((channel) => (
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  const luminance = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;

  return luminance > 0.55 ? '#0f172a' : '#ffffff';
}

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
  couponId: string;
  discount: number;
  currentScreen: string;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  addConfiguredItem: (item: Omit<CartItem, 'lineId'> & { lineId?: string }) => Promise<void>;
  updateConfiguredItem: (lineId: string, item: Omit<CartItem, 'lineId'>) => Promise<void>;
  removeFromCart: (lineIdOrProductId: string) => Promise<void>;
  updateQty: (lineIdOrProductId: string, qty: number) => Promise<void>;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  applyCoupon: (code: string) => Promise<AppliedCoupon>;
  placeOrder: (address: string, type: 'delivery' | 'pickup') => string;
  cartCount: number;
  cartTotal: number;
  cartPulseKey: number;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  updateCurrentUser: (user: AuthUser) => void;
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
    couponId,
    discount,
    cartCount,
    cartTotal,
    addToCart: addToLocalCart,
    addConfiguredItem: addConfiguredItemToLocalCart,
    updateConfiguredItem: updateConfiguredItemInLocalCart,
    removeFromCart: removeFromLocalCart,
    updateQty: updateLocalQty,
    clearCart,
    applyCoupon: applyCouponToLocalCart,
  } = useCartStore(marketId, products);
  const { orders, placeOrder: createOrder, refreshOrders } = useOrdersStore(marketId);
  const sessionExpiredHandledRef = useRef(false);
  const sessionValidatedRef = useRef(false);
  const [favoritesByMarket, setFavoritesByMarket] = useState<Record<string, string[]>>(() => readFavoritesFromStorage());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getStoredUser());
  const [cartPulseKey, setCartPulseKey] = useState(0);

  const favorites = favoritesByMarket[marketId] || [];
  const storeId = currentMarket?.id || marketId;
  const isLoggedIn = Boolean(currentUser);
  const tenantPath = useCallback((path = '') => {
    const normalizedPath = path.replace(/^\/+/, '');
    return normalizedPath ? `/mercado/${marketId}/${normalizedPath}` : `/mercado/${marketId}`;
  }, [marketId]);
  const isAuthenticatedForAction = useCallback(() => Boolean(currentUser || getAuthToken()), [currentUser]);
  const requireCustomerLogin = useCallback((state: Record<string, unknown> = {}) => {
    showSystemNotice('Entre na sua conta para continuar.');
    navigate(tenantPath('login'), {
      state: {
        redirectTo: `${location.pathname}${location.search}${location.hash}`,
        ...state,
      },
    });
    return false;
  }, [location.hash, location.pathname, location.search, navigate, tenantPath]);

  useEffect(() => {
    const primaryColor = normalizeHexColor(currentMarket?.primaryColor, DEFAULT_MARKET_PRIMARY_COLOR);
    const secondaryColor = normalizeHexColor(currentMarket?.secondaryColor, DEFAULT_MARKET_SECONDARY_COLOR);
    const primaryForegroundColor = getReadableTextColor(primaryColor);
    const secondaryForegroundColor = getReadableTextColor(secondaryColor);
    const primarySoftColor = `color-mix(in srgb, ${primaryColor} 10%, white)`;
    const primaryBorderColor = `color-mix(in srgb, ${primaryColor} 20%, white)`;
    const primaryMutedColor = `color-mix(in srgb, ${primaryColor} 35%, white)`;

    const root = document.documentElement;
    root.style.setProperty('--market-primary-color', primaryColor);
    root.style.setProperty('--market-secondary-color', secondaryColor);
    root.style.setProperty('--market-primary-foreground-color', primaryForegroundColor);
    root.style.setProperty('--market-secondary-foreground-color', secondaryForegroundColor);
    root.style.setProperty('--market-primary-soft-color', primarySoftColor);
    root.style.setProperty('--market-primary-border-color', primaryBorderColor);
    root.style.setProperty('--market-primary-muted-color', primaryMutedColor);
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-foreground', primaryForegroundColor);
    root.style.setProperty('--secondary', secondaryColor);
    root.style.setProperty('--secondary-foreground', secondaryForegroundColor);
    root.style.setProperty('--accent', primarySoftColor);
    root.style.setProperty('--accent-foreground', primaryColor);
    root.style.setProperty('--ring', primaryColor);
    root.style.setProperty('--sidebar-primary', primaryColor);
    root.style.setProperty('--sidebar-primary-foreground', primaryForegroundColor);

    return () => {
      MARKET_THEME_PROPERTIES.forEach((property) => {
        document.documentElement.style.removeProperty(property);
      });
    };
  }, [currentMarket?.primaryColor, currentMarket?.secondaryColor]);

  const toggleFavorite = useCallback((productId: string) => {
    if (!isAuthenticatedForAction()) {
      requireCustomerLogin({ pendingFavoriteProductId: productId });
      return;
    }

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
  }, [isAuthenticatedForAction, marketId, requireCustomerLogin]);

  const isFavorite = useCallback((productId: string) => {
    return favorites.includes(productId);
  }, [favorites]);

  const placeOrder = useCallback((address: string, type: 'delivery' | 'pickup') => {
    const orderId = createOrder(cart, Math.max(cartTotal - discount, 0), address, type);
    clearCart();
    return orderId;
  }, [cart, cartTotal, clearCart, createOrder, discount]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const session = await authService.login(credentials);
    const user = authService.persistSession(session);
    sessionExpiredHandledRef.current = false;
    setCurrentUser(user);
    void refreshOrders();
    void refreshCustomerPushIfGranted().catch(() => {});
    return user;
  }, [refreshOrders]);

  const logout = useCallback(() => {
    void disableCustomerPush().catch(() => {});
    authService.clearSession();
    setCurrentUser(null);
  }, []);

  const updateCurrentUser = useCallback((user: AuthUser) => {
    authService.persistUser(user);
    setCurrentUser(user);
  }, []);

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
        void refreshCustomerPushIfGranted().catch(() => {});
      })
      .catch((error) => {
        console.error('Erro ao validar sessão do cliente:', error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let unlisten = () => {};
    let active = true;

    listenForCustomerPush((payload) => {
      void refreshOrders();
      if ('Notification' in window && Notification.permission === 'granted') {
        const data = payload.data || {};
        const foregroundNotification = new Notification(data.title || 'Nova notificação', { body: data.body });
        foregroundNotification.onclick = () => {
          window.focus();
          if (data.route) {
            navigate(data.route.startsWith('/mercado/') ? data.route : tenantPath(data.route));
          }
        };
      }
    }).then((cleanup) => {
      if (active) unlisten = cleanup;
      else cleanup();
    });

    return () => {
      active = false;
      unlisten();
    };
  }, [currentUser, navigate, refreshOrders, tenantPath]);

  const addToCart = useCallback(async (product: Product, quantity?: number) => {
    if (isConfigurableProduct(product)) {
      showSystemNotice('Escolha as opções deste item antes de adicionar ao carrinho.');
      return;
    }

    if (!isAuthenticatedForAction()) {
      requireCustomerLogin({
        pendingCartProductId: product.id,
        pendingCartQuantity: quantity,
      });
      return;
    }

    if (product.marketId !== marketId) return;
    addToLocalCart(product, quantity);
    setCartPulseKey((key) => key + 1);
  }, [addToLocalCart, isAuthenticatedForAction, marketId, requireCustomerLogin]);

  const addConfiguredItem = useCallback(async (item: Omit<CartItem, 'lineId'> & { lineId?: string }) => {
    if (!isAuthenticatedForAction()) {
      requireCustomerLogin({ pendingCartProductId: item.product.id });
      return;
    }
    addConfiguredItemToLocalCart(item);
    setCartPulseKey((key) => key + 1);
  }, [addConfiguredItemToLocalCart, isAuthenticatedForAction, requireCustomerLogin]);

  const updateConfiguredItem = useCallback(async (lineId: string, item: Omit<CartItem, 'lineId'>) => {
    if (!isAuthenticatedForAction()) {
      requireCustomerLogin();
      return;
    }
    updateConfiguredItemInLocalCart(lineId, item);
  }, [isAuthenticatedForAction, requireCustomerLogin, updateConfiguredItemInLocalCart]);

  const removeFromCart = useCallback(async (productId: string) => {
    if (!isAuthenticatedForAction()) {
      requireCustomerLogin();
      return;
    }

    removeFromLocalCart(productId);
  }, [isAuthenticatedForAction, removeFromLocalCart, requireCustomerLogin]);

  const updateQty = useCallback(async (productId: string, qty: number) => {
    if (!isAuthenticatedForAction()) {
      requireCustomerLogin();
      return;
    }

    const currentItem = cart.find(item => item.product.id === productId);
    const currentQty = currentItem?.qty || 0;
    updateLocalQty(productId, qty);
    if (qty > currentQty) {
      setCartPulseKey((key) => key + 1);
    }
  }, [cart, isAuthenticatedForAction, requireCustomerLogin, updateLocalQty]);

  const applyCoupon = useCallback(async (code: string) => {
    if (!isAuthenticatedForAction()) {
      requireCustomerLogin();
      throw new Error('Faça login para usar um cupom.');
    }

    return applyCouponToLocalCart(code);
  }, [applyCouponToLocalCart, isAuthenticatedForAction, requireCustomerLogin]);

  if (isLoading) {
    return null;
  }

  if (!currentMarket) {
    throw new Error(`Market ${marketId} not found`);
  }

  return (
    <AppContext.Provider value={{
      marketId, currentMarket, markets, products, categories,
      cart, favorites, orders, isLoggedIn, currentUser, coupon, couponId, discount,
      currentScreen: '',
      addToCart, addConfiguredItem, updateConfiguredItem, removeFromCart, updateQty, clearCart,
      toggleFavorite, isFavorite, applyCoupon, placeOrder,
      cartCount, cartTotal, cartPulseKey, login, logout, updateCurrentUser, refreshOrders, tenantPath,
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
