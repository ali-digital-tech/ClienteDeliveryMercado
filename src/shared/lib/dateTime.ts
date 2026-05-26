export const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

export function formatBrasiliaDate(
  value: Date | string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat('pt-BR', {
    ...options,
    timeZone: BRASILIA_TIME_ZONE,
  }).format(typeof value === 'string' ? new Date(value) : value);
}
