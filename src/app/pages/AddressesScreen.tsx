import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, MapPin, Plus, Star, ChevronRight, X } from 'lucide-react';

const savedAddresses = [
  { id: '1', label: 'Casa', street: 'Rua das Flores, 123', district: 'Jardim Paulista', city: 'São Paulo - SP', isMain: true },
  { id: '2', label: 'Trabalho', street: 'Av. Paulista, 1578', district: 'Bela Vista', city: 'São Paulo - SP', isMain: false },
];

export function AddressesScreen() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState('1');
  const [form, setForm] = useState({ street: '', number: '', district: '', complement: '', reference: '' });

  const handleSelect = (id: string) => {
    setSelected(id);
    setTimeout(() => navigate(-1), 300);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 pt-12 md:pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="bg-gray-100 rounded-full p-2">
            <ChevronLeft size={20} color="#374151" />
          </button>
          <div>
            <h1 className="text-gray-800" style={{ fontSize: '18px', fontWeight: 800 }}>Meus Endereços</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6" style={{ background: '#f3f4f6' }}>
        {/* Saved addresses */}
        <div className="flex flex-col gap-3 mb-4">
          {savedAddresses.map(addr => (
            <button
              key={addr.id}
              onClick={() => handleSelect(addr.id)}
              className="bg-white rounded-2xl p-4 shadow-sm text-left flex items-start gap-3 border-2 transition-all"
              style={{ borderColor: selected === addr.id ? '#16a34a' : 'transparent' }}
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ width: '42px', height: '42px', backgroundColor: selected === addr.id ? '#f0fdf4' : '#f3f4f6' }}>
                <MapPin size={20} color={selected === addr.id ? '#16a34a' : '#6b7280'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>{addr.label}</span>
                  {addr.isMain && (
                    <span className="flex items-center gap-0.5 bg-yellow-100 rounded-full px-2 py-0.5" style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                      <Star size={9} fill="#f59e0b" color="#f59e0b" /> Principal
                    </span>
                  )}
                </div>
                <p className="text-gray-500" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                  {addr.street}<br />{addr.district} · {addr.city}
                </p>
              </div>
              {selected === addr.id && (
                <div className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: '22px', height: '22px', backgroundColor: '#16a34a' }}>
                  <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Add new */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-white rounded-2xl p-4 border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-gray-500 shadow-sm"
          >
            <Plus size={18} color="#16a34a" />
            <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: 600 }}>Adicionar novo endereço</span>
          </button>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>Novo endereço</h3>
              <button onClick={() => setShowForm(false)}>
                <X size={18} color="#6b7280" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { key: 'street', placeholder: 'Rua / Avenida' },
                { key: 'number', placeholder: 'Número' },
                { key: 'district', placeholder: 'Bairro' },
                { key: 'complement', placeholder: 'Complemento (opcional)' },
                { key: 'reference', placeholder: 'Ponto de referência' },
              ].map(({ key, placeholder }) => (
                <input
                  key={key}
                  type="text"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full"
                  style={{ fontSize: '14px' }}
                />
              ))}
              <div className="flex items-center gap-2 py-1">
                <input type="checkbox" id="main" className="w-4 h-4 accent-green-600" />
                <label htmlFor="main" style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                  Definir como endereço principal
                </label>
              </div>
              <button
                onClick={() => { setShowForm(false); navigate(-1); }}
                className="rounded-2xl py-3.5 text-white mt-1"
                style={{ backgroundColor: '#16a34a', fontSize: '14px', fontWeight: 700 }}
              >
                Salvar endereço
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}