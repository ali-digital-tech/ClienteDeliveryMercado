import { useNavigate, useLocation } from 'react-router';
import { Home, Grid3X3, Heart, ShoppingBag, User } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';

const navItems = [
  { label: 'Home', icon: Home, path: '' },
  { label: 'Categorias', icon: Grid3X3, path: 'categories' },
  { label: 'Favoritos', icon: Heart, path: 'favorites' },
  { label: 'Pedidos', icon: ShoppingBag, path: 'orders' },
  { label: 'Perfil', icon: User, path: 'profile' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantPath, currentMarket } = useApp();
  const primaryColor = currentMarket?.primaryColor || 'var(--market-primary-color)';

  return (
    <div className="md:hidden flex-shrink-0 bg-white border-t border-gray-100 flex items-center justify-around py-2 px-1 safe-area-bottom">
      {navItems.map(({ label, icon: Icon, path }) => {
        const resolvedPath = tenantPath(path);
        const active = location.pathname === resolvedPath;
        return (
          <button
            key={path}
            onClick={() => navigate(resolvedPath)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all"
            style={{ color: active ? primaryColor : '#9ca3af' }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
