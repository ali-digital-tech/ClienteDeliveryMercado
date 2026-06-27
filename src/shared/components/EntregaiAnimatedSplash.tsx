import { useEffect, useState } from 'react';
import logoName from '@/assets/brand/nome-entregai.svg';
import logoSymbol from '@/assets/brand/logo-entregai.svg';
import './EntregaiAnimatedSplash.css';

type EntregaiAnimatedSplashProps = {
  onFinish?: () => void;
  autoFinish?: boolean;
  finishAfterMs?: number;
};

export function EntregaiAnimatedSplash({
  onFinish,
  autoFinish = true,
  finishAfterMs = 2900,
}: EntregaiAnimatedSplashProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!autoFinish || !onFinish) return;

    const exitTimer = window.setTimeout(() => setExiting(true), finishAfterMs);
    const finishTimer = window.setTimeout(onFinish, finishAfterMs + 420);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
    };
  }, [autoFinish, finishAfterMs, onFinish]);

  return (
    <div className={`entregai-splash${exiting ? ' is-exiting' : ''}`} aria-label="Carregando Entregai">
      <div className="entregai-splash__blur entregai-splash__blur--green" />
      <div className="entregai-splash__blur entregai-splash__blur--blue" />
      <div className="entregai-splash__blur entregai-splash__blur--orange" />

      <div className="entregai-splash__brand">
        <div className="entregai-splash__glow" />

        <div className="entregai-splash__trail" aria-hidden="true">
          <div className="entregai-splash__trail-bar entregai-splash__trail-bar--large" />
          <div className="entregai-splash__trail-bar entregai-splash__trail-bar--medium" />
          <div className="entregai-splash__trail-bar entregai-splash__trail-bar--small" />
        </div>

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
      </div>
    </div>
  );
}
