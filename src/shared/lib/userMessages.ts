type FriendlyMessage = string | ((match: RegExpMatchArray) => string);

const TECHNICAL_MESSAGE_MAP: Array<{ test: RegExp; message: FriendlyMessage }> = [
  {
    test: /invalid or expired token|jwt expired|token expired|invalid token|unauthorized/i,
    message: "Sua sessão expirou. Entre novamente para continuar.",
  },
  {
    test: /coupon usage limit reached for this customer/i,
    message: "Você já usou este cupom no limite permitido.",
  },
  {
    test: /coupon total usage limit reached/i,
    message: "Este cupom já atingiu o limite de usos.",
  },
  {
    test: /order already has a coupon usage registered/i,
    message: "Este pedido já tem um cupom registrado.",
  },
  {
    test: /coupon is inactive|coupon is not currently valid/i,
    message: "Este cupom não está ativo no momento.",
  },
  {
    test: /coupon is not active yet/i,
    message: "Este cupom ainda não está disponível.",
  },
  {
    test: /coupon has expired/i,
    message: "Este cupom expirou.",
  },
  {
    test: /minimum order value for this coupon is ([0-9]+(?:\.[0-9]+)?)/i,
    message: (match) => `Este cupom exige pedido mínimo de R$ ${Number(match[1]).toFixed(2).replace(".", ",")}.`,
  },
  {
    test: /order subtotal does not meet the coupon minimum amount/i,
    message: "O valor do pedido não atingiu o mínimo exigido para este cupom.",
  },
  {
    test: /coupon not found/i,
    message: "Cupom não encontrado.",
  },
  {
    test: /coupon must belong to the same store as the order/i,
    message: "Este cupom não pertence a este mercado.",
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

  for (const { test, message } of TECHNICAL_MESSAGE_MAP) {
    const match = rawMessage.match(test);
    if (match) return typeof message === "function" ? message(match) : message;
  }

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
