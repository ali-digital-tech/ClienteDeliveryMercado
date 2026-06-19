import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { BellRing, Check, Loader2, Minus, Plus, Receipt, ShoppingCart, Trash2, UtensilsCrossed } from "lucide-react";
import { getProductsByMarketId, type Product } from "@/features/products";
import { salaoQrService } from "@/features/salao/services/salaoQrService";

const money = (value: unknown) => `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

type CartItem = {
  lineId: string;
  product: Product;
  quantity: number;
  notes: string;
};

const getDeviceId = () => {
  const key = "salao_device_id";
  const current = localStorage.getItem(key);
  if (current) return current;
  const next = crypto.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, next);
  return next;
};

export function TableQrPage() {
  const { marketId = "", qrToken = "" } = useParams();
  const [context, setContext] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [pin, setPin] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [participantToken, setParticipantToken] = useState(() => localStorage.getItem(`salao_participant_${qrToken}`) || "");
  const deviceId = useMemo(getDeviceId, []);

  const tableLabel = useMemo(() => {
    const mesa = context?.mesa;
    return mesa?.nome || (mesa?.numero ? `Mesa ${mesa.numero}` : "Mesa");
  }, [context]);

  const comanda = context?.comanda;
  const canOrder = comanda?.status === "aberta" && Boolean(participantToken);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0);

  const load = async (silent = false) => {
    if (!marketId || !qrToken) return;
    if (!silent) setLoading(true);
    try {
      const [ctx, catalog] = await Promise.all([
        salaoQrService.getContext(qrToken),
        getProductsByMarketId(marketId, { perPage: 100 }),
      ]);
      setContext(ctx);
      setProducts(catalog.products);
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível abrir o cardápio da mesa.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 10000);
    return () => window.clearInterval(interval);
  }, [marketId, qrToken]);

  const requestOpening = async () => {
    setBusy("opening");
    setNotice("");
    try {
      await salaoQrService.requestOpening(qrToken, {
        dispositivo_id: deviceId,
        nome_cliente: customerName.trim() || "Cliente",
      });
      setNotice("Solicitação enviada. Aguarde a liberação do atendente.");
      await load(true);
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível solicitar abertura da mesa.");
    } finally {
      setBusy("");
    }
  };

  const validatePin = async () => {
    if (!/^\d{4}$/.test(pin.trim())) {
      setNotice("Digite o PIN de 4 dígitos informado pelo atendente.");
      return;
    }
    setBusy("pin");
    setNotice("");
    try {
      const result = await salaoQrService.validatePin(qrToken, {
        pin: pin.trim(),
        dispositivo_id: deviceId,
        nome_cliente: customerName.trim() || "Cliente",
      });
      localStorage.setItem(`salao_participant_${qrToken}`, result.token);
      setParticipantToken(result.token);
      setPin("");
      setNotice("PIN validado. Você já pode enviar pedidos.");
    } catch (error: any) {
      setNotice(error?.message || "PIN inválido.");
    } finally {
      setBusy("");
    }
  };

  const addProduct = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id && !item.notes);
      if (existing) {
        return current.map((item) => (item.lineId === existing.lineId ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { lineId: crypto.randomUUID?.() || `${product.id}-${Date.now()}`, product, quantity: 1, notes: "" }];
    });
  };

  const updateQuantity = (lineId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) => (item.lineId === lineId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const sendCart = async () => {
    if (!canOrder) {
      setNotice("Valide o PIN da mesa antes de enviar o pedido.");
      return;
    }
    if (!cart.length) return;
    setBusy("cart");
    setNotice("");
    try {
      await salaoQrService.sendOrder(qrToken, participantToken, {
        itens: cart.map((item) => ({
          produto_loja_id: item.product.storeProductId || item.product.id,
          produto_id: item.product.catalogProductId,
          quantidade: item.quantity,
          observacoes: item.notes.trim() || undefined,
        })),
      });
      setCart([]);
      setNotice("Pedido enviado para a cozinha.");
      await load(true);
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível enviar o pedido.");
    } finally {
      setBusy("");
    }
  };

  const callWaiter = async () => {
    setNotice("");
    try {
      await salaoQrService.callWaiter(qrToken);
      setNotice("Garçom chamado. Aguarde o atendimento.");
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível chamar o garçom.");
    }
  };

  const requestBill = async (type: "inteira" | "individual") => {
    if (!participantToken) {
      setNotice("Valide o PIN da mesa antes de solicitar a conta.");
      return;
    }
    setBusy(`bill-${type}`);
    setNotice("");
    try {
      await salaoQrService.requestBill(qrToken, participantToken, { tipo: type });
      setNotice("Conta solicitada. Novos pedidos foram bloqueados para esta mesa.");
      await load(true);
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível solicitar a conta.");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Abrindo cardápio...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
              <UtensilsCrossed className="h-4 w-4" />
              {context?.mesa?.loja_nome || "Restaurante"}
            </div>
            <h1 className="text-xl font-semibold text-gray-950">{tableLabel}</h1>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            QR Mesa
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        {notice && (
          <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {notice}
          </div>
        )}

        <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          {!comanda ? (
            <div className="space-y-3">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Seu nome"
                className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
              />
              <button
                onClick={() => void requestOpening()}
                disabled={busy === "opening"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy === "opening" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Solicitar abertura da mesa
              </button>
            </div>
          ) : comanda.status !== "aberta" ? (
            <div className="text-sm font-medium text-blue-800">
              {comanda.status === "fechada" ? "Conta fechada. Aguarde o pagamento presencial." : "Conta solicitada. Novos pedidos estão bloqueados."}
            </div>
          ) : !participantToken ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Seu nome"
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm"
              />
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="PIN"
                inputMode="numeric"
                className="h-11 rounded-lg border border-gray-300 px-3 text-center text-lg font-semibold tracking-widest"
              />
              <button
                onClick={() => void validatePin()}
                disabled={busy === "pin"}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy === "pin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Validar
              </button>
            </div>
          ) : (
            <div className="text-sm font-medium text-emerald-700">PIN validado. Monte seu carrinho e envie quando estiver pronto.</div>
          )}
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => void callWaiter()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm"
          >
            <BellRing className="h-4 w-4" />
            Chamar garçom
          </button>
          <button
            onClick={() => void requestBill("inteira")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm"
          >
            <Receipt className="h-4 w-4" />
            Conta inteira
          </button>
          <button
            onClick={() => void requestBill("individual")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm"
          >
            <Receipt className="h-4 w-4" />
            Minha conta
          </button>
        </div>

        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              {product.image ? (
                <img src={product.image} alt={product.name} className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="line-clamp-2 text-sm font-semibold text-gray-950">{product.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{product.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-gray-950">{money(product.price)}</span>
                  <button
                    onClick={() => addProduct(product)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-950 px-3 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Carrinho
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-3 shadow-lg">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ShoppingCart className="h-4 w-4" />
                Carrinho
              </div>
              <div className="font-semibold text-gray-950">{money(cartTotal)}</div>
            </div>
            <div className="max-h-44 space-y-2 overflow-auto">
              {cart.map((item) => (
                <div key={item.lineId} className="grid gap-2 rounded-lg bg-gray-50 p-2 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="text-sm font-medium text-gray-950">{item.product.name}</div>
                    <input
                      value={item.notes}
                      onChange={(event) => setCart((current) => current.map((row) => (row.lineId === item.lineId ? { ...row, notes: event.target.value } : row)))}
                      placeholder="Observação"
                      className="mt-1 h-9 w-full rounded-md border border-gray-200 px-2 text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => updateQuantity(item.lineId, -1)} className="rounded-md border border-gray-200 p-2">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.lineId, 1)} className="rounded-md border border-gray-200 p-2">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setCart((current) => current.filter((row) => row.lineId !== item.lineId))} className="rounded-md border border-gray-200 p-2 text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => void sendCart()}
              disabled={busy === "cart" || !canOrder}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "cart" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Enviar pedido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
