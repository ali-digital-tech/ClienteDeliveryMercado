import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useApp } from '@/app/providers/AppProvider';

export function SplashScreen() {
  const navigate = useNavigate();
  const { currentMarket, tenantPath } = useApp();
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = currentMarket.logo && !logoFailed;

  useEffect(() => {
    const timer = setTimeout(() => navigate(tenantPath("welcome")), 2200);
    return () => clearTimeout(timer);
  }, [navigate, tenantPath]);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-6"
      style={{
        background: `linear-gradient(160deg, ${currentMarket.secondaryColor} 0%, ${currentMarket.primaryColor} 100%)`,
      }}
    >
      <div className="flex flex-col items-center gap-5">
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: "132px",
            height: "132px",
            borderRadius: "28px",
            backgroundColor: "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          {showLogo ? (
            <img
              src={currentMarket.logo}
              alt={currentMarket.name}
              className="h-full w-full object-cover"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span style={{ fontSize: "56px" }}>🛒</span>
          )}
        </div>

        <div className="text-center">
          <h1
            className="text-white"
            style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.1 }}
          >
            {currentMarket.name}
          </h1>
          <p
            className="mt-2 max-w-xs text-white/80"
            style={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.5 }}
          >
            {currentMarket.description}
          </p>
          <p className="mt-2 text-white/70" style={{ fontSize: "12px", fontWeight: 600 }}>
            Entregas por ordem de pedido
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full bg-white"
            style={{
              width: i === 1 ? "20px" : "8px",
              height: "8px",
              opacity: i === 0 ? 1 : 0.4,
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      <p
        className="absolute bottom-12 text-white/75"
        style={{ fontSize: "12px" }}
      >
        Carregando...
      </p>
    </div>
  );
}
