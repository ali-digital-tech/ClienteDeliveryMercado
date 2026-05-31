import { createBrowserRouter } from 'react-router';
import { MarketLayout, RedirectToMarketHome } from '@/app/layouts/MarketLayout';
import { HomePage } from '@/pages/Home/HomePage';
import { MarketPage } from '@/pages/Market/MarketPage';
import { CartPage } from '@/pages/Cart/CartPage';
import { CheckoutPage } from '@/pages/Checkout/CheckoutPage';
import { CategoriesPage } from '@/pages/Products/CategoriesPage';
import { FavoritesPage } from '@/pages/Products/FavoritesPage';
import { ProductDetailsPage } from '@/pages/Products/ProductDetailsPage';
import { ProductCollectionPage } from '@/pages/Products/ProductCollectionPage';
import { ProductsPage } from '@/pages/Products/ProductsPage';
import { AddCardScreen } from '../pages/AddCardScreen';
import { AddressesScreen } from '../pages/AddressesScreen';
import { DeliveryScreen } from '../pages/DeliveryScreen';
import { LoginScreen } from '../pages/LoginScreen';
import { MyOrdersScreen } from '../pages/MyOrdersScreen';
import { NotificationsFeedScreen } from '../pages/NotificationsFeedScreen';
import { OrderConfirmedScreen } from '../pages/OrderConfirmedScreen';
import { OrderTrackingScreen } from '../pages/OrderTrackingScreen';
import { PaymentScreen } from '../pages/PaymentScreen';
import { PaymentRecoveryScreen } from '../pages/PaymentRecoveryScreen';
import { PrivacyScreen } from '../pages/PrivacyScreen';
import { ProfileScreen } from '../pages/ProfileScreen';
import { SplashScreen } from '../pages/SplashScreen';
import { SupportScreen } from '../pages/SupportScreen';
import { WelcomeScreen } from '../pages/WelcomeScreen';

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  {
    path: '/mercado/:marketId',
    Component: MarketLayout,
    children: [
      { index: true, Component: MarketPage },
      { path: 'splash', Component: SplashScreen },
      { path: 'welcome', Component: WelcomeScreen },
      { path: 'home', Component: MarketPage },
      { path: 'promocoes', Component: MarketPage },
      { path: 'categories', Component: CategoriesPage },
      { path: 'produtos', Component: ProductsPage },
      { path: 'search', Component: ProductsPage },
      { path: 'colecoes/:collection', Component: ProductCollectionPage },
      { path: 'product/:id', Component: ProductDetailsPage },
      { path: 'favorites', Component: FavoritesPage },
      { path: 'cart', Component: CartPage },
      { path: 'carrinho', Component: CartPage },
      { path: 'login', Component: LoginScreen },
      { path: 'reset-password', Component: LoginScreen },
      { path: 'addresses', Component: AddressesScreen },
      { path: 'delivery', Component: DeliveryScreen },
      { path: 'checkout', Component: CheckoutPage },
      { path: 'payment', Component: PaymentScreen },
      { path: 'payment-recovery', Component: PaymentRecoveryScreen },
      { path: 'order-confirmed', Component: OrderConfirmedScreen },
      { path: 'order-tracking', Component: OrderTrackingScreen },
      { path: 'orders', Component: MyOrdersScreen },
      { path: 'profile', Component: ProfileScreen },
      { path: 'privacy', Component: PrivacyScreen },
      { path: 'notifications', Component: NotificationsFeedScreen },
      { path: 'notifications-feed', Component: NotificationsFeedScreen },
      { path: 'support', Component: SupportScreen },
      { path: 'add-card', Component: AddCardScreen },
      { path: '*', Component: RedirectToMarketHome },
    ],
  },
  { path: '*', Component: HomePage },
]);
