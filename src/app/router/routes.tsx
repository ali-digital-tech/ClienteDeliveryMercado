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
import { LegalDocumentScreen } from '../pages/LegalDocumentScreen';
import { MyOrdersScreen } from '../pages/MyOrdersScreen';
import { NotificationsFeedScreen } from '../pages/NotificationsFeedScreen';
import { OrderConfirmedScreen } from '../pages/OrderConfirmedScreen';
import { OrderTrackingScreen } from '../pages/OrderTrackingScreen';
import { PaymentScreen } from '../pages/PaymentScreen';
import { PaymentRecoveryScreen } from '../pages/PaymentRecoveryScreen';
import { PrivacyScreen } from '../pages/PrivacyScreen';
import { PermissionsScreen } from '../pages/PermissionsScreen';
import { ProfileScreen } from '../pages/ProfileScreen';
import { SplashScreen } from '../pages/SplashScreen';
import { SupportScreen } from '../pages/SupportScreen';
import { WelcomeScreen } from '../pages/WelcomeScreen';
import { withAuth } from './RequireAuth';

const AuthenticatedCartPage = withAuth(CartPage);
const AuthenticatedCheckoutPage = withAuth(CheckoutPage);
const AuthenticatedFavoritesPage = withAuth(FavoritesPage);
const AuthenticatedAddCardScreen = withAuth(AddCardScreen);
const AuthenticatedAddressesScreen = withAuth(AddressesScreen);
const AuthenticatedDeliveryScreen = withAuth(DeliveryScreen);
const AuthenticatedMyOrdersScreen = withAuth(MyOrdersScreen);
const AuthenticatedNotificationsFeedScreen = withAuth(NotificationsFeedScreen);
const AuthenticatedOrderConfirmedScreen = withAuth(OrderConfirmedScreen);
const AuthenticatedOrderTrackingScreen = withAuth(OrderTrackingScreen);
const AuthenticatedPaymentScreen = withAuth(PaymentScreen);
const AuthenticatedPaymentRecoveryScreen = withAuth(PaymentRecoveryScreen);
const AuthenticatedPermissionsScreen = withAuth(PermissionsScreen);
const AuthenticatedPrivacyScreen = withAuth(PrivacyScreen);
const AuthenticatedProfileScreen = withAuth(ProfileScreen);

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
      { path: 'favorites', Component: AuthenticatedFavoritesPage },
      { path: 'cart', Component: AuthenticatedCartPage },
      { path: 'carrinho', Component: AuthenticatedCartPage },
      { path: 'login', Component: LoginScreen },
      { path: 'reset-password', Component: LoginScreen },
      { path: 'addresses', Component: AuthenticatedAddressesScreen },
      { path: 'delivery', Component: AuthenticatedDeliveryScreen },
      { path: 'checkout', Component: AuthenticatedCheckoutPage },
      { path: 'payment', Component: AuthenticatedPaymentScreen },
      { path: 'payment-recovery', Component: AuthenticatedPaymentRecoveryScreen },
      { path: 'order-confirmed', Component: AuthenticatedOrderConfirmedScreen },
      { path: 'order-tracking', Component: AuthenticatedOrderTrackingScreen },
      { path: 'orders', Component: AuthenticatedMyOrdersScreen },
      { path: 'profile', Component: AuthenticatedProfileScreen },
      { path: 'privacy', Component: AuthenticatedPrivacyScreen },
      { path: 'privacy/permissions', Component: AuthenticatedPermissionsScreen },
      { path: 'privacy/:documentSlug', Component: LegalDocumentScreen },
      { path: 'notifications', Component: AuthenticatedNotificationsFeedScreen },
      { path: 'notifications-feed', Component: AuthenticatedNotificationsFeedScreen },
      { path: 'support', Component: SupportScreen },
      { path: 'add-card', Component: AuthenticatedAddCardScreen },
      { path: '*', Component: RedirectToMarketHome },
    ],
  },
  { path: '*', Component: HomePage },
]);
