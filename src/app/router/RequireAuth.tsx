import type { ComponentType, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useApp } from '@/app/providers/AppProvider';
import { getAuthToken } from '@/shared/lib/api';

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isLoggedIn, tenantPath } = useApp();

  if (!isLoggedIn && !getAuthToken()) {
    return (
      <Navigate
        to={tenantPath('login')}
        replace
        state={{ redirectTo: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <>{children}</>;
}

export function withAuth<TProps extends object>(Component: ComponentType<TProps>) {
  return function AuthenticatedRoute(props: TProps) {
    return (
      <RequireAuth>
        <Component {...props} />
      </RequireAuth>
    );
  };
}
