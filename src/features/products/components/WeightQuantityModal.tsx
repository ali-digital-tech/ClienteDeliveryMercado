import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Product } from '../types/product';
import { formatCartQuantity, getProductMinQty, getProductStepQty, roundCartQuantity } from '@/features/cart';

interface WeightQuantityModalProps {
  product: Product;
  primaryColor: string;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

function formatMoney(value: number) {
  return value.toFixed(2).replace('.', ',');
}

function parseQuantityInput(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? roundCartQuantity(parsed) : 0;
}

function matchesStep(value: number, minimum: number, step: number) {
  const stepInt = Math.round(step * 1000);
  if (stepInt <= 0) return false;
  return Math.round((value - minimum) * 1000) % stepInt === 0;
}

export function WeightQuantityModal({ product, primaryColor, onClose, onConfirm }: WeightQuantityModalProps) {
  const minimum = getProductMinQty(product);
  const step = getProductStepQty(product);
  const [quantity, setQuantity] = useState(minimum);
  const [customValue, setCustomValue] = useState(String(minimum).replace('.', ','));

  const quickQuantities = useMemo(() => {
    const values = [minimum, 0.5, 1, 1.5, 2]
      .map(value => roundCartQuantity(Math.max(minimum, value)))
      .filter(value => matchesStep(value, minimum, step));

    return Array.from(new Set(values));
  }, [minimum, step]);

  const updateQuantity = (nextQuantity: number) => {
    setQuantity(nextQuantity);
    setCustomValue(String(nextQuantity).replace('.', ','));
  };

  const applyCustomValue = (value: string) => {
    setCustomValue(value);
    const parsed = parseQuantityInput(value);
    if (parsed > 0) setQuantity(parsed);
  };

  const isBelowMinimum = quantity < minimum;
  const isInvalidIncrement = !matchesStep(quantity, minimum, step);
  const canConfirm = !isBelowMinimum && !isInvalidIncrement;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl md:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-slate-900" style={{ fontSize: '18px', fontWeight: 800 }}>Escolher peso</h2>
            <p className="mt-1 text-slate-500" style={{ fontSize: '12px' }}>
              {product.name} - R$ {formatMoney(product.price)}/kg
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2">
            <X size={18} color="#334155" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {quickQuantities.map(value => (
            <button
              key={value}
              onClick={() => updateQuantity(value)}
              className="rounded-xl border px-3 py-3 text-sm font-bold transition-colors"
              style={quantity === value ? { backgroundColor: primaryColor, borderColor: primaryColor, color: 'white' } : { borderColor: '#e2e8f0', color: '#334155' }}
            >
              {formatCartQuantity(value, product)}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-bold uppercase text-slate-500">Outro peso em kg</label>
        <input
          value={customValue}
          onChange={event => applyCustomValue(event.target.value)}
          inputMode="decimal"
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold outline-none"
          placeholder="0,500"
        />

        <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Peso mínimo</span>
            <span className="font-bold text-slate-700">{formatCartQuantity(minimum, product)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-slate-500">Incremento</span>
            <span className="font-bold text-slate-700">{formatCartQuantity(step, product)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-bold text-slate-700">Total estimado</span>
            <span className="font-extrabold" style={{ color: primaryColor }}>R$ {formatMoney(product.price * quantity)}</span>
          </div>
        </div>

        {!canConfirm && (
          <p className="mt-3 text-sm font-semibold text-red-600">
            Informe no mínimo {formatCartQuantity(minimum, product)} e respeite incrementos de {formatCartQuantity(step, product)}.
          </p>
        )}

        <button
          onClick={() => canConfirm && onConfirm(quantity)}
          disabled={!canConfirm}
          className="mt-4 w-full rounded-2xl py-4 text-white disabled:opacity-50"
          style={{ backgroundColor: primaryColor, fontSize: '15px', fontWeight: 800 }}
        >
          Adicionar {formatCartQuantity(quantity, product)}
        </button>
      </div>
    </div>
  );
}
