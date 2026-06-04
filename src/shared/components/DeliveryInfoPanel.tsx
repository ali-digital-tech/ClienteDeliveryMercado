import { Clock, Star, Truck, Shield, Leaf } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';

export function DeliveryInfoPanel() {
  const { currentMarket } = useApp();

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Delivery info card */}
      <div
        className="rounded-2xl p-4 text-white"
        style={{ background: 'linear-gradient(160deg, #1b3d6d 0%, #122a4c 100%)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="rounded-full flex-shrink-0"
            style={{ width: '8px', height: '8px', backgroundColor: '#4ade80' }}
          />
          <p style={{ fontSize: '11px', color: '#c7d7ee', fontWeight: 600 }}>ENTREGA ATIVA</p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <Clock size={13} color="#4ade80" />
          <p style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>Entrega em até 45 min</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <p className="mb-3" style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
          Por que escolher {currentMarket.name}?
        </p>
        <div className="flex flex-col gap-3">
          {[
            { icon: Star, color: '#f59e0b', text: 'Produtos frescos e selecionados' },
            { icon: Truck, color: '#3b82f6', text: 'Entrega rápida e rastreável' },
            { icon: Shield, color: '#8b5cf6', text: 'Compra 100% segura' },
            { icon: Leaf, color: '#16a34a', text: 'Produtos orgânicos disponíveis' },
          ].map(({ icon: Icon, color, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <div
                className="rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ width: '28px', height: '28px', backgroundColor: `${color}18` }}
              >
                <Icon size={14} color={color} />
              </div>
              <p style={{ fontSize: '12px', color: '#4b5563', fontWeight: 500 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Promo code */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{ background: '#f0fdf4', border: '1.5px dashed #86efac' }}
      >
        <p style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, marginBottom: '4px' }}>
          🎁 CUPOM ESPECIAL
        </p>
        <p
          className="rounded-lg px-3 py-1 inline-block"
          style={{ fontSize: '18px', fontWeight: 800, color: '#166534', background: '#dcfce7', letterSpacing: '0.05em' }}
        >
          PROMO10
        </p>
        <p style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>R$10 OFF na sua compra</p>
      </div>
    </div>
  );
}
