import { useEffect, useMemo, useState } from 'react';
import logoName from '@/assets/brand/nome-entregai.svg';
import logoSymbol from '@/assets/brand/logo-entregai.svg';
import './EntregaiAnimatedSplash.css';

type EntregaiAnimatedSplashProps = {
  onFinish?: () => void;
  autoFinish?: boolean;
  finishAfterMs?: number;
  storeLogo?: string | null;
  storeName?: string | null;
};

export function EntregaiAnimatedSplash({
  onFinish,
  autoFinish = true,
  finishAfterMs = 2900,
  storeLogo,
  storeName,
}: EntregaiAnimatedSplashProps) {
  const [exiting, setExiting] = useState(false);
  const [storeLogoFailed, setStoreLogoFailed] = useState(false);
  const hasStoreBrand = Boolean(storeName || storeLogo);
  const storeInitials = useMemo(() => {
    const words = storeName?.trim().split(/\s+/).filter(Boolean) || [];
    return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'LO';
  }, [storeName]);

  useEffect(() => {
    if (!autoFinish || !onFinish) return;

    const exitTimer = window.setTimeout(() => setExiting(true), finishAfterMs);
    const finishTimer = window.setTimeout(onFinish, finishAfterMs + 420);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, [autoFinish, finishAfterMs, onFinish]);

  useEffect(() => {
    setExiting(false);
  }, [storeLogo, storeName]);

  useEffect(() => {
    setStoreLogoFailed(false);
  }, [storeLogo]);

  return (
    <div
      className={`entregai-splash${exiting ? ' is-exiting' : ''}`}
      aria-label={hasStoreBrand ? `Carregando ${storeName || 'loja'} no Entregai` : 'Carregando Entregai'}
    >
      <div className="entregai-splash__blur entregai-splash__blur--green" />
      <div className="entregai-splash__blur entregai-splash__blur--blue" />
      <div className="entregai-splash__blur entregai-splash__blur--orange" />

      <div className={`entregai-splash__brand${hasStoreBrand ? ' entregai-splash__brand--store' : ''}`}>
        <div className="entregai-splash__glow" />

        <div className="entregai-splash__trail" aria-hidden="true">
          <div className="entregai-splash__trail-bar entregai-splash__trail-bar--large" />
          <div className="entregai-splash__trail-bar entregai-splash__trail-bar--medium" />
          <div className="entregai-splash__trail-bar entregai-splash__trail-bar--small" />
        </div>

        {hasStoreBrand ? (
          <div className="entregai-splash__store-lockup">
            <div className="entregai-splash__store-card entregai-splash__store-card--market">
              <span className="entregai-splash__store-logo-box">
                {storeLogo && !storeLogoFailed ? (
                  <img
                    className="entregai-splash__store-logo"
                    src={storeLogo}
                    alt=""
                    draggable={false}
                    onError={() => setStoreLogoFailed(true)}
                  />
                ) : (
                  <span className="entregai-splash__store-initials">{storeInitials}</span>
                )}
              </span>
              <span className="entregai-splash__store-name">{storeName || 'Sua loja'}</span>
            </div>

            <span className="entregai-splash__store-plus" aria-hidden="true">+</span>

            <div className="entregai-splash__store-card entregai-splash__store-card--entregai">
              <span className="entregai-splash__store-logo-box entregai-splash__store-logo-box--entregai">
                <img className="entregai-splash__store-logo" src={logoSymbol} alt="" draggable={false} />
              </span>
              <img className="entregai-splash__store-entregai-name" src={logoName} alt="Entregai" draggable={false} />
            </div>

            <span className="entregai-splash__store-loading">Carregando loja</span>
          </div>
        ) : (
          <>
            <div className="entregai-splash__icon-stage">
              <div className="entregai-splash__icon-reveal">
                <span className="entregai-splash__icon-box">
                  <img className="entregai-splash__icon" src={logoSymbol} alt="" draggable={false} />
                </span>
              </div>
            </div>

            <div className="entregai-splash__name-stage">
              <img className="entregai-splash__name" src={logoName} alt="Entregai" draggable={false} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
