import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  BellRing,
  Loader2,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  UtensilsCrossed,
  ChevronLeft,
  ListOrdered,
} from "lucide-react";
import { getCategoriesByMarketId, type Category } from "@/features/categories";
import { getProductsByMarketId, getProductById, type Product } from "@/features/products";
import { ProductConfigurator } from "@/features/products/components/ProductConfigurator";
import { isConfigurableProduct } from "@/features/products/utils/productConfiguration";
import type { CartItemSelection } from "@/features/cart";
import { salaoQrService } from "@/features/salao/services/salaoQrService";
import { createSalaoQrRealtime, salaoTableTopic } from "@/features/salao/services/salaoRealtime";

const PRODUCTS_PER_PAGE = 16;

const money = (value: unknown) => `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

type CartItem = {
  lineId: string;
  product: Product;
  quantity: number;
  notes: string;
  productStoreVariationId?: string;
  variationName?: string;
  selections: CartItemSelection[];
  configurationVersion?: number;
  basePrice?: number;
  optionsPrice?: number;
};

type ParticipantSession = {
  token: string;
  comandaId: string;
};

type TrackedOrderItem = {
  id: string;
  nome_produto: string;
  nome_variacao?: string | null;
  quantidade: number;
  preco_total: number;
  observacoes?: string | null;
  status: "enviado" | "recebido" | "preparando" | "pronto" | "entregue" | "cancelado";
  criado_em: string;
  selecoes: Array<{ nome_grupo: string; nome_opcao: string; quantidade: number }>;
};

const participantSessionKey = (qrToken: string) => `salao_participant_${qrToken}`;

const readParticipantSession = (qrToken: string): ParticipantSession | null => {
  try {
    const stored = JSON.parse(localStorage.getItem(participantSessionKey(qrToken)) || "null");
    return stored?.token && stored?.comandaId ? stored : null;
  } catch {
    return null;
  }
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
  const [view, setView] = useState<"catalog" | "cart" | "orders">("catalog");
  const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);
  const [configuringLoading, setConfiguringLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [pin, setPin] = useState("");
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [waiterConfirmationOpen, setWaiterConfirmationOpen] = useState(false);
  const [billSplitConfirmationOpen, setBillSplitConfirmationOpen] = useState(false);
  const [billPeopleDialogOpen, setBillPeopleDialogOpen] = useState(false);
  const [billSplitPeople, setBillSplitPeople] = useState("2");
  const [customerName, setCustomerName] = useState("");
  const [participantToken, setParticipantToken] = useState("");
  const [trackedItems, setTrackedItems] = useState<TrackedOrderItem[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
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

  // A participant token belongs to one specific comanda.  After the table is
  // closed and opened again, the old browser token must never hide the PIN UI.
  useEffect(() => {
    if (!comanda?.id) {
      setParticipantToken("");
      return;
    }
    const session = readParticipantSession(qrToken);
    if (session?.comandaId === comanda.id) {
      setParticipantToken(session.token);
      return;
    }
    localStorage.removeItem(participantSessionKey(qrToken));
    setParticipantToken("");
  }, [comanda?.id, qrToken]);

  useEffect(() => {
    if (comanda?.status === "aberta" && !participantToken) setPinModalOpen(true);
  }, [comanda?.id, comanda?.status, participantToken]);

  const loadContext = useCallback(async (silent = false) => {
    if (!qrToken || contextLoadingRef.current) return;
    contextLoadingRef.current = true;
    try {
      const ctx = await salaoQrService.getContext(qrToken, participantToken);
      setContext(ctx);
    } catch (error: any) {
      if (!silent) setNotice(error?.message || "Não foi possível abrir a mesa.");
    } finally {
      contextLoadingRef.current = false;
    }
  }, [participantToken, qrToken]);

  const loadOrderTracking = useCallback(async (silent = false) => {
    if (!qrToken || !participantToken) {
      setTrackedItems([]);
      return;
    }
    setTrackingLoading(true);
    try {
      const tracking = await salaoQrService.getOrderTracking(qrToken, participantToken);
      setTrackedItems(tracking.itens || []);
    } catch (error: any) {
      if (!silent) setNotice(error?.message || "Não foi possível carregar seus pedidos.");
    } finally {
      setTrackingLoading(false);
    }
  }, [participantToken, qrToken]);

  useEffect(() => {
    if (participantToken) void loadContext(true);
  }, [loadContext, participantToken]);

  useEffect(() => {
    if (participantToken) void loadOrderTracking(true);
  }, [loadOrderTracking, participantToken]);

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
        .on("broadcast", { event: "salao:update" }, () => {
          void loadContext(true);
          void loadOrderTracking(true);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void loadContext(true);
            void loadOrderTracking(true);
          }
        });
    };

    void subscribe();
    const reconcile = () => {
      void loadContext(true);
      void loadOrderTracking(true);
    };
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
  }, [loadContext, loadOrderTracking, qrToken]);

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
      localStorage.setItem(participantSessionKey(qrToken), JSON.stringify({
        token: result.token,
        comandaId: result.comanda_id,
      } satisfies ParticipantSession));
      setParticipantToken(result.token);
      setPinModalOpen(false);
      setPin("");
      setNotice("PIN validado. Você já pode enviar pedidos.");
    } catch (error: any) {
      setNotice(error?.message || "PIN inválido.");
    } finally {
      setBusy("");
    }
  };

  const addProduct = async (product: Product) => {
    if (isConfigurableProduct(product)) {
      if (product.configuration) {
        setConfiguringProduct(product);
        return;
      }
      try {
        setConfiguringLoading(true);
        const detailed = await getProductById(marketId, product.storeProductId || product.id);
        if (!detailed?.configuration) throw new Error("Configuração indisponível");
        setConfiguringProduct(detailed);
      } catch (error: any) {
        setNotice(error?.message || "Não foi possível carregar as opções deste produto.");
      } finally {
        setConfiguringLoading(false);
      }
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id && !item.notes);
      if (existing) {
        return current.map((item) => (item.lineId === existing.lineId ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { lineId: crypto.randomUUID?.() || `${product.id}-${Date.now()}`, product, quantity: 1, notes: "", selections: [] }];
    });
  };

  const addConfiguredProduct = (item: any) => {
    setCart((current) => [...current, {
      lineId: crypto.randomUUID?.() || `${item.product.id}-${Date.now()}`,
      product: item.product,
      quantity: item.qty,
      notes: item.notes || "",
      productStoreVariationId: item.productStoreVariationId,
      variationName: item.variationName,
      selections: item.selections || [],
      configurationVersion: item.configurationVersion,
      basePrice: item.basePrice,
      optionsPrice: item.optionsPrice,
    }]);
    setConfiguringProduct(null);
    setView("cart");
  };

  const updateQuantity = (lineId: string, delta: number) => {
    setCart((current) =>
      current.map((item) => (item.lineId === lineId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)),
    );
  };

  const sendCart = async () => {
    if (!canOrder) {
      setPinModalOpen(true);
      setNotice("Informe o PIN da mesa para enviar o pedido.");
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
          variacao_produto_loja_id: item.productStoreVariationId,
          quantidade: item.quantity,
          observacoes: item.notes.trim() || undefined,
          configuracao_versao: item.configurationVersion,
          selecoes: item.selections.map((selection) => ({
            grupo_id: selection.groupId,
            opcao_id: selection.optionId,
            quantidade: selection.quantity,
            fracao: selection.fraction,
            nome_grupo: selection.groupName,
            nome_opcao: selection.optionName,
            preco_unitario: selection.unitPrice,
            preco_contribuicao: selection.contribution,
          })),
        })),
      });
      setCart([]);
      setNotice("Pedido enviado para a cozinha.");
      await loadContext(true);
      await loadOrderTracking(true);
      setView("orders");
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível enviar o pedido.");
    } finally {
      setBusy("");
    }
  };

  const callWaiter = async () => {
    setBusy("waiter");
    setNotice("");
    try {
      await salaoQrService.callWaiter(qrToken);
      setNotice("Garçom chamado. Aguarde o atendimento.");
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível chamar o garçom.");
    } finally {
      setBusy("");
      setWaiterConfirmationOpen(false);
    }
  };

  const requestBill = async (people = 1) => {
    if (!participantToken) {
      setNotice("Valide o PIN da mesa antes de solicitar a conta.");
      return;
    }
    setBusy("bill");
    setNotice("");
    try {
      await salaoQrService.requestBill(qrToken, participantToken, { quantidade_pessoas_divisao: people });
      setNotice("Conta solicitada. Novos pedidos foram bloqueados para esta mesa.");
      await loadContext(true);
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível solicitar a conta.");
    } finally {
      setBusy("");
      setBillSplitConfirmationOpen(false);
      setBillPeopleDialogOpen(false);
    }
  };

  const continueBillSplit = () => {
    const people = Number(billSplitPeople);
    if (!Number.isInteger(people) || people < 2 || people > 99) {
      setNotice("Informe entre 2 e 99 pessoas para dividir a conta.");
      return;
    }
    void requestBill(people);
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
          <div className="mb-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-1 ring-white/30">
                {mesa?.logo_url ? (
                  <img src={mesa.logo_url} alt={mesa?.loja_nome || "Restaurante"} className="h-full w-full object-cover" />
                ) : (
                  <Store size={19} color="white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold text-white">{mesa?.loja_nome || "Restaurante"}</p>
                <p className="truncate text-xs font-semibold text-white/75">
                  {tableLabel}{comanda?.pin_atual ? ` · PIN da mesa: ${comanda.pin_atual}` : ""}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25"
                aria-label="Meus pedidos"
                onClick={() => {
                  setView("orders");
                  void loadOrderTracking();
                }}
              >
                <ListOrdered size={18} color="white" />
                {trackedItems.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-slate-950">
                    {trackedItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setWaiterConfirmationOpen(true)}
                disabled={busy === "waiter"}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white ring-1 ring-white/25 disabled:opacity-60 sm:w-auto sm:gap-2 sm:px-3"
              >
                {busy === "waiter" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing size={18} />}
                <span className="hidden sm:inline">Chamar Garçom</span>
              </button>
              <button
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25"
                aria-label="Carrinho"
                onClick={() => setView("cart")}
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

      {pinModalOpen && comanda?.status === "aberta" && !participantToken && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
            <h2 className="text-base font-extrabold text-slate-950">Entrar na mesa</h2>
            <p className="mt-1 text-sm text-slate-600">Informe o PIN recebido do garçom para enviar pedidos.</p>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Seu nome"
              className="mt-4 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
            />
            <input
              autoFocus
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="PIN da mesa"
              inputMode="numeric"
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 text-center text-lg font-bold tracking-widest outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPinModalOpen(false)} disabled={busy === "pin"} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600">Agora não</button>
              <button onClick={() => void validatePin()} disabled={busy === "pin"} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: "var(--market-primary-color)" }}>
                {busy === "pin" && <Loader2 className="h-4 w-4 animate-spin" />} Validar PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "cart" ? (
        <TableQrCart
          cart={cart}
          cartCount={cartCount}
          cartTotal={cartTotal}
          busy={busy}
          onBack={() => setView("catalog")}
          onUpdateQuantity={updateQuantity}
          onRemove={(lineId) => setCart((current) => current.filter((row) => row.lineId !== lineId))}
          onUpdateNotes={(lineId, notes) => setCart((current) => current.map((row) => row.lineId === lineId ? { ...row, notes } : row))}
          onSend={() => void sendCart()}
        />
      ) : view === "orders" ? (
        <TableQrOrderTracking
          items={trackedItems}
          loading={trackingLoading}
          canTrack={Boolean(participantToken)}
          onBack={() => setView("catalog")}
          onRefresh={() => void loadOrderTracking()}
        />
      ) : (
      <main className={`w-full flex-1 overflow-y-auto px-4 py-4 ${cart.length > 0 || canOrder ? "pb-28" : "pb-6"}`}>
        <div className="mx-auto max-w-3xl">
        {notice && (
          <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {notice}
          </div>
        )}

        {comanda && comanda.status !== "aberta" && (
          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            {comanda.status === "fechada" ? "Conta fechada. Aguarde o pagamento presencial." : "Conta solicitada. Novos pedidos estão bloqueados."}
          </div>
        )}

        {!comanda && (
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            Mesa livre. Solicite ao garçom a abertura da comanda e o novo PIN para fazer pedidos.
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
                          onClick={() => void addProduct(product)}
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
      )}

      {view === "catalog" && cart.length > 0 && (
        <div id="salao-cart" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
                <ShoppingCart className="h-4 w-4" />
                {cartCount} item{cartCount !== 1 ? "s" : ""}
              </div>
              <div className="font-extrabold text-slate-950">{money(cartTotal)}</div>
            </div>
            <div className="mt-3">
              <button
                onClick={() => setView("cart")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--market-primary-color)" }}
              >
                <ShoppingCart className="h-4 w-4" /> Ver carrinho
              </button>
            </div>
          </div>
        </div>
      )}
      {canOrder && !cart.length && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-2xl">
          <div className="mx-auto flex max-w-3xl">
            <button onClick={() => setBillSplitConfirmationOpen(true)} disabled={busy === "bill"} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold disabled:opacity-60">
              {busy === "bill" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} Solicitar conta da mesa
            </button>
          </div>
        </div>
      )}
      {billSplitConfirmationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-extrabold text-slate-950">Solicitar conta</h2>
            <p className="mt-2 text-sm text-slate-600">Vai dividir a conta com alguém?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setBillSplitConfirmationOpen(false)} disabled={busy === "bill"} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600">Cancelar</button>
              <button onClick={() => void requestBill(1)} disabled={busy === "bill"} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-60">Não</button>
              <button onClick={() => { setBillSplitConfirmationOpen(false); setBillPeopleDialogOpen(true); }} disabled={busy === "bill"} className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: "var(--market-primary-color)" }}>Sim</button>
            </div>
          </div>
        </div>
      )}
      {billPeopleDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-extrabold text-slate-950">Dividir conta</h2>
            <p className="mt-2 text-sm text-slate-600">Com quantas pessoas?</p>
            <input
              autoFocus
              value={billSplitPeople}
              onChange={(event) => setBillSplitPeople(event.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              className="mt-4 h-12 w-full rounded-xl border border-slate-300 px-3 text-center text-lg font-bold"
              aria-label="Quantidade de pessoas"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setBillPeopleDialogOpen(false)} disabled={busy === "bill"} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600">Cancelar</button>
              <button onClick={continueBillSplit} disabled={busy === "bill"} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: "var(--market-primary-color)" }}>
                {busy === "bill" && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {waiterConfirmationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-extrabold text-slate-950">Chamar Garçom</h2>
            <p className="mt-2 text-sm text-slate-600">Você quer mesmo chamar o garçom?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setWaiterConfirmationOpen(false)} disabled={busy === "waiter"} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600">Cancelar</button>
              <button onClick={() => void callWaiter()} disabled={busy === "waiter"} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: "var(--market-primary-color)" }}>
                {busy === "waiter" && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {(configuringLoading || configuringProduct) && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center sm:px-4">
          <div className="max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Monte seu item</p>
                <h2 className="text-base font-extrabold text-slate-900">{configuringProduct?.name || "Carregando produto"}</h2>
              </div>
              <button onClick={() => { setConfiguringProduct(null); setConfiguringLoading(false); }} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">Fechar</button>
            </div>
            <div className="max-h-[calc(92vh-64px)] overflow-y-auto px-4 pb-5">
              {configuringLoading && !configuringProduct ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando opções...</div>
              ) : configuringProduct ? (
                <ProductConfigurator product={configuringProduct} primaryColor="var(--market-primary-color)" onConfirm={addConfiguredProduct} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const kdsStatus = {
  enviado: { label: "Enviado para a cozinha", color: "#92400e", background: "#fffbeb" },
  recebido: { label: "Recebido pela cozinha", color: "#1d4ed8", background: "#eff6ff" },
  preparando: { label: "Em preparo", color: "#c2410c", background: "#fff7ed" },
  pronto: { label: "Pronto", color: "#166534", background: "#f0fdf4" },
  entregue: { label: "Entregue na mesa", color: "#166534", background: "#f0fdf4" },
  cancelado: { label: "Cancelado", color: "#b91c1c", background: "#fef2f2" },
} as const;

function TableQrOrderTracking({
  items,
  loading,
  canTrack,
  onBack,
  onRefresh,
}: {
  items: TrackedOrderItem[];
  loading: boolean;
  canTrack: boolean;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <main className="w-full flex-1 overflow-y-auto bg-slate-100 px-4 py-4 pb-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="rounded-full bg-white p-2 shadow-sm" aria-label="Voltar ao cardápio"><ChevronLeft className="h-5 w-5" /></button>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">Meus pedidos</h1>
              <p className="text-xs text-slate-500">Acompanhe o preparo em tempo real</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading || !canTrack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm disabled:opacity-50"
            aria-label="Atualizar pedidos"
          >
            <Loader2 className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {!canTrack ? (
          <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm">
            <ListOrdered className="mx-auto h-11 w-11 text-slate-300" />
            <p className="mt-3 font-extrabold text-slate-800">Valide o PIN da mesa</p>
            <p className="mt-1 text-sm text-slate-500">Depois da validação, seus pedidos e os status da cozinha aparecerão aqui.</p>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando seus pedidos...</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm">
            <UtensilsCrossed className="mx-auto h-11 w-11 text-slate-300" />
            <p className="mt-3 font-extrabold text-slate-800">Você ainda não enviou pedidos</p>
            <p className="mt-1 text-sm text-slate-500">Os itens enviados para a cozinha aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const status = kdsStatus[item.status] || kdsStatus.enviado;
              return (
                <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-extrabold text-slate-950">{item.nome_produto}</h2>
                      {item.nome_variacao && <p className="mt-0.5 text-xs font-semibold text-slate-600">{item.nome_variacao}</p>}
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: status.color, backgroundColor: status.background }}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Quantidade: {item.quantidade}</p>
                  {item.selecoes.map((selection, index) => (
                    <p key={`${item.id}-${index}`} className="mt-1 text-xs text-slate-500">{selection.nome_grupo}: {selection.nome_opcao}{Number(selection.quantidade) > 1 ? ` x${selection.quantidade}` : ""}</p>
                  ))}
                  {item.observacoes && <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">Obs.: {item.observacoes}</p>}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-slate-400">{new Date(item.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="font-extrabold text-slate-900">{money(item.preco_total)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function TableQrCart({
  cart,
  cartCount,
  cartTotal,
  busy,
  onBack,
  onUpdateQuantity,
  onRemove,
  onUpdateNotes,
  onSend,
}: {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  busy: string;
  onBack: () => void;
  onUpdateQuantity: (lineId: string, delta: number) => void;
  onRemove: (lineId: string) => void;
  onUpdateNotes: (lineId: string, notes: string) => void;
  onSend: () => void;
}) {
  return (
    <main className="w-full flex-1 overflow-y-auto bg-slate-100 px-4 py-4 pb-28">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <button onClick={onBack} className="rounded-full bg-white p-2 shadow-sm"><ChevronLeft className="h-5 w-5" /></button>
          <div><h1 className="text-lg font-extrabold text-slate-900">Meu Carrinho</h1><p className="text-xs text-slate-500">{cartCount} item{cartCount !== 1 ? "s" : ""}</p></div>
        </div>
        {cart.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-14 text-center shadow-sm"><ShoppingCart className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-3 font-extrabold text-slate-800">Seu carrinho está vazio</p><button onClick={onBack} className="mt-4 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: "var(--market-primary-color)" }}>Explorar produtos</button></div>
        ) : (
          <>
            <div className="space-y-3">
              {cart.map((item) => (
                <article key={item.lineId} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  {item.product.image ? <img src={item.product.image} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-300"><UtensilsCrossed /></div>}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{item.product.name}</p>{item.variationName && <p className="text-xs font-semibold text-slate-600">Tamanho: {item.variationName}</p>}{item.selections.map((selection) => <p key={`${selection.groupId}:${selection.optionId}`} className="text-xs text-slate-500">{selection.groupName}: {selection.optionName}{selection.quantity > 1 ? ` x${selection.quantity}` : ""}</p>)}<input value={item.notes} onChange={(event) => onUpdateNotes(item.lineId, event.target.value)} placeholder="Observação" className="mt-2 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs" /><p className="mt-2 text-sm font-extrabold" style={{ color: "var(--market-primary-color)" }}>{money(Number(item.product.price) * item.quantity)}</p></div>
                  <div className="flex flex-col items-center gap-2"><button onClick={() => onRemove(item.lineId)} className="p-1 text-red-600"><Trash2 className="h-4 w-4" /></button><div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1"><button onClick={() => onUpdateQuantity(item.lineId, -1)} className="rounded-lg bg-white p-1.5"><Minus className="h-3.5 w-3.5" /></button><span className="w-5 text-center text-sm font-bold">{item.quantity}</span><button onClick={() => onUpdateQuantity(item.lineId, 1)} className="rounded-lg p-1.5 text-white" style={{ backgroundColor: "var(--market-primary-color)" }}><Plus className="h-3.5 w-3.5" /></button></div></div>
                </article>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm"><div className="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>{money(cartTotal)}</span></div><div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-900"><span>Total</span><span>{money(cartTotal)}</span></div></div>
            <button onClick={onSend} disabled={busy === "cart"} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-extrabold text-white disabled:opacity-50" style={{ backgroundColor: "var(--market-primary-color)" }}>{busy === "cart" && <Loader2 className="h-4 w-4 animate-spin" />} Enviar pedido · {money(cartTotal)}</button>
          </>
        )}
      </div>
    </main>
  );
}
