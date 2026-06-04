type FriendlyMessage = string | ((match: RegExpMatchArray) => string);

const TECHNICAL_MESSAGE_MAP: Array<{ test: RegExp; message: FriendlyMessage }> = [
  {
    test: /invalid login credentials|invalid credentials|email or password are invalid/i,
    message: "E-mail ou senha incorretos. Verifique os dados e tente novamente.",
  },
  {
    test: /too many login attempts|muitas tentativas de login/i,
    message: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
  },
  {
    test: /too many authentication requests|muitas tentativas de autenticação/i,
    message: "Muitas tentativas de autenticação. Aguarde alguns minutos e tente novamente.",
  },
  {
    test: /too many requests|muitas requisições/i,
    message: "Muitas requisições. Aguarde um instante e tente novamente.",
  },
  {
    test: /missing authorization token|authentication required|not authenticated/i,
    message: "Faça login para continuar.",
  },
  {
    test: /invalid token format|invalid or expired token|jwt expired|token expired|invalid token|invalid jwt|invalid refresh token|unauthorized/i,
    message: "Sua sessão expirou. Entre novamente para continuar.",
  },
  {
    test: /email must be a valid email address/i,
    message: "Informe um e-mail válido.",
  },
  {
    test: /password is required|email and password are required/i,
    message: "Informe e-mail e senha.",
  },
  {
    test: /senha atual inválida|current password/i,
    message: "Senha atual incorreta. Verifique e tente novamente.",
  },
  {
    test: /digite excluir para confirmar/i,
    message: "Digite EXCLUIR para confirmar a exclusão da conta.",
  },
  {
    test: /cpf already registered/i,
    message: "Este CPF já está cadastrado.",
  },
  {
    test: /email already registered/i,
    message: "Este e-mail já está cadastrado.",
  },
  {
    test: /phone number already registered/i,
    message: "Este telefone já está cadastrado.",
  },
  {
    test: /customer already registered/i,
    message: "Já existe um cadastro com esses dados.",
  },
  {
    test: /coupon validated successfully/i,
    message: "Cupom aplicado com sucesso.",
  },
  {
    test: /(?:created|updated|deleted|connected) successfully|(?:card|pix|boleto) payment created|refund created/i,
    message: "Operação concluída com sucesso.",
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
    test: /customer address not found/i,
    message: "Endereço não encontrado.",
  },
  {
    test: /customer not found/i,
    message: "Cliente não encontrado.",
  },
  {
    test: /active cart not found|cart not found/i,
    message: "Carrinho não encontrado.",
  },
  {
    test: /cart must be active to (?:change items|create an order)/i,
    message: "Este carrinho não está mais ativo.",
  },
  {
    test: /cart item not found/i,
    message: "Item não encontrado no carrinho.",
  },
  {
    test: /cart must have at least one item to create an order/i,
    message: "Adicione produtos ao carrinho antes de finalizar o pedido.",
  },
  {
    test: /order already exists for this cart/i,
    message: "Este carrinho já gerou um pedido.",
  },
  {
    test: /order not found/i,
    message: "Pedido não encontrado.",
  },
  {
    test: /product not found/i,
    message: "Produto não encontrado.",
  },
  {
    test: /store not found/i,
    message: "Mercado não encontrado.",
  },
  {
    test: /this order already has an approved payment/i,
    message: "Este pedido já possui um pagamento aprovado.",
  },
  {
    test: /payment not found/i,
    message: "Pagamento não encontrado.",
  },
  {
    test: /no active delivery area found for order/i,
    message: "Nenhuma área de entrega ativa foi encontrada para este pedido.",
  },
  {
    test: /collector.*hasn'?t enough available money|refund failed.*available money/i,
    message: "O recebedor não possui saldo disponível suficiente para concluir o reembolso.",
  },
  {
    test: /refund failed/i,
    message: "Não foi possível realizar o reembolso. Tente novamente em instantes.",
  },
  {
    test: /failed to fetch payment methods/i,
    message: "Não foi possível carregar as formas de pagamento.",
  },
  {
    test: /security_code_token|token de segurança do cartão|security code token|cvv/i,
    message: "Informe o CVV do cartão salvo para continuar.",
  },
  {
    test: /token do cartão salvo|saved card.*token|card token.*saved/i,
    message: "Valide o CVV do cartão salvo antes de concluir o pagamento.",
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

const UNTRANSLATED_TECHNICAL_MESSAGE = /\b(?:missing|required|must|invalid|unauthorized|forbidden|not found|already|cannot|unable|failed|successfully|created|updated|deleted|expired|declined|rejected|wrong|unknown|unsupported|this|your|the|is|are|was|were|does|could|please|with|without)\b|error (?:finding|saving|processing|creating|updating|deleting|loading)/i;

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

  if (UNTRANSLATED_TECHNICAL_MESSAGE.test(rawMessage)) {
    return fallback;
  }

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
