import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useMarketContext } from '@/contexts/MarketContext';
import { authService, type AuthUser, type LoginCredentials } from '@/features/auth';
import {
  addProductToRemoteCart,
  getRemoteCartItems,
  removeRemoteCartItem,
  updateRemoteCartItemQuantity,
  useCartStore,
  type AppliedCoupon,
  type CartItem,
} from '@/features/cart';
import { useCategories, type Category } from '@/features/categories';
import { useMarkets, type Market } from '@/features/markets';
import { useOrdersStore, type Order } from '@/features/orders';
import { useProducts, type Product } from '@/features/products';

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
  addToCart: (product: Product) => Promise<void>;
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
  const navigate = useNavigate();
  const location = useLocation();
  const { currentMarket, isLoading } = useMarketContext();
  const { markets } = useMarkets();
  const { products: allProducts } = useProducts(marketId);
  const { categories: allCategories } = useCategories(marketId);

  const products = useMemo(() => allProducts, [allProducts]);
  const categories = useMemo(() => allCategories, [allCategories]);
  const {
    cart,
    coupon,
    discount,
    cartCount,
    cartTotal,
    addToCart: addToLocalCart,
    setCart,
    removeFromCart: removeFromLocalCart,
    updateQty: updateLocalQty,
    clearCart,
    applyCoupon,
  } = useCartStore(marketId);
  const { orders, placeOrder: createOrder } = useOrdersStore(marketId);
  const [favoritesByMarket, setFavoritesByMarket] = useState<Record<string, string[]>>(() => readFavoritesFromStorage());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getStoredUser());

  const favorites = favoritesByMarket[marketId] || [];
  const storeId = currentMarket?.id || marketId;

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
    setCurrentUser(user);
    return user;
  }, [storeId]);

  useEffect(() => {
    const storedUser = currentUser || authService.getStoredUser();
    if (!storedUser || products.length === 0) return;

    let isActive = true;

    getRemoteCartItems(storeId, products)
      .then((items) => {
        if (isActive) setCart(items);
      })
      .catch((error) => {
        console.error('Erro ao carregar carrinho remoto', error);
      });

    return () => {
      isActive = false;
    };
  }, [currentUser, products, setCart, storeId]);

  const logout = useCallback(() => {
    authService.clearSession();
    setCurrentUser(null);
  }, []);

  const isLoggedIn = Boolean(currentUser);
  const tenantPath = useCallback((path = '') => {
    const normalizedPath = path.replace(/^\/+/, '');
    return normalizedPath ? `/mercado/${marketId}/${normalizedPath}` : `/mercado/${marketId}`;
  }, [marketId]);

  const addToCart = useCallback(async (product: Product) => {
    if (product.marketId !== marketId) return;

    const storedUser = authService.getStoredUser();
    if (!currentUser && !storedUser) {
      navigate(tenantPath('login'), {
        state: {
          redirectTo: `${location.pathname}${location.search}${location.hash}`,
          pendingCartProductId: product.id,
        },
      });
      return;
    }

    const remoteItem = await addProductToRemoteCart(storeId, product);
    addToLocalCart(product, remoteItem.id, remoteItem.quantidade);
  }, [addToLocalCart, currentUser, location.hash, location.pathname, location.search, marketId, navigate, storeId, tenantPath]);

  const removeFromCart = useCallback(async (productId: string) => {
    const item = cart.find(cartItem => cartItem.product.id === productId);

    if (item?.remoteItemId) {
      await removeRemoteCartItem(item.remoteItemId);
    }

    removeFromLocalCart(productId);
  }, [cart, removeFromLocalCart]);

  const updateQty = useCallback(async (productId: string, qty: number) => {
    const item = cart.find(cartItem => cartItem.product.id === productId);

    if (item?.remoteItemId) {
      if (qty <= 0) {
        await removeRemoteCartItem(item.remoteItemId);
      } else {
        const remoteItem = await updateRemoteCartItemQuantity(item.remoteItemId, qty);
        updateLocalQty(productId, remoteItem.quantidade);
        return;
      }
    }

    updateLocalQty(productId, qty);
  }, [cart, updateLocalQty]);

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
      cartCount, cartTotal, login, logout, tenantPath,
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
