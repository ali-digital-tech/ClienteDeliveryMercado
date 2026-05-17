const TECHNICAL_MESSAGE_MAP: Array<{ test: RegExp; message: string }> = [
  {
    test: /invalid or expired token|jwt expired|token expired|invalid token|unauthorized/i,
    message: "Sua sessão expirou. Entre novamente para continuar.",
  },
  {
    test: /failed to fetch|networkerror|network request failed|load failed/i,
    message: "Não foi possível conectar. Verifique sua internet e tente novamente.",
  },
  {
    test: /forbidden|permission denied|access denied/i,
    message: "Você não tem permissão para realizar esta ação.",
  },
  {
    test: /not found/i,
    message: "Não encontramos as informações solicitadas.",
  },
  {
    test: /internal server error|server error|erro interno/i,
    message: "Não foi possível concluir agora. Tente novamente em instantes.",
  },
  {
    test: /token do cartão ausente/i,
    message: "Confirme os dados do cartão antes de continuar.",
  },
];

function extractMessage(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    const objectValue = value as {
      message?: unknown;
      error?: unknown;
      payload?: unknown;
      response?: { data?: unknown };
    };

    return (
      extractMessage(objectValue.message) ||
      extractMessage(objectValue.error) ||
      extractMessage(objectValue.payload) ||
      extractMessage(objectValue.response?.data)
    );
  }

  return "";
}

export function getFriendlyMessage(
  value: unknown,
  fallback = "Não foi possível concluir a operação. Tente novamente.",
) {
  const rawMessage = extractMessage(value).trim();
  const mapped = TECHNICAL_MESSAGE_MAP.find(({ test }) => test.test(rawMessage));

  if (mapped) return mapped.message;
  if (!rawMessage) return fallback;

  return rawMessage
    .replace(/\bNao\b/g, "Não")
    .replace(/\bnao\b/g, "não")
    .replace(/\bcartao\b/g, "cartão")
    .replace(/\bendereco\b/g, "endereço")
    .replace(/\bdigitos\b/g, "dígitos")
    .replace(/\bcodigo\b/g, "código")
    .replace(/\blocalizacao\b/g, "localização")
    .replace(/\bpossivel\b/g, "possível");
}
