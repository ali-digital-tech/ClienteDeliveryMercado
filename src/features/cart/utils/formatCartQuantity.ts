export function toCartQuantityNumber(quantity: number | string) {
  const value = typeof quantity === 'string' ? Number(quantity) : quantity;
  return Number.isFinite(value) ? value : 0;
}

export function formatCartQuantity(quantity: number | string) {
  const value = toCartQuantityNumber(quantity);

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}
