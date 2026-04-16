import { createBrowserRouter, Outlet, Navigate } from 'react-router';
import { AppProvider } from './context/AppContext';
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

function RedirectToSplash() {
  return <Navigate to="/splash" replace />;
}
function RedirectToHome() {
  return <Navigate to="/home" replace />;
}

function Root() {
  return (
    <AppProvider>
      <div className="size-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #162032 100%)' }}>
        {/* Background glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute rounded-full"
            style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(22,163,74,0.15) 0%, transparent 70%)', top: '-150px', left: '-100px' }} />
          <div className="absolute rounded-full"
            style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(74,222,128,0.1) 0%, transparent 70%)', bottom: '-100px', right: '-50px' }} />
        </div>

        {/* Phone frame container */}
        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            width: '100%',
            maxWidth: '390px',
            height: '100%',
            maxHeight: '844px',
            background: 'white',
            borderRadius: 'clamp(0px, 2vw, 40px)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {/* Notch - only visible at full phone size */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50"
            style={{
              width: '126px',
              height: '34px',
              backgroundColor: '#000',
              borderRadius: '0 0 20px 20px',
            }}
          />

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </div>

          {/* Home indicator bar */}
          <div
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full pointer-events-none z-50"
            style={{ width: '120px', height: '4px', backgroundColor: 'rgba(0,0,0,0.15)' }}
          />
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
      { path: '*', Component: RedirectToHome },
    ],
  },
]);
