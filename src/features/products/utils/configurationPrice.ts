import type { Product, ProductOption, ProductOptionGroup } from '../types/product';
import type { CartItemSelection } from '@/features/cart/types/cart';

export interface ProductSelectionInput {
  groupId: string;
  optionId: string;
  quantity: number;
}

const roundCurrency = (value: number) => Number(value.toFixed(2));

function effectivePrice(
  regular: number | undefined,
  promotional?: number,
  promotionEndsAt?: string,
) {
  const promotionIsActive = promotional != null
    && (!promotionEndsAt || new Date(promotionEndsAt).getTime() >= Date.now());
  return promotionIsActive ? promotional : regular || 0;
}

export function getGroupLimits(group: ProductOptionGroup, variationId?: string) {
  const rule = group.variationRules.find(item => item.productStoreVariationId === variationId);
  return {
    minimum: rule?.minimumSelections ?? group.minimumSelections,
    maximum: rule?.maximumSelections ?? group.maximumSelections,
  };
}

export function isOptionAvailable(option: ProductOption, variationId?: string) {
  if (!option.active) return false;
  const override = option.variationPrices.find(item => item.productStoreVariationId === variationId);
  return override?.available !== false;
}

function getOptionPrice(option: ProductOption, variationId?: string) {
  const override = option.variationPrices.find(item => item.productStoreVariationId === variationId);
  if (override) {
    return effectivePrice(
      override.additionalPrice ?? option.additionalPrice,
      override.promotionalPrice,
      override.promotionEndsAt,
    );
  }
  return effectivePrice(option.additionalPrice, option.promotionalPrice, option.promotionEndsAt);
}

export function priceProductConfiguration(
  product: Product,
  variationId: string | undefined,
  inputs: ProductSelectionInput[],
) {
  const configuration = product.configuration;
  if (!configuration) {
    return { unitPrice: product.price, basePrice: product.price, optionsPrice: 0, selections: [] };
  }

  const variation = configuration.variations.find(item => item.id === variationId);
  let basePrice = variation
    ? effectivePrice(variation.price, variation.promotionalPrice, variation.promotionEndsAt)
    : product.price;
  let optionsPrice = 0;
  const selections: CartItemSelection[] = [];

  for (const group of configuration.groups) {
    const groupInputs = inputs.filter(item => item.groupId === group.id);
    const fraction = group.selectionType === 'fracionada' && groupInputs.length
      ? 1 / groupInputs.length
      : undefined;
    let fractionalPrice = 0;

    for (const input of groupInputs) {
      const option = group.options.find(item => item.id === input.optionId);
      if (!option) continue;
      const quantity = group.allowsQuantity ? input.quantity : 1;
      const unitPrice = getOptionPrice(option, variationId);
      const contribution = group.selectionType === 'fracionada'
        ? roundCurrency(unitPrice * (fraction || 0))
        : roundCurrency(unitPrice * quantity);
      if (group.selectionType === 'fracionada') fractionalPrice += contribution;
      else optionsPrice += contribution;
      selections.push({
        groupId: group.id,
        optionId: option.id,
        groupName: group.name,
        optionName: option.name,
        quantity,
        fraction,
        unitPrice,
        contribution,
      });
    }

    if (group.selectionType === 'fracionada' && group.replacesBasePrice && groupInputs.length) {
      basePrice = roundCurrency(fractionalPrice);
    }
  }

  return {
    basePrice,
    optionsPrice: roundCurrency(optionsPrice),
    unitPrice: roundCurrency(basePrice + optionsPrice),
    selections,
  };
}
