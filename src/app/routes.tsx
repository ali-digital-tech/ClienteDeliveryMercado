import { createBrowserRouter, Outlet, Navigate } from 'react-router';
import { AppProvider } from './context/AppContext';
import { DesktopSidebar } from './components/DesktopSidebar';
import { SplashScreen } from './pages/SplashScreen';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { HomeScreen } from './pages/HomeScreen';
import { CategoriesScreen } from './pages/CategoriesScreen';
import { SearchScreen } from './pages/SearchScreen';
import { ProductDetailScreen } from './pages/ProductDetailScreen';
import { FavoritesScreen } from './pages/FavoritesScreen';
import { CartScreen } from './pages/CartScreen';
import { LoginScreen } from './pages/LoginScreen';
import { AddressesScreen } from './pages/AddressesScreen';
import { DeliveryScreen } from './pages/DeliveryScreen';
import { CheckoutScreen } from './pages/CheckoutScreen';
import { PaymentScreen } from './pages/PaymentScreen';
import { OrderConfirmedScreen } from './pages/OrderConfirmedScreen';
import { OrderTrackingScreen } from './pages/OrderTrackingScreen';
import { MyOrdersScreen } from './pages/MyOrdersScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { PrivacyScreen } from './pages/PrivacyScreen';
import { NotificationsScreen } from './pages/NotificationsScreen';
import { NotificationsFeedScreen } from './pages/NotificationsFeedScreen';
import { SupportScreen } from './pages/SupportScreen';
import { AddCardScreen } from './pages/AddCardScreen';

function RedirectToSplash() {
  return <Navigate to="/splash" replace />;
}
function RedirectToHome() {
  return <Navigate to="/home" replace />;
}

function Root() {
  return (
    <AppProvider>
      <div className="size-full flex overflow-hidden" style={{ background: '#f1f5f9' }}>
        {/* Desktop sidebar — only shown on md+ */}
        <DesktopSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden md:items-start">
          {/* Content column: full-width on mobile, constrained on desktop */}
          <div
            className="flex-1 flex flex-col overflow-hidden w-full bg-white md:shadow-sm"
            style={{ minWidth: 0 }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </AppProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: RedirectToSplash },
      { path: 'splash', Component: SplashScreen },
      { path: 'welcome', Component: WelcomeScreen },
      { path: 'home', Component: HomeScreen },
      { path: 'categories', Component: CategoriesScreen },
      { path: 'search', Component: SearchScreen },
      { path: 'product/:id', Component: ProductDetailScreen },
      { path: 'favorites', Component: FavoritesScreen },
      { path: 'cart', Component: CartScreen },
      { path: 'login', Component: LoginScreen },
      { path: 'addresses', Component: AddressesScreen },
      { path: 'delivery', Component: DeliveryScreen },
      { path: 'checkout', Component: CheckoutScreen },
      { path: 'payment', Component: PaymentScreen },
      { path: 'order-confirmed', Component: OrderConfirmedScreen },
      { path: 'order-tracking', Component: OrderTrackingScreen },
      { path: 'orders', Component: MyOrdersScreen },
      { path: 'profile', Component: ProfileScreen },
      { path: 'privacy', Component: PrivacyScreen },
      { path: 'notifications', Component: NotificationsScreen },
      { path: 'notifications-feed', Component: NotificationsFeedScreen },
      { path: 'support', Component: SupportScreen },
      { path: 'add-card', Component: AddCardScreen },
      { path: '*', Component: RedirectToHome },
    ],
  },
]);