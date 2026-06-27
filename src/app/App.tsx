import { useCallback, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './router/routes';
import { EntregaiAnimatedSplash } from '@/shared/components/EntregaiAnimatedSplash';
import { SystemNoticeHost } from '@/shared/components/SystemNoticeModal';

export default function App() {
  const [showStartupSplash, setShowStartupSplash] = useState(true);

  const handleStartupSplashFinish = useCallback(() => {
    setShowStartupSplash(false);
  }, []);

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
