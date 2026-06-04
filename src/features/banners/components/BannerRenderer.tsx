import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '@/app/providers/AppProvider';
import { trackBannerEvent } from '../services/bannersService';
import type { Banner, BannerPageKey, BannerPlacementKey } from '../types/banner';

interface BannerRendererProps {
  banners: Banner[];
  placement: BannerPlacementKey;
  page: BannerPageKey;
  className?: string;
}

const viewed = new Set<string>();

const getBannerPlacements = (banner: Banner) => (
  banner.placement_keys?.length ? banner.placement_keys : [banner.placement_key]
);

export function BannerRenderer({ banners, placement, page, className = '' }: BannerRendererProps) {
  const navigate = useNavigate();
  const { marketId, tenantPath } = useApp();
  const [dismissedModals, setDismissedModals] = useState<Record<string, boolean>>({});

  const visible = useMemo(
    () => banners.filter((banner) => getBannerPlacements(banner).includes(placement)),
    [banners, placement],
  );

  useEffect(() => {
    visible.forEach((banner) => {
      const viewKey = `${marketId}:${page}:${placement}:${banner.id}`;
      if (viewed.has(viewKey)) return;
      viewed.add(viewKey);
      trackBannerEvent(marketId, banner.id, 'view', page, { placement_key: placement });
    });
  }, [marketId, page, placement, visible]);

  const openBanner = (banner: Banner) => {
    trackBannerEvent(marketId, banner.id, 'click', page, { placement_key: placement });
    navigate(`${tenantPath('produtos')}?banner=${encodeURIComponent(banner.id)}`);
  };

  const getModalStorageKey = (banner: Banner) => `cliente_delivery_banner_modal_${marketId}_${banner.id}`;
  const isModalDismissed = (banner: Banner) => (
    dismissedModals[banner.id] || localStorage.getItem(getModalStorageKey(banner)) === 'seen'
  );

  const inlineBanners = visible.filter((banner) => (
    banner.display_type !== 'modal' || isModalDismissed(banner)
  ));
  const modalBanner = visible.find((banner) => (
    banner.display_type === 'modal' && !isModalDismissed(banner)
  ));

  const closeModal = (banner: Banner) => {
    localStorage.setItem(getModalStorageKey(banner), 'seen');
    setDismissedModals((current) => ({ ...current, [banner.id]: true }));
  };

  if (visible.length === 0) return null;

  return (
    <>
      {inlineBanners.length > 0 && (
        <div className={className}>
          <div className={inlineBanners.some((banner) => banner.display_type === 'full_width') ? 'space-y-3' : 'flex gap-3 overflow-x-auto pb-1 scrollbar-hide'} style={{ scrollSnapType: 'x mandatory' }}>
            {inlineBanners.map((banner) => (
              <button
                key={banner.id}
                onClick={() => openBanner(banner)}
                className={`relative flex-shrink-0 overflow-hidden text-left shadow-sm ${banner.display_type === 'fixed' ? 'sticky top-2 z-10' : ''}`}
                style={{
                  width: banner.display_type === 'full_width' || banner.display_type === 'fixed' ? '100%' : '280px',
                  height: banner.display_type === 'full_width' || banner.display_type === 'fixed' ? '118px' : '140px',
                  borderRadius: '16px',
                  scrollSnapAlign: 'start',
                }}
              >
                <img src={banner.imagem_url} alt={banner.titulo} className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${banner.background_color || '#122a4c'}ee 0%, ${banner.background_color || '#122a4c'}55 100%)` }} />
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <h3 className="text-white" style={{ fontSize: '21px', fontWeight: 800, lineHeight: 1.1 }}>{banner.titulo}</h3>
                  {banner.subtitulo && <p className="text-white/85 mt-1" style={{ fontSize: '12px' }}>{banner.subtitulo}</p>}
                  <span className="mt-2 bg-white rounded-full px-3 py-1 self-start" style={{ fontSize: '11px', fontWeight: 700, color: '#122a4c' }}>
                    {banner.cta_text || 'Ver ofertas'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {modalBanner && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
            <button onClick={() => closeModal(modalBanner)} className="absolute right-3 top-3 z-10 rounded-full bg-black/35 p-1.5 text-white">
              <X size={18} />
            </button>
            <button onClick={() => openBanner(modalBanner)} className="block w-full text-left">
              <div className="relative h-60">
                <img src={modalBanner.imagem_url} alt={modalBanner.titulo} className="h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${modalBanner.background_color || '#122a4c'}ee 0%, transparent 80%)` }} />
                <div className="absolute bottom-0 p-5 text-white">
                  <h3 className="text-2xl font-extrabold">{modalBanner.titulo}</h3>
                  {modalBanner.subtitulo && <p className="mt-1 text-sm text-white/85">{modalBanner.subtitulo}</p>}
                </div>
              </div>
              <div className="p-4">
                <span className="block rounded-2xl py-3 text-center text-sm font-bold text-white" style={{ backgroundColor: '#122a4c' }}>
                  {modalBanner.cta_text || 'Ver ofertas'}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
