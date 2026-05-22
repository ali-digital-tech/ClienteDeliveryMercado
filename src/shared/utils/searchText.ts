export function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchTextIncludes(value: unknown, query: unknown) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  return normalizeSearchText(value).includes(normalizedQuery);
}
