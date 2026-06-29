import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import { AppProvider } from '@/app/providers/AppProvider';
import { MarketProvider, useMarketContext } from '@/contexts/MarketContext';
import { DesktopSidebar } from '@/shared/components/DesktopSidebar';
import { EntregaiAnimatedSplash } from '@/shared/components/EntregaiAnimatedSplash';
import { PwaInstallBanner } from '@/shared/components/PwaInstallBanner';

export function MarketLayout() {
  const { marketId } = useParams();

  if (!marketId) {
    return null;
  }

  return (
    <MarketProvider marketId={marketId}>
      <MarketLayoutContent marketId={marketId} />
    </MarketProvider>
  );
}

function MarketLayoutContent({ marketId }: { marketId: string }) {
  const { currentMarket, isLoading } = useMarketContext();
  const [showEntrySplash, setShowEntrySplash] = useState(true);

  useEffect(() => {
    setShowEntrySplash(true);
  }, [marketId]);

  const handleEntrySplashFinish = useCallback(() => {
    setShowEntrySplash(false);
  }, []);

  const shouldShowEntrySplash = isLoading || showEntrySplash;

  return (
    <>
      <AppProvider marketId={marketId}>
        <>
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
          <PwaInstallBanner />
        </>
      </AppProvider>

      {shouldShowEntrySplash ? (
        <div className="fixed inset-0 z-[9998] flex">
          <EntregaiAnimatedSplash
            autoFinish={!isLoading && Boolean(currentMarket)}
            finishAfterMs={1800}
            onFinish={handleEntrySplashFinish}
            storeLogo={currentMarket?.logo}
            storeName={currentMarket?.name}
          />
        </div>
      ) : null}
    </>
  );
}

export function RedirectToMarketHome() {
  const { marketId } = useParams();
  return <Navigate to={marketId ? `/mercado/${marketId}` : '/'} replace />;
}
