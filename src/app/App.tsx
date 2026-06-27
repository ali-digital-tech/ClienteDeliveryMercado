import { useCallback, useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './router/routes';
import { EntregaiAnimatedSplash } from '@/shared/components/EntregaiAnimatedSplash';
import { SystemNoticeHost } from '@/shared/components/SystemNoticeModal';

export default function App() {
  const [showStartupSplash, setShowStartupSplash] = useState(() => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }

    return true;
  });

  const handleStartupSplashFinish = useCallback(() => {
    setShowStartupSplash(false);
  }, []);

  useEffect(() => {
    if (showStartupSplash) {
      router.navigate('/', { replace: true });
    }
  }, [showStartupSplash]);

  return (
    <>
      <RouterProvider router={router} />
      <SystemNoticeHost />
      {showStartupSplash ? (
        <div className="fixed inset-0 z-[9999] flex">
          <EntregaiAnimatedSplash onFinish={handleStartupSplashFinish} />
        </div>
      ) : null}
    </>
  );
}
