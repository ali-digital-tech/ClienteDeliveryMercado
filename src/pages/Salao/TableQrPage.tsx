import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { BellRing, Check, Loader2, Receipt, UtensilsCrossed } from "lucide-react";
import { getProductsByMarketId, type Product } from "@/features/products";
import { salaoQrService } from "@/features/salao/services/salaoQrService";

const money = (value: unknown) => `R$ ${Number(value || 0).toFixed(2).replace(".", ",")}`;

export function TableQrPage() {
  const { marketId = "", qrToken = "" } = useParams();
  const [context, setContext] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const tableLabel = useMemo(() => {
    const mesa = context?.mesa;
    return mesa?.nome || (mesa?.numero ? `Mesa ${mesa.numero}` : "Mesa");
  }, [context]);

  const load = async () => {
    if (!marketId || !qrToken) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [marketId, qrToken]);

  const addProduct = async (product: Product) => {
    setBusyId(product.id);
    setNotice("");
    try {
      await salaoQrService.addItem(qrToken, {
        produto_loja_id: product.storeProductId || product.id,
        produto_id: product.catalogProductId,
        quantidade: 1,
      });
      setNotice(`${product.name} enviado para a cozinha.`);
      await load();
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível enviar o item.");
    } finally {
      setBusyId("");
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

  const requestBill = async () => {
    setNotice("");
    try {
      await salaoQrService.requestBill(qrToken);
      setNotice("Conta solicitada.");
      await load();
    } catch (error: any) {
      setNotice(error?.message || "Não foi possível solicitar a conta.");
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
    <div className="min-h-screen bg-gray-50 pb-24">
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

        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => void callWaiter()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm"
          >
            <BellRing className="h-4 w-4" />
            Chamar garçom
          </button>
          <button
            onClick={() => void requestBill()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm"
          >
            <Receipt className="h-4 w-4" />
            Solicitar conta
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
                    onClick={() => void addProduct(product)}
                    disabled={busyId === product.id}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-950 px-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Pedir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
