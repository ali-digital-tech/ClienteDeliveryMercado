import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  BellRing,
  Check,
  Loader2,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { getCategoriesByMarketId, type Category } from "@/features/categories";
import { getProductsByMarketId, type Product } from "@/features/products";
import { salaoQrService } from "@/features/salao/services/salaoQrService";
import { createSalaoQrRealtime, salaoTableTopic } from "@/features/salao/services/salaoRealtime";

const PRODUCTS_PER_PAGE = 16;

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [pin, setPin] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [participantToken, setParticipantToken] = useState(() => localStorage.getItem(`salao_participant_${qrToken}`) || "");
  const contextLoadingRef = useRef(false);
  const productsLoadingRef = useRef(false);
  const deviceId = useMemo(getDeviceId, []);

  const mesa = context?.mesa;
  const comanda = context?.comanda;
  const canOrder = comanda?.status === "aberta" && Boolean(participantToken);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  const tableLabel = useMemo(() => {
    return mesa?.nome || (mesa?.numero ? `Mesa ${mesa.numero}` : "Mesa");
  }, [mesa]);

  const loadContext = useCallback(async (silent = false) => {
    if (!qrToken || contextLoadingRef.current) return;
    contextLoadingRef.current = true;
    try {
      const ctx = await salaoQrService.getContext(qrToken);
      setContext(ctx);
    } catch (error: any) {
      if (!silent) setNotice(error?.message || "Não foi possível abrir a mesa.");
    } finally {
      contextLoadingRef.current = false;
    }
  }, [qrToken]);

  const loadProducts = useCallback(async (nextPage = 1, append = false) => {
    if (!marketId || productsLoadingRef.current) return;
    if (!selectedCategoryId) {
      setProducts([]);
      setPage(1);
      setHasNextPage(false);
      setProductsLoading(false);
      setLoadingMore(false);
      return;
    }
    productsLoadingRef.current = true;
    if (append) setLoadingMore(true);
    else setProductsLoading(true);

    try {
      const catalog = await getProductsByMarketId(marketId, {
        page: nextPage,
        perPage: PRODUCTS_PER_PAGE,
        categoryId: selectedCategoryId,
      });
      setProducts((current) => (append ? [...current, ...catalog.products] : catalog.products));
      setPage(catalog.page || nextPage);
      setHasNextPage(Boolean(catalog.hasNextPage));
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível carregar os produtos.");
    } finally {
      setProductsLoading(false);
      setLoadingMore(false);
      productsLoadingRef.current = false;
    }
  }, [marketId, selectedCategoryId]);

  useEffect(() => {
    let active = true;

    const loadInitial = async () => {
      if (!marketId || !qrToken) return;
      setInitialLoading(true);
      try {
        const [ctx, departmentCategories] = await Promise.all([
          salaoQrService.getContext(qrToken),
          getCategoriesByMarketId(marketId, { level: 1 }),
        ]);
        if (!active) return;
        setContext(ctx);
        setCategories(departmentCategories);
        setSelectedCategoryId((current) => current || departmentCategories[0]?.id || "");
      } catch (error: any) {
        if (active) setNotice(error?.message || "Não foi possível abrir o cardápio da mesa.");
      } finally {
        if (active) setInitialLoading(false);
      }
    };

    void loadInitial();
    return () => {
      active = false;
    };
  }, [marketId, qrToken]);

  useEffect(() => {
    void loadProducts(1, false);
  }, [loadProducts]);

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;
    const realtime = createSalaoQrRealtime();
    if (!realtime || !qrToken) return;

    const subscribe = async () => {
      const topic = await salaoTableTopic(qrToken);
      if (!active) return;
      channel = realtime
        .channel(topic)
        .on("broadcast", { event: "salao:update" }, () => void loadContext(true))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") void loadContext(true);
        });
    };

    void subscribe();
    const reconcile = () => void loadContext(true);
    window.addEventListener("focus", reconcile);
    window.addEventListener("online", reconcile);
    document.addEventListener("visibilitychange", reconcile);

    return () => {
      active = false;
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("online", reconcile);
      document.removeEventListener("visibilitychange", reconcile);
      if (channel) void realtime.removeChannel(channel);
    };
  }, [loadContext, qrToken]);

  const requestOpening = async () => {
    setBusy("opening");
    setNotice("");
    try {
      await salaoQrService.requestOpening(qrToken, {
        dispositivo_id: deviceId,
        nome_cliente: customerName.trim() || "Cliente",
      });
      setNotice("Solicitação enviada. Aguarde a liberação do atendente.");
      await loadContext(true);
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
      current.map((item) => (item.lineId === lineId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)),
    );
  };

  const sendCart = async () => {
    if (!canOrder) {
      setNotice(comanda ? "Valide o PIN da mesa antes de enviar o pedido." : "Solicite a abertura da mesa antes de enviar pedidos.");
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
      await loadContext(true);
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
      await loadContext(true);
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível solicitar a conta.");
    } finally {
      setBusy("");
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Abrindo cardápio...
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
      <header
        className="z-20 flex-shrink-0 px-4 pb-3 pt-7 shadow-sm"
        style={{ background: "linear-gradient(160deg, var(--market-secondary-color) 0%, var(--market-primary-color) 100%)" }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-1 ring-white/30">
                {mesa?.logo_url ? (
                  <img src={mesa.logo_url} alt={mesa?.loja_nome || "Restaurante"} className="h-full w-full object-cover" />
                ) : (
                  <Store size={19} color="white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold text-white">{mesa?.loja_nome || "Restaurante"}</p>
                <p className="truncate text-xs font-semibold text-white/75">{tableLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void callWaiter()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25"
                aria-label="Chamar garçom"
              >
                <BellRing size={18} color="white" />
              </button>
              <button
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25"
                aria-label="Carrinho"
                onClick={() => document.getElementById("salao-cart")?.scrollIntoView({ behavior: "smooth", block: "end" })}
              >
                <ShoppingCart size={18} color="white" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-slate-950">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <Search size={18} color="#94a3b8" />
            <span className="text-sm text-slate-400">Categorias e produtos da mesa</span>
          </div>
        </div>
      </header>

      <main className={`w-full flex-1 overflow-y-auto px-4 py-4 ${cart.length > 0 ? "pb-56" : "pb-6"}`}>
        <div className="mx-auto max-w-3xl">
        {notice && (
          <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {notice}
          </div>
        )}

        {!comanda && (
          <div className="mb-4 rounded-2xl border border-amber-100 bg-white p-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Seu nome"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none"
              />
              <button
                onClick={() => void requestOpening()}
                disabled={busy === "opening"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--market-primary-color)" }}
              >
                {busy === "opening" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Abrir mesa
              </button>
            </div>
          </div>
        )}

        {comanda?.status === "aberta" && !participantToken && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-2 sm:grid-cols-[1fr_112px_auto]">
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Seu nome"
                className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none"
              />
              <input
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="PIN"
                inputMode="numeric"
                className="h-11 rounded-xl border border-slate-200 px-3 text-center text-lg font-bold tracking-widest outline-none"
              />
              <button
                onClick={() => void validatePin()}
                disabled={busy === "pin"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--market-primary-color)" }}
              >
                {busy === "pin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Validar
              </button>
            </div>
          </div>
        )}

        {comanda && comanda.status !== "aberta" && (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            {comanda.status === "fechada" ? "Conta fechada. Aguarde o pagamento presencial." : "Conta solicitada. Novos pedidos estão bloqueados."}
          </div>
        )}

        <section className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: "var(--market-primary-color)" }}>Categorias</h2>
            <span className="text-xs font-semibold text-slate-500">Escolha uma categoria</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((category) => {
              const active = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    if (selectedCategoryId === category.id) return;
                    setProducts([]);
                    setPage(1);
                    setHasNextPage(false);
                    setSelectedCategoryId(category.id);
                  }}
                  className="flex h-[94px] w-[82px] shrink-0 flex-col items-center justify-between rounded-2xl p-3 transition active:scale-95"
                  style={{
                    backgroundColor: active ? "var(--market-primary-color)" : "var(--market-primary-soft-color)",
                    border: `1px solid ${active ? "var(--market-primary-color)" : "var(--market-primary-border-color)"}`,
                    color: active ? "#ffffff" : "var(--market-primary-color)",
                  }}
                >
                  <span className="text-2xl">{category.emoji}</span>
                  <span className="line-clamp-2 min-h-[24px] text-center text-[10px] font-bold leading-tight">{category.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold" style={{ color: "var(--market-primary-color)" }}>
              {selectedCategory ? selectedCategory.name : "Selecione uma categoria"}
            </h2>
            {products.length > 0 && <span className="text-xs font-semibold text-slate-500">{products.length} exibidos</span>}
          </div>

          {!selectedCategoryId ? (
            <div className="rounded-2xl bg-white px-4 py-12 text-center text-sm font-semibold text-slate-500">
              Selecione uma categoria para ver os produtos.
            </div>
          ) : productsLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-[226px] animate-pulse rounded-2xl bg-white" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-12 text-center text-sm font-semibold text-slate-500">
              Nenhum produto encontrado.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                {products.map((product) => (
                  <article key={product.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                    <div className="aspect-square bg-slate-100">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                          <UtensilsCrossed size={34} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="line-clamp-2 min-h-[38px] text-sm font-bold leading-tight text-slate-950">{product.name}</h3>
                      <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{product.categoryPath || product.brand || "Cardápio"}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-950">{money(product.price)}</span>
                        <button
                          onClick={() => addProduct(product)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white active:scale-95"
                          style={{ backgroundColor: "var(--market-primary-color)" }}
                          aria-label={`Adicionar ${product.name}`}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {hasNextPage && (
                <button
                  onClick={() => void loadProducts(page + 1, true)}
                  disabled={loadingMore}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold shadow-sm ring-1 ring-slate-200 disabled:opacity-60"
                  style={{ color: "var(--market-primary-color)" }}
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Carregar mais produtos
                </button>
              )}
            </>
          )}
        </section>
        </div>
      </main>

      {cart.length > 0 && (
        <div id="salao-cart" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <ShoppingCart className="h-4 w-4" />
                {cartCount} item{cartCount !== 1 ? "s" : ""}
              </div>
              <div className="font-extrabold text-slate-950">{money(cartTotal)}</div>
            </div>
            <div className="max-h-40 space-y-2 overflow-auto">
              {cart.map((item) => (
                <div key={item.lineId} className="grid gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="line-clamp-1 text-sm font-bold text-slate-950">{item.product.name}</div>
                    <input
                      value={item.notes}
                      onChange={(event) => setCart((current) => current.map((row) => (row.lineId === item.lineId ? { ...row, notes: event.target.value } : row)))}
                      placeholder="Observação"
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => updateQuantity(item.lineId, -1)} className="rounded-lg border border-slate-200 bg-white p-2">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.lineId, 1)} className="rounded-lg border border-slate-200 bg-white p-2">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setCart((current) => current.filter((row) => row.lineId !== item.lineId))} className="rounded-lg border border-slate-200 bg-white p-2 text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
              <button
                onClick={() => void sendCart()}
                disabled={busy === "cart" || !canOrder}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--market-primary-color)" }}
              >
                {busy === "cart" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Enviar
              </button>
              <button
                onClick={() => void requestBill("individual")}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white"
                aria-label="Minha conta"
              >
                <Receipt size={18} />
              </button>
              <button
                onClick={() => void requestBill("inteira")}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white"
                aria-label="Conta inteira"
              >
                <Receipt size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
