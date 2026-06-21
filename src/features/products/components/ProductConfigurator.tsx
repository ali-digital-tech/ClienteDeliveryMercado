import { ChevronDown, Minus, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CartItem } from '@/features/cart';
import { ProductImage } from './ProductImage';
import {
  getGroupLimits,
  isOptionAvailable,
  priceProductConfiguration,
  type ProductSelectionInput,
} from '../utils/configurationPrice';
import type { Product, ProductOption, ProductOptionGroup } from '../types/product';
import { normalizeSearchText } from '@/shared/utils/searchText';

interface ProductConfiguratorProps {
  product: Product;
  primaryColor: string;
  initialItem?: CartItem;
  onConfirm: (item: Omit<CartItem, 'lineId'>) => void;
}

function countSelections(group: ProductOptionGroup, selections: ProductSelectionInput[]) {
  const selected = selections.filter(item => item.groupId === group.id);
  return group.allowsQuantity && group.selectionType !== 'fracionada'
    ? selected.reduce((total, item) => total + item.quantity, 0)
    : selected.length;
}

function formatMoney(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function isPromotionActive(promotional?: number, promotionEndsAt?: string) {
  return promotional != null && (!promotionEndsAt || new Date(promotionEndsAt).getTime() >= Date.now());
}

function getOptionPriceDetail(option: ProductOption, variationId?: string) {
  const variationPrice = option.variationPrices.find(item => item.productStoreVariationId === variationId);
  const regularPrice = variationPrice?.additionalPrice ?? option.additionalPrice;
  const promotionalPrice = variationPrice
    ? variationPrice.promotionalPrice
    : option.promotionalPrice;
  const promotionEndsAt = variationPrice
    ? variationPrice.promotionEndsAt
    : option.promotionEndsAt;
  const hasPromotion = isPromotionActive(promotionalPrice, promotionEndsAt)
    && promotionalPrice != null
    && promotionalPrice > 0
    && promotionalPrice < regularPrice;

  return {
    price: hasPromotion ? promotionalPrice : regularPrice,
    originalPrice: hasPromotion ? regularPrice : undefined,
    hasPromotion,
  };
}

function getVariationPriceDetail(product: Product, variationId?: string) {
  const variation = product.configuration?.variations.find(item => item.id === variationId);
  if (!variation) {
    const hasPromotion = product.originalPrice != null && product.originalPrice > product.price;
    return {
      price: product.startingPrice ?? product.price,
      originalPrice: hasPromotion ? product.originalPrice : undefined,
      hasPromotion,
    };
  }

  const hasPromotion = isPromotionActive(variation.promotionalPrice, variation.promotionEndsAt)
    && variation.promotionalPrice != null
    && variation.promotionalPrice > 0
    && variation.promotionalPrice < variation.price;

  return {
    price: hasPromotion ? variation.promotionalPrice : variation.price,
    originalPrice: hasPromotion ? variation.price : undefined,
    hasPromotion,
  };
}

function getOptionIndicator(group: ProductOptionGroup, selected: boolean) {
  if (group.selectionType === 'multipla') return selected ? '✓' : '';
  return selected ? '•' : '';
}

export function ProductConfigurator({
  product,
  primaryColor,
  initialItem,
  onConfirm,
}: ProductConfiguratorProps) {
  const configuration = product.configuration;
  const fixedSelections = product.isVirtualOptionProduct ? product.defaultSelections || [] : [];
  const fixedProductGroupIds = new Set<string>();
  if (configuration && fixedSelections.length > 0) {
    for (const group of configuration.groups) {
      if (
        fixedSelections.some(selection =>
          selection.groupId === group.id && group.options.some(option => option.id === selection.optionId)
        )
      ) {
        fixedProductGroupIds.add(group.id);
      }
    }
  }
  const visibleGroups = configuration?.groups
    .filter(group => !fixedProductGroupIds.has(group.id))
    .map(group => product.isVirtualOptionProduct
      ? { ...group, options: group.options.filter(option => option.itemType !== 'produto') }
      : group)
    .filter(group => group.options.length > 0) || [];
  const selectableVariations = configuration?.variations.filter(variation =>
    fixedSelections.every(selection => {
      const group = configuration.groups.find(item => item.id === selection.groupId);
      if (!group) return true;
      const option = group.options.find(item => item.id === selection.optionId);
      return option ? isOptionAvailable(option, variation.id) : false;
    })
  ) || [];
  const [variationId, setVariationId] = useState<string | undefined>(
    initialItem?.productStoreVariationId || product.defaultVariationId || selectableVariations[0]?.id || configuration?.variations[0]?.id,
  );
  const [selections, setSelections] = useState<ProductSelectionInput[]>(
    initialItem?.selections.map(item => ({
      groupId: item.groupId,
      optionId: item.optionId,
      quantity: item.quantity,
    })) || product.defaultSelections || [],
  );
  const [quantity, setQuantity] = useState(initialItem?.qty || 1);
  const [notes, setNotes] = useState(initialItem?.notes || '');
  const [error, setError] = useState('');
  const [optionSearch, setOptionSearch] = useState('');
  const [productCategoryId, setProductCategoryId] = useState('all');
  const productCategories = useMemo(() => {
    const categories = new Map<string, string>();

    visibleGroups.forEach(group => group.options.forEach(option => {
      if (
        (option.itemType === 'produto' || option.itemType === 'produto_e_adicional')
        && option.productCategoryId
      ) {
        categories.set(
          option.productCategoryId,
          option.productCategoryName || 'Outros produtos',
        );
      }
    }));

    return Array.from(categories, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [visibleGroups]);
  const normalizedOptionSearch = normalizeSearchText(optionSearch.trim());
  const filteredGroups = useMemo(() => visibleGroups
    .map(group => ({
      ...group,
      options: group.options.filter(option => {
        const isProductOption = option.itemType === 'produto' || option.itemType === 'produto_e_adicional';
        const matchesCategory = productCategoryId === 'all'
          || !isProductOption
          || option.productCategoryId === productCategoryId;
        const matchesSearch = !normalizedOptionSearch
          || normalizeSearchText(`${option.name} ${option.description || ''} ${option.productCategoryName || ''}`)
            .includes(normalizedOptionSearch);

        return matchesCategory && matchesSearch;
      }),
    }))
    .filter(group => group.options.length > 0), [normalizedOptionSearch, productCategoryId, visibleGroups]);
  const fixedPromotionDetails = fixedSelections
    .map(selection => {
      const group = configuration?.groups.find(item => item.id === selection.groupId);
      const option = group?.options.find(item => item.id === selection.optionId);
      if (!option) return null;
      const detail = getOptionPriceDetail(option, variationId);
      return detail.hasPromotion && detail.originalPrice
        ? `${option.name}: ${formatMoney(detail.originalPrice)} por ${formatMoney(detail.price)}`
        : null;
    })
    .filter(Boolean);
  const price = useMemo(
    () => priceProductConfiguration(product, variationId, selections),
    [product, selections, variationId],
  );
  const validation = useMemo(() => {
    if (!configuration) return { canConfirm: false, issue: 'Configuração indisponível.' };
    if (configuration.variations.length > 0 && !variationId) {
      return { canConfirm: false, issue: 'Escolha o tamanho para continuar.' };
    }
    for (const group of visibleGroups) {
      const limits = getGroupLimits(group, variationId);
      const count = countSelections(group, selections);
      if (count < limits.minimum) {
        return {
          canConfirm: false,
          issue: `${group.name}: escolha pelo menos ${limits.minimum}.`,
        };
      }
      if (count > limits.maximum) {
        return {
          canConfirm: false,
          issue: `${group.name}: escolha no máximo ${limits.maximum}.`,
        };
      }
    }
    return { canConfirm: true, issue: '' };
  }, [configuration, selections, variationId, visibleGroups]);
  const totalPrice = price.unitPrice * quantity;
  const hasSelectedOption = selections.some(selection =>
    visibleGroups.some(group => group.id === selection.groupId),
  );

  if (!configuration) return null;

  const toggleOption = (group: ProductOptionGroup, optionId: string) => {
    setError('');
    setSelections(current => {
      const existing = current.find(item => item.groupId === group.id && item.optionId === optionId);
      if (existing) {
        return current.filter(item => !(item.groupId === group.id && item.optionId === optionId));
      }
      const limits = getGroupLimits(group, variationId);
      if (group.selectionType === 'unica') {
        return [
          ...current.filter(item => item.groupId !== group.id),
          { groupId: group.id, optionId, quantity: 1 },
        ];
      }
      if (countSelections(group, current) >= limits.maximum) {
        setError(`Escolha no máximo ${limits.maximum} opção(ões) em ${group.name}.`);
        return current;
      }
      return [...current, { groupId: group.id, optionId, quantity: 1 }];
    });
  };

  const changeQuantity = (group: ProductOptionGroup, optionId: string, direction: number) => {
    setSelections(current => {
      const selected = current.find(item => item.groupId === group.id && item.optionId === optionId);
      const option = group.options.find(item => item.id === optionId);
      if (!selected || !option) return current;
      if (group.selectionType === 'fracionada') {
        return current.filter(item => !(item.groupId === group.id && item.optionId === optionId));
      }
      const limits = getGroupLimits(group, variationId);
      const nextQuantity = selected.quantity + direction;
      if (nextQuantity <= 0) {
        return current.filter(item => !(item.groupId === group.id && item.optionId === optionId));
      }
      const nextTotal = countSelections(group, current) + direction;
      if (nextQuantity > option.maximumQuantity || nextTotal > limits.maximum) return current;
      return current.map(item =>
        item.groupId === group.id && item.optionId === optionId
          ? { ...item, quantity: nextQuantity }
          : item
      );
    });
  };

  const confirm = () => {
    if (!validation.canConfirm) {
      setError(validation.issue);
      return;
    }
    const variation = configuration.variations.find(item => item.id === variationId);
    onConfirm({
      product: { ...product, price: price.unitPrice },
      qty: quantity,
      productStoreVariationId: variationId,
      variationName: variation?.name,
      selections: price.selections,
      notes: notes.trim() || undefined,
      configurationVersion: configuration.version,
      basePrice: price.basePrice,
      optionsPrice: price.optionsPrice,
    });
  };

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-3 bg-slate-50 p-4">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="h-20 w-20 flex-shrink-0 rounded-xl object-contain p-2"
          iconSize={26}
        />
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
            {visibleGroups.some(group => group.selectionType === 'fracionada') ? 'Monte seu produto' : 'Personalize seu produto'}
          </p>
          <h2 className="line-clamp-2 text-base font-black text-slate-950">{product.name}</h2>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.description}</p>
          )}
          {(() => {
            const baseDetail = getVariationPriceDetail(product, variationId);
            return baseDetail.price > 0 || (baseDetail.originalPrice || 0) > 0 ? (
              <p className="mt-2 text-xs font-bold text-slate-700">
                Base: {baseDetail.originalPrice && (
                  <span className="mr-1 text-slate-400 line-through">{formatMoney(baseDetail.originalPrice)}</span>
                )}
                <span>{formatMoney(baseDetail.price)}</span>
                {baseDetail.hasPromotion && (
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700">
                    Promoção
                  </span>
                )}
              </p>
            ) : null;
          })()}
          {fixedPromotionDetails.length > 0 && (
            <div className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
              Promoção aplicada: {fixedPromotionDetails.join(' · ')}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 pb-0">
      {configuration.variations.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-extrabold text-slate-900">Escolha o tamanho</h2>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700">
              Obrigatório
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectableVariations.map(variation => {
              const detail = getVariationPriceDetail(product, variation.id);
              const selected = variationId === variation.id;
              return (
                <button
                  key={variation.id}
                  type="button"
                  onClick={() => {
                    setVariationId(variation.id);
                    setSelections(current => current.filter(selection => {
                      const group = configuration.groups.find(item => item.id === selection.groupId);
                      const option = group?.options.find(item => item.id === selection.optionId);
                      return option ? isOptionAvailable(option, variation.id) : false;
                    }));
                    setError('');
                  }}
                  className="rounded-xl border px-4 py-2 text-left text-sm font-bold"
                  style={selected
                    ? { borderColor: primaryColor, backgroundColor: primaryColor, color: '#fff' }
                    : { borderColor: '#cbd5e1', color: '#334155' }}
                >
                  <span className="block">{variation.name}</span>
                  {(detail.price > 0 || (detail.originalPrice || 0) > 0) && <span className="block text-xs">
                    {detail.originalPrice && (
                      <span className={`mr-1 line-through ${selected ? 'text-white/70' : 'text-slate-400'}`}>
                        {formatMoney(detail.originalPrice)}
                      </span>
                    )}
                    {formatMoney(detail.price)}
                    {detail.hasPromotion && (
                      <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase ${selected ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        Promo
                      </span>
                    )}
                  </span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {visibleGroups.some(group => group.options.length > 0) && (
        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-slate-700">Buscar adicionais</span>
            <span className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-slate-400">
              <Search size={17} className="flex-shrink-0 text-slate-400" />
              <input
                type="search"
                value={optionSearch}
                onChange={event => setOptionSearch(event.target.value)}
                placeholder="Ex.: bacon, queijo, borda..."
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              {optionSearch && (
                <button
                  type="button"
                  onClick={() => setOptionSearch('')}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Limpar busca de adicionais"
                >
                  <X size={15} />
                </button>
              )}
            </span>
          </label>

          {productCategories.length > 0 && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-slate-700">Categoria dos produtos</span>
              <span className="relative block">
                <select
                  value={productCategoryId}
                  onChange={event => setProductCategoryId(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-slate-400"
                >
                  <option value="all">Todas as categorias</option>
                  {productCategories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </span>
            </label>
          )}
        </div>
      )}

      {filteredGroups.map(group => {
        const limits = getGroupLimits(group, variationId);
        const selectedCount = countSelections(group, selections);
        return (
          <div key={group.id} className="mb-5 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">{group.name}</h2>
                <p className="text-xs text-slate-500">
                  {group.selectionType === 'fracionada'
                    ? `Escolha de ${limits.minimum} até ${limits.maximum} sabor(es).`
                    : group.description || `Escolha de ${limits.minimum} até ${limits.maximum} opção(ões).`}
                </p>
                {group.description && group.selectionType === 'fracionada' && (
                  <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
                )}
              </div>
              <span className="flex flex-shrink-0 flex-col items-end gap-1">
                <span
                  className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-black uppercase"
                  style={limits.minimum > 0
                    ? { backgroundColor: '#fef3c7', color: '#b45309' }
                    : { backgroundColor: '#f1f5f9', color: '#475569' }}
                >
                  {limits.minimum > 0 ? 'Obrigatório' : 'Opcional'}
                </span>
                <span className="whitespace-nowrap text-[10px] font-bold text-slate-500">
                  {selectedCount} de {limits.maximum} selecionado(s)
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {group.options.filter(option => isOptionAvailable(option, variationId)).map(option => {
                const selected = selections.find(item => item.groupId === group.id && item.optionId === option.id);
                const optionPriceDetail = getOptionPriceDetail(option, variationId);
                const optionPrice = optionPriceDetail.price;
                const isFractional = group.selectionType === 'fracionada';
                const canAddFraction = Boolean(selected) || selectedCount < limits.maximum;
                return (
                  <div
                    key={option.id}
                    className="flex items-center gap-3 rounded-xl border p-3"
                    style={{ borderColor: selected ? primaryColor : '#e2e8f0' }}
                  >
                    <button
                      type="button"
                      onClick={() => !isFractional && toggleOption(group, option.id)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      {!isFractional && (
                        <span
                          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border-2 text-xs font-black ${
                            group.selectionType === 'multipla' ? 'rounded-md' : 'rounded-full'
                          }`}
                          style={selected
                            ? { borderColor: primaryColor, color: primaryColor, backgroundColor: '#fff' }
                            : { borderColor: '#cbd5e1', color: 'transparent' }}
                        >
                          {getOptionIndicator(group, Boolean(selected))}
                        </span>
                      )}
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-slate-800">{option.name}</span>
                        {option.description && (
                          <span className="block text-xs text-slate-500">{option.description}</span>
                        )}
                        {optionPrice > 0 && (
                          <span className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                            {optionPriceDetail.originalPrice && (
                              <span className="text-slate-400 line-through">
                                {formatMoney(optionPriceDetail.originalPrice)}
                              </span>
                            )}
                            <span>{isFractional && group.replacesBasePrice ? formatMoney(optionPrice) : `+ ${formatMoney(optionPrice)}`}</span>
                            {optionPriceDetail.hasPromotion && (
                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-700">
                                Promo
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </button>
                    {isFractional ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selected && changeQuantity(group, option.id, -1)}
                          disabled={!selected}
                          className="rounded-full bg-slate-100 p-1 disabled:opacity-40"
                          aria-label={`Remover ${option.name}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-5 text-center text-sm font-black">{selected ? 1 : 0}</span>
                        <button
                          type="button"
                          onClick={() => !selected && toggleOption(group, option.id)}
                          disabled={!canAddFraction || Boolean(selected)}
                          className="rounded-full bg-slate-100 p-1 disabled:opacity-40"
                          aria-label={`Adicionar ${option.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : selected && group.allowsQuantity ? (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => changeQuantity(group, option.id, -1)} className="rounded-full bg-slate-100 p-1">
                          <Minus size={14} />
                        </button>
                        <span className="min-w-4 text-center text-sm font-bold">{selected.quantity}</span>
                        <button type="button" onClick={() => changeQuantity(group, option.id, 1)} className="rounded-full bg-slate-100 p-1">
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filteredGroups.length === 0 && (normalizedOptionSearch || productCategoryId !== 'all') && (
        <div className="mb-5 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhum adicional encontrado</p>
          <button
            type="button"
            onClick={() => {
              setOptionSearch('');
              setProductCategoryId('all');
            }}
            className="mt-2 text-xs font-extrabold"
            style={{ color: primaryColor }}
          >
            Limpar filtros
          </button>
        </div>
      )}

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-bold text-slate-800">Observações</span>
        <textarea
          value={notes}
          onChange={event => setNotes(event.target.value)}
          maxLength={500}
          placeholder="Ex.: sem cebola, cortar em 8 pedaços"
          className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none"
        />
      </label>
      </div>
      {hasSelectedOption && <div className="h-40" aria-hidden="true" />}
      <div className={hasSelectedOption
        ? 'fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-xl border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_24px_rgba(15,23,42,0.12)]'
        : 'border-t border-slate-100 bg-white p-4 shadow-[0_-12px_24px_rgba(15,23,42,0.06)]'}>
        {(error || !validation.canConfirm) && (
          <p className={`mb-3 text-sm font-semibold ${error ? 'text-red-600' : 'text-slate-500'}`}>
            {error || validation.issue}
          </p>
        )}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total do item</p>
            <p className="text-lg font-black text-slate-950">{formatMoney(totalPrice)}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setQuantity(current => Math.max(1, current - 1))}
              className="rounded-full bg-white p-2 text-slate-700 shadow-sm"
              aria-label="Diminuir quantidade"
            >
              <Minus size={14} />
            </button>
            <span className="min-w-7 text-center text-sm font-black">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(current => current + 1)}
              className="rounded-full bg-white p-2 text-slate-700 shadow-sm"
              aria-label="Aumentar quantidade"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      <button
        type="button"
        onClick={confirm}
        disabled={!validation.canConfirm}
        className="w-full rounded-xl px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: validation.canConfirm ? primaryColor : '#94a3b8' }}
      >
        {initialItem ? 'Salvar alterações' : 'Adicionar ao carrinho'} · {formatMoney(totalPrice)}
      </button>
      </div>
    </section>
  );
}
