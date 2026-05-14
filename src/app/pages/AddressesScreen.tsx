import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  createAddress,
  deleteAddress,
  formatAddressLine,
  formatAddressLocation,
  getAddressCoordinates,
  getMyAddresses,
  lookupCep,
  resolveSelectedAddress,
  setAddressAsPrimary,
  setSelectedAddressId,
  type CustomerAddress,
  type CustomerAddressPayload,
} from '@/features/addresses';

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const emptyForm = {
  apelido: '',
  nome_destinatario: '',
  telefone_destinatario: '',
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: 'PE',
  ponto_referencia: '',
  latitude: '',
  longitude: '',
  principal: true,
};

type AddressForm = typeof emptyForm;

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function coordinateFromInput(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function AddressesScreen() {
  const navigate = useNavigate();
  const { currentUser, marketId, tenantPath } = useApp();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const selectedAddress = useMemo(
    () => addresses.find(address => address.id === selected) || addresses.find(address => address.principal) || addresses[0],
    [addresses, selected]
  );
  const formLatitude = coordinateFromInput(form.latitude);
  const formLongitude = coordinateFromInput(form.longitude);
  const formHasCoordinates = formLatitude !== null && formLongitude !== null;

  const loadAddresses = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMyAddresses();
      const resolvedAddress = resolveSelectedAddress(marketId, data);
      setAddresses(data);
      setSelected(current => current || resolvedAddress?.id || null);
      if (resolvedAddress) setSelectedAddressId(marketId, resolvedAddress.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nao foi possivel carregar seus enderecos.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, marketId]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const updateForm = (field: keyof AddressForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSelect = (address: CustomerAddress) => {
    setSelected(address.id);
    setSelectedAddressId(marketId, address.id);
    setTimeout(() => navigate(-1), 250);
  };

  const handleSetPrimary = async (addressId: string) => {
    setError('');

    try {
      const updatedAddress = await setAddressAsPrimary(addressId);
      setAddresses(prev => prev.map(address => ({
        ...address,
        principal: address.id === updatedAddress.id,
      })));
      setSelected(updatedAddress.id);
      setSelectedAddressId(marketId, updatedAddress.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nao foi possivel definir o endereco principal.');
    }
  };

  const handleDelete = async (addressId: string) => {
    setError('');

    try {
      await deleteAddress(addressId);
      setAddresses(prev => prev.filter(address => address.id !== addressId));
      if (selected === addressId) setSelected(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nao foi possivel remover o endereco.');
    }
  };

  const handleCepBlur = async () => {
    const digits = form.cep.replace(/\D/g, '');
    if (digits.length !== 8) return;

    try {
      const address = await lookupCep(form.cep);
      if (!address) return;

      setForm(prev => ({
        ...prev,
        cep: address.cep,
        rua: prev.rua || address.rua,
        bairro: prev.bairro || address.bairro,
        cidade: prev.cidade || address.cidade,
        estado: address.estado || prev.estado,
      }));
    } catch {
      // CEP lookup is a convenience; manual entry remains available.
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Seu navegador nao permite capturar localizacao.');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm(prev => ({
          ...prev,
          latitude: String(Number(position.coords.latitude.toFixed(7))),
          longitude: String(Number(position.coords.longitude.toFixed(7))),
        }));
        setIsLocating(false);
      },
      () => {
        setError('Nao foi possivel acessar sua localizacao.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  };

  const handleSave = async () => {
    setError('');

    const payload: CustomerAddressPayload = {
      apelido: optionalText(form.apelido),
      nome_destinatario: optionalText(form.nome_destinatario),
      telefone_destinatario: optionalText(form.telefone_destinatario),
      cep: form.cep.trim(),
      rua: form.rua.trim(),
      numero: optionalText(form.numero),
      complemento: optionalText(form.complemento),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim().toUpperCase(),
      ponto_referencia: optionalText(form.ponto_referencia),
      latitude: coordinateFromInput(form.latitude),
      longitude: coordinateFromInput(form.longitude),
      principal: addresses.length === 0 ? true : form.principal,
    };

    if (!payload.cep || !payload.rua || !payload.bairro || !payload.cidade || !payload.estado) {
      setError('Preencha CEP, rua, bairro, cidade e UF.');
      return;
    }

    setIsSaving(true);

    try {
      const created = await createAddress(payload);
      setAddresses(prev => [
        created,
        ...prev.map(address => ({ ...address, principal: created.principal ? false : address.principal })),
      ]);
      setSelected(created.id);
      setSelectedAddressId(marketId, created.id);
      setForm(emptyForm);
      setShowForm(false);
      setTimeout(() => navigate(-1), 250);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Nao foi possivel salvar o endereco.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white px-4 pt-12 md:pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="bg-gray-100 rounded-full p-2">
              <ChevronLeft size={20} color="#374151" />
            </button>
            <h1 className="text-gray-800" style={{ fontSize: '18px', fontWeight: 800 }}>Meus Endereços</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8" style={{ background: '#f3f4f6' }}>
          <MapPin size={42} color="#94a3b8" />
          <p className="text-center text-gray-600" style={{ fontSize: '14px', lineHeight: 1.5 }}>
            Entre para cadastrar seus endereços de entrega.
          </p>
          <button
            onClick={() => navigate(tenantPath('login'), { state: { redirectTo: tenantPath('addresses') } })}
            className="rounded-2xl px-6 py-3 text-white"
            style={{ backgroundColor: '#122a4c', fontSize: '14px', fontWeight: 700 }}
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-white px-4 pt-12 md:pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="bg-gray-100 rounded-full p-2">
            <ChevronLeft size={20} color="#374151" />
          </button>
          <div>
            <h1 className="text-gray-800" style={{ fontSize: '18px', fontWeight: 800 }}>Meus Endereços</h1>
            <p className="text-gray-400" style={{ fontSize: '12px' }}>{addresses.length} cadastrado{addresses.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6" style={{ background: '#f3f4f6' }}>
        {error && (
          <div
            className="rounded-2xl px-4 py-3 mb-3"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" color="#122a4c" />
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {addresses.map(address => {
              const isSelected = selectedAddress?.id === address.id;
              const coordinates = getAddressCoordinates(address);

              return (
                <div
                  key={address.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border-2 transition-all"
                  style={{ borderColor: isSelected ? '#16a34a' : 'transparent' }}
                >
                  <button
                    onClick={() => handleSelect(address)}
                    className="w-full text-left flex items-start gap-3"
                  >
                    <div
                      className="rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ width: '42px', height: '42px', backgroundColor: isSelected ? '#f0fdf4' : '#f3f4f6' }}
                    >
                      <MapPin size={20} color={isSelected ? '#16a34a' : '#6b7280'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>
                          {address.apelido || 'Endereço'}
                        </span>
                        {address.principal && (
                          <span className="flex items-center gap-0.5 bg-yellow-100 rounded-full px-2 py-0.5" style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                            <Star size={9} fill="#f59e0b" color="#f59e0b" /> Principal
                          </span>
                        )}
                        {coordinates && (
                          <span className="rounded-full px-2 py-0.5 bg-green-50 text-green-700" style={{ fontSize: '10px', fontWeight: 700 }}>
                            GPS
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                        {formatAddressLine(address)}<br />{formatAddressLocation(address)}
                      </p>
                      {address.ponto_referencia && (
                        <p className="text-gray-400 mt-1" style={{ fontSize: '11px' }}>{address.ponto_referencia}</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: '22px', height: '22px', backgroundColor: '#16a34a' }}>
                        <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                      </div>
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => void handleSetPrimary(address.id)}
                      disabled={address.principal}
                      style={{
                        fontSize: '12px',
                        color: address.principal ? '#94a3b8' : '#122a4c',
                        fontWeight: 700,
                      }}
                    >
                      Tornar principal
                    </button>
                    <div className="flex items-center gap-3">
                      {coordinates && (
                        <a
                          href={buildGoogleMapsSearchUrl(coordinates.latitude, coordinates.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1"
                          style={{ fontSize: '12px', color: '#122a4c', fontWeight: 700 }}
                        >
                          Mapa <ExternalLink size={12} />
                        </a>
                      )}
                      <button onClick={() => void handleDelete(address.id)} className="p-1">
                        <Trash2 size={14} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={form.apelido} onChange={e => updateForm('apelido', e.target.value)} placeholder="Apelido" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
                <input value={form.nome_destinatario} onChange={e => updateForm('nome_destinatario', e.target.value)} placeholder="Nome do destinatário" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
                <input value={form.telefone_destinatario} onChange={e => updateForm('telefone_destinatario', e.target.value)} placeholder="Telefone do destinatário" inputMode="tel" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
                <input value={form.cep} onChange={e => updateForm('cep', e.target.value)} onBlur={handleCepBlur} placeholder="CEP" inputMode="numeric" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
              </div>

              <div className="grid grid-cols-[1fr_110px] gap-3">
                <input value={form.rua} onChange={e => updateForm('rua', e.target.value)} placeholder="Rua / Avenida" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
                <input value={form.numero} onChange={e => updateForm('numero', e.target.value)} placeholder="Número" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
              </div>

              <input value={form.complemento} onChange={e => updateForm('complemento', e.target.value)} placeholder="Complemento" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />

              <div className="grid grid-cols-[1fr_1fr_84px] gap-3">
                <input value={form.bairro} onChange={e => updateForm('bairro', e.target.value)} placeholder="Bairro" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
                <input value={form.cidade} onChange={e => updateForm('cidade', e.target.value)} placeholder="Cidade" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
                <select value={form.estado} onChange={e => updateForm('estado', e.target.value)} className="bg-gray-100 rounded-xl px-3 py-3 outline-none text-gray-700 w-full" style={{ fontSize: '14px' }}>
                  {UF_OPTIONS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>

              <input value={form.ponto_referencia} onChange={e => updateForm('ponto_referencia', e.target.value)} placeholder="Ponto de referência" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                <input value={form.latitude} onChange={e => updateForm('latitude', e.target.value)} placeholder="Latitude" inputMode="decimal" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
                <input value={form.longitude} onChange={e => updateForm('longitude', e.target.value)} placeholder="Longitude" inputMode="decimal" className="bg-gray-100 rounded-xl px-4 py-3 outline-none text-gray-700 placeholder-gray-400 w-full" style={{ fontSize: '14px' }} />
                <button
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="rounded-xl px-4 py-3 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#eef4fb', color: '#122a4c', fontSize: '13px', fontWeight: 700 }}
                >
                  {isLocating ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />}
                  GPS
                </button>
              </div>

              {formHasCoordinates && (
                <div className="overflow-hidden rounded-2xl border border-gray-200">
                  <iframe
                    title="Mapa do endereço"
                    src={buildGoogleMapsEmbedUrl(formLatitude, formLongitude)}
                    className="w-full"
                    style={{ height: '190px', border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <a
                    href={buildGoogleMapsSearchUrl(formLatitude, formLongitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-white px-4 py-3"
                    style={{ fontSize: '13px', color: '#122a4c', fontWeight: 700 }}
                  >
                    Abrir no Google Maps <ExternalLink size={14} />
                  </a>
                </div>
              )}

              <label className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={form.principal}
                  onChange={e => updateForm('principal', e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                  Definir como endereço principal
                </span>
              </label>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-2xl py-3.5 text-white mt-1 flex items-center justify-center gap-2"
                style={{ backgroundColor: isSaving ? '#94a3b8' : '#16a34a', fontSize: '14px', fontWeight: 700 }}
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Salvar endereço
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
