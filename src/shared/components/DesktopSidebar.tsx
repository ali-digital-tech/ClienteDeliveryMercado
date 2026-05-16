import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Home, Grid3X3, Search, Heart, ShoppingCart, ShoppingBag, User, Settings, Bell, HelpCircle } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';

const mainNavItems = [
  { label: 'Início', icon: Home, path: '' },
  { label: 'Categorias', icon: Grid3X3, path: 'categories' },
  { label: 'Buscar', icon: Search, path: 'produtos' },
  { label: 'Favoritos', icon: Heart, path: 'favorites' },
  { label: 'Carrinho', icon: ShoppingCart, path: 'carrinho' },
  { label: 'Meus Pedidos', icon: ShoppingBag, path: 'orders' },
];

const bottomNavItems = [
  { label: 'Notificações', icon: Bell, path: 'notifications-feed' },
  { label: 'Perfil', icon: User, path: 'profile' },
  { label: 'Configurações', icon: Settings, path: 'notifications' },
  { label: 'Suporte', icon: HelpCircle, path: 'support' },
];

export function DesktopSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartCount, currentMarket, tenantPath } = useApp();
  const [logoFailed, setLogoFailed] = useState(false);

  const isActive = (path: string) => location.pathname === tenantPath(path);
  const showLogo = currentMarket.logo && !logoFailed;

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 h-full border-r border-gray-100"
      style={{ width: '230px', background: '#fff' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5 border-b border-gray-100"
        style={{ background: 'linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)' }}
      >
        <div
          className="rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.15)' }}
        >
          {showLogo ? (
            <img
              src={currentMarket.logo}
              alt={currentMarket.name}
              className="h-full w-full object-cover"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span style={{ fontSize: '22px' }}>🛒</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-white" style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.1 }}>{currentMarket.name}</p>
          <p style={{ fontSize: '10px', color: '#c7d7ee', fontWeight: 500 }}>Supermercado Digital</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="px-3 mb-2" style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Menu
        </p>
        <div className="flex flex-col gap-1">
          {mainNavItems.map(({ label, icon: Icon, path }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(tenantPath(path))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left"
                style={{
                  backgroundColor: active ? '#eef4fb' : 'transparent',
                  color: active ? '#122a4c' : '#6b7280',
                }}
              >
                <div className="relative flex-shrink-0">
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  {path === 'carrinho' && cartCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-white rounded-full flex items-center justify-center"
                      style={{
                        width: '16px', height: '16px', fontSize: '9px', fontWeight: 700,
                        backgroundColor: '#16a34a',
                      }}
                    >
                      {cartCount}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '13px', fontWeight: active ? 700 : 500 }}>{label}</span>
                {active && (
                  <span
                    className="ml-auto rounded-full"
                    style={{ width: '6px', height: '6px', backgroundColor: '#122a4c', flexShrink: 0 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="px-3 mt-5 mb-2" style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Conta
        </p>
        <div className="flex flex-col gap-1">
          {bottomNavItems.map(({ label, icon: Icon, path }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(tenantPath(path))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left"
                style={{
                  backgroundColor: active ? '#eef4fb' : 'transparent',
                  color: active ? '#122a4c' : '#6b7280',
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontSize: '13px', fontWeight: active ? 700 : 500 }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100">
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{ backgroundColor: '#f0fdf4' }}
        >
          <div
            className="rounded-full flex-shrink-0"
            style={{ width: '8px', height: '8px', backgroundColor: '#16a34a' }}
          />
          <p style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
            Entrega por ordem de pedido
          </p>
        </div>
      </div>
    </aside>
  );
}
