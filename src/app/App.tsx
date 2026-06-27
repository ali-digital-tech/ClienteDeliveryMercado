import { useCallback, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './router/routes';
import { EntregaiAnimatedSplash } from '@/shared/components/EntregaiAnimatedSplash';
import { SystemNoticeHost } from '@/shared/components/SystemNoticeModal';

export default function App() {
  const [showStartupSplash, setShowStartupSplash] = useState(true);

  const handleStartupSplashFinish = useCallback(() => {
    window.history.replaceState(null, '', '/');
    setShowStartupSplash(false);
  }, []);

  if (showStartupSplash) {
    return <EntregaiAnimatedSplash onFinish={handleStartupSplashFinish} />;
  }

  return (
    <>
      <RouterProvider router={router} />
      <SystemNoticeHost />
    </>
  );
}
