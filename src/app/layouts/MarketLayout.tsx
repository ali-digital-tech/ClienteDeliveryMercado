import { Navigate, Outlet, useParams } from 'react-router';
import { AppProvider } from '@/app/providers/AppProvider';
import { MarketProvider } from '@/contexts/MarketContext';
import { DesktopSidebar } from '@/shared/components/DesktopSidebar';

export function MarketLayout() {
  const { marketId } = useParams();

  if (!marketId) {
    return null;
  }

  return (
    <MarketProvider marketId={marketId}>
      <AppProvider marketId={marketId}>
        <div className="size-full flex overflow-hidden" style={{ background: '#f1f5f9' }}>
          <DesktopSidebar />

          <div className="flex-1 flex flex-col overflow-hidden md:items-start">
            <div
              className="flex-1 flex flex-col overflow-hidden w-full bg-white md:shadow-sm"
              style={{ minWidth: 0 }}
            >
              <Outlet />
            </div>
          </div>
        </div>
      </AppProvider>
    </MarketProvider>
  );
}

export function RedirectToMarketHome() {
  const { marketId } = useParams();
  return <Navigate to={marketId ? `/mercado/${marketId}` : '/'} replace />;
}
