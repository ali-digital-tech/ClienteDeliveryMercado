import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useApp } from '@/app/providers/AppProvider';
import { EntregaiAnimatedSplash } from '@/shared/components/EntregaiAnimatedSplash';

export function SplashScreen() {
  const navigate = useNavigate();
  const { tenantPath } = useApp();

  const handleFinish = useCallback(() => {
    navigate(tenantPath("welcome"));
  }, [navigate, tenantPath]);

  return <EntregaiAnimatedSplash onFinish={handleFinish} />;
}
