import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight, Heart, Home, Share2, ShoppingCart, Plus, Minus, ShieldCheck, Store } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { useMarketContext } from '@/contexts/MarketContext';
import { formatCartQuantity, getNextCartQuantity, isWeightProduct } from '@/features/cart';
import { useCategories } from '@/features/categories';
import { getProductById, isConfigurableProduct, ProductCard, ProductConfigurator, ProductImage, WeightQuantityModal, useProducts } from '@/features/products';
import type { Product } from '@/features/products';
import { showSystemNotice } from '@/shared/components/SystemNoticeModal';

function useHorizontalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const dragState = useRef({
    isMouseDown: false,
    hasDragged: false,
    startX: 0,
    scrollLeft: 0,
  });
  const shouldSuppressClick = useRef(false);

  const stopDragging = useCallback((event: MouseEvent<T>) => {
    const target = event.currentTarget;
    dragState.current.isMouseDown = false;
    target.style.cursor = "";
    target.style.userSelect = "";
  }, []);

  const onMouseDown = useCallback((event: MouseEvent<T>) => {
    if (event.button !== 0) return;

    dragState.current = {
      isMouseDown: true,
      hasDragged: false,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    shouldSuppressClick.current = false;
    event.currentTarget.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback((event: MouseEvent<T>) => {
    if (!dragState.current.isMouseDown) return;

    const distance = event.clientX - dragState.current.startX;
    if (Math.abs(distance) <= 6) return;

    dragState.current.hasDragged = true;
    shouldSuppressClick.current = true;
    event.preventDefault();
    event.currentTarget.style.userSelect = "none";
    event.currentTarget.scrollLeft = dragState.current.scrollLeft - distance;
  }, []);

  const onClickCapture = useCallback((event: MouseEvent<T>) => {
    if (!shouldSuppressClick.current) return;

    event.preventDefault();
    event.stopPropagation();
    shouldSuppressClick.current = false;
  }, []);

  return {
    ref,
    onMouseDown,
    onMouseMove,
    onMouseUp: stopDragging,
    onMouseLeave: stopDragging,
    onClickCapture,
  };
}

export function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { marketId } = useMarketContext();
  const {
    addToCart,
    addConfiguredItem,
    updateConfiguredItem,
    updateQty,
    cart,
    toggleFavorite,
    isFavorite,
    cartCount,
    tenantPath,
    currentMarket,
  } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [showWeightSelector, setShowWeightSelector] = useState(false);
  const relatedDrag = useHorizontalDragScroll<HTMLDivElement>();
  const { categories: availableCategories } = useCategories(marketId, {});
  const { products: relatedProducts } = useProducts(marketId, {
    categoryId: product?.category,
    perPage: 8,
    enabled: Boolean(product?.category),
  });

  useEffect(() => {
    let ignore = false;

    setIsLoadingProduct(true);
    setProduct(null);

    getProductById(marketId, id || '')
      .then((data) => {
        if (!ignore) setProduct(data);
      })
      .catch(() => {
        if (!ignore) setProduct(null);
      })
      .finally(() => {
        if (!ignore) setIsLoadingProduct(false);
      });

    return () => {
      ignore = true;
    };
  }, [id, marketId]);

  if (isLoadingProduct) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500">Carregando produto...</p>
    </div>
  );

  if (!product) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-500">Produto não encontrado.</p>
    </div>
  );

  const editLineId = searchParams.get('editLineId');
  const isConfigurable = isConfigurableProduct(product);
  const editableItem = editLineId
    ? cart.find(item => item.lineId === editLineId && item.product.id === product.id)
    : undefined;
  const cartItem = cart.find(item =>
    !isConfigurableProduct(item.product) && item.product.id === product.id
  );
  const qty = cartItem?.qty || 0;
  const selectedItemTotal = product.price * qty;
  const favorite = isFavorite(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const primaryColor = currentMarket?.primaryColor || 'var(--market-primary-color)';
  const isWeightSale = isWeightProduct(product);
  const related = relatedProducts.filter(p => p.id !== product.id).slice(0, 4);
  const categoryTrail = (product.categoryPath || 'Produtos')
    .split(/\s*>\s*/)
    .map(segment => segment.trim())
    .filter(Boolean);
  const categoriesById = new Map(availableCategories.map(category => [category.id, category]));
  const categoryHierarchy = [];
  let currentCategory = categoriesById.get(product.category);

  while (currentCategory) {
    categoryHierarchy.unshift(currentCategory);
    currentCategory = currentCategory.parentId
      ? categoriesById.get(currentCategory.parentId)
      : undefined;
  }

  const resolvedBreadcrumb = categoryHierarchy.map((category) => {
    const department = categoryHierarchy.find(item => item.level === 1);
    const level2 = categoryHierarchy.find(item => item.level === 2);
    const subcategory = categoryHierarchy.find(item => item.level === 3);

    if (!department || (category.level >= 2 && !level2) || (category.level >= 3 && !subcategory)) {
      return { label: category.name, path: undefined };
    }

    const params = new URLSearchParams({ categoria: department.id });
    if (category.level >= 2 && level2) params.set('categoriaNivel2', level2.id);
    if (category.level >= 3 && subcategory) params.set('subcategoria', subcategory.id);

    return {
      label: category.name,
      path: `${tenantPath('produtos')}?${params.toString()}`,
    };
  });
  const breadcrumbItems = resolvedBreadcrumb.length > 0
    ? resolvedBreadcrumb
    : categoryTrail.map(label => ({ label, path: undefined as string | undefined }));
  const productsInCategoryPath = breadcrumbItems[breadcrumbItems.length - 1]?.path;

  const handleAdd = () => {
    if (qty === 0) {
      if (isWeightSale) {
        setShowWeightSelector(true);
        return;
      }

      void addToCart(product).catch(error => {
        console.error('Erro ao adicionar produto ao carrinho:', error);
      });
    } else {
      void updateQty(product.id, getNextCartQuantity(product, qty, 1)).catch(error => {
        console.error('Erro ao atualizar quantidade do produto:', error);
      });
    }
  };
  const handleRemove = () => {
    void updateQty(product.id, getNextCartQuantity(product, qty, -1)).catch(error => {
      console.error('Erro ao atualizar quantidade do produto:', error);
    });
  };

  const handleShare = async () => {
    const productUrl = window.location.href;
    const shareData = {
      title: product.name,
      text: `${product.name} por R$ ${product.price.toFixed(2).replace('.', ',')} no ${currentMarket.name}`,
      url: productUrl,
    };

    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard?.writeText(productUrl);
      showSystemNotice('Link do produto copiado para compartilhar.', 'Produto compartilhado');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;

      console.error('Erro ao compartilhar produto:', error);
      showSystemNotice('Não foi possível compartilhar este produto agora.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f8fafc' }}>
      {showWeightSelector && (
        <WeightQuantityModal
          product={product}
          primaryColor={primaryColor}
          onClose={() => setShowWeightSelector(false)}
          onConfirm={(quantity) => {
            setShowWeightSelector(false);
            void addToCart(product, quantity).catch(error => {
              console.error('Erro ao adicionar produto ao carrinho:', error);
            });
          }}
        />
      )}
      <div className="hidden border-b bg-white md:block" style={{ borderColor: '#e2e8f0' }}>
        <nav aria-label="Caminho do produto" className="mx-auto flex max-w-6xl items-center gap-2 overflow-hidden px-6 py-4">
          <button onClick={() => navigate(tenantPath())} className="flex flex-shrink-0 items-center text-slate-500 transition-colors hover:text-slate-800" aria-label="Início">
            <Home size={17} />
          </button>
          {breadcrumbItems.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              <ChevronRight size={15} className="flex-shrink-0 text-slate-400" />
              {item.path ? (
                <button
                  onClick={() => navigate(item.path!)}
                  className="truncate text-sm text-slate-600 transition-colors hover:text-slate-950"
                >
                  {item.label}
                </button>
              ) : (
                <span className="truncate text-sm text-slate-600">{item.label}</span>
              )}
            </div>
          ))}
          <ChevronRight size={15} className="flex-shrink-0 text-slate-400" />
          <span className="truncate text-sm font-semibold text-slate-900">{product.name}</span>
        </nav>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-7 pt-4 md:px-6 md:py-7">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-full bg-white py-2 pl-2 pr-3 shadow-sm"
            style={{ border: '1px solid #e2e8f0' }}
          >
            <ChevronLeft size={18} color={primaryColor} />
            <span style={{ color: primaryColor, fontSize: '13px', fontWeight: 700 }}>Voltar</span>
          </button>
          <button
            className="relative rounded-full bg-white p-2.5 shadow-sm"
            style={{ border: '1px solid #e2e8f0' }}
            onClick={() => navigate(tenantPath('carrinho'))}
            aria-label="Abrir carrinho"
          >
            <ShoppingCart size={18} color={primaryColor} />
            {cartCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex items-center justify-center rounded-full text-white"
                style={{ backgroundColor: primaryColor, width: '17px', height: '17px', fontSize: '9px', fontWeight: 700 }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <nav
          aria-label="Categorias do produto"
          className="mb-4 flex items-center gap-1.5 overflow-x-auto rounded-xl px-2 py-2 scrollbar-hide md:hidden"
          style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 9%, white)` }}
        >
          {breadcrumbItems.map((item, index) => (
            <div key={`${item.label}-mobile-${index}`} className="flex flex-shrink-0 items-center gap-1.5">
              {index > 0 && <ChevronRight size={12} color={primaryColor} />}
              <button
                onClick={() => item.path && navigate(item.path)}
                disabled={!item.path}
                style={{ color: primaryColor, fontSize: '12px', fontWeight: 700 }}
              >
                {item.label}
              </button>
            </div>
          ))}
        </nav>

        <div className="md:hidden">
          <div className="grid grid-cols-[minmax(112px,36vw)_minmax(0,1fr)] items-start gap-3">
            <section
              className="relative aspect-square overflow-hidden rounded-2xl bg-white"
              style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)' }}
            >
              <ProductImage
                src={product.image}
                alt={product.name}
                className="h-full w-full object-contain p-3"
                iconSize={42}
              />
              {discount > 0 && (
                <div
                  className="absolute bottom-2 left-2 rounded-full px-2 py-1 text-white"
                  style={{ backgroundColor: primaryColor, fontSize: '9px', fontWeight: 800 }}
                >
                  -{discount}%
                </div>
              )}
            </section>

            <section className="min-w-0">
              <div className="mb-1.5 flex flex-wrap gap-1">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {product.brand}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {isWeightSale ? 'kg' : product.unit}
                </span>
              </div>
              <h1 className="line-clamp-3 text-slate-900" style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.25 }}>
                {product.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-end gap-x-2">
                <p style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.1, color: primaryColor }}>
                  R$ {product.price.toFixed(2).replace('.', ',')}
                  {isWeightSale && <span style={{ fontSize: '12px', fontWeight: 700 }}>/kg</span>}
                </p>
                {product.originalPrice && (
                  <p className="text-slate-400 line-through" style={{ fontSize: '11px' }}>
                    R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleShare}
                  className="rounded-full bg-white p-2 shadow-sm"
                  style={{ border: '1px solid #e2e8f0' }}
                  aria-label="Compartilhar produto"
                >
                  <Share2 size={16} color="#334155" />
                </button>
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="rounded-full bg-white p-2 shadow-sm"
                  style={{ border: '1px solid #e2e8f0' }}
                  aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Heart size={16} fill={favorite ? '#ef4444' : 'none'} color={favorite ? '#ef4444' : '#334155'} />
                </button>
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-2xl bg-white p-4" style={{ border: '1px solid #e2e8f0' }}>
            {!isConfigurable && <div className="flex items-center gap-2">
              <div className="flex items-center justify-between rounded-xl p-1" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <button
                  onClick={handleRemove}
                  disabled={qty === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-35"
                >
                  <Minus size={17} color={primaryColor} />
                </button>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', minWidth: '27px', textAlign: 'center' }}>
                  {formatCartQuantity(qty, product)}
                </span>
                <button
                  onClick={handleAdd}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-all active:scale-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus size={17} />
                </button>
              </div>
              <button
                onClick={qty === 0 ? handleAdd : () => navigate(tenantPath('carrinho'))}
                className="min-w-0 flex-1 rounded-xl px-3 py-3 text-white transition-all active:scale-[0.98]"
                style={{ backgroundColor: primaryColor, fontSize: '13px', fontWeight: 750 }}
              >
                {qty === 0
                  ? 'Adicionar'
                  : `Ver carrinho (${formatCartQuantity(qty, product)}) · R$ ${selectedItemTotal.toFixed(2).replace('.', ',')}`}
              </button>
            </div>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl px-2.5 py-2.5" style={{ backgroundColor: '#eff6ff' }}>
                <ShieldCheck size={16} color="#2563eb" className="flex-shrink-0" />
                <p style={{ fontSize: '10px', color: '#1e40af', fontWeight: 700 }}>Qualidade garantida</p>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2.5" style={{ backgroundColor: '#f0fdf4' }}>
                <Store size={16} color="#16a34a" className="flex-shrink-0" />
                <p className="truncate" style={{ fontSize: '10px', color: '#166534', fontWeight: 700 }}>{currentMarket.name}</p>
              </div>
            </div>

            <div className="mt-4 border-t pt-4" style={{ borderColor: '#eef2f7' }}>
              <h2 className="mb-1.5 text-slate-800" style={{ fontSize: '14px', fontWeight: 750 }}>Sobre o produto</h2>
              <p className="text-slate-500" style={{ fontSize: '12px', lineHeight: 1.6 }}>{product.description}</p>
            </div>
          </section>
        </div>

        <div className="hidden gap-5 md:grid md:grid-cols-[minmax(360px,500px)_minmax(340px,1fr)] md:items-start md:gap-8">
          <section
            className="relative aspect-square overflow-hidden rounded-3xl bg-white"
            style={{ border: '1px solid #e2e8f0', boxShadow: '0 8px 26px rgba(15, 23, 42, 0.05)' }}
          >
            <ProductImage
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain p-7 sm:p-10 md:p-12"
              iconSize={70}
            />

            {discount > 0 && (
              <div
                className="absolute bottom-4 left-4 rounded-full px-3 py-1.5 text-white"
                style={{ backgroundColor: primaryColor, fontSize: '12px', fontWeight: 800 }}
              >
                -{discount}% OFF
              </div>
            )}

            <div className="absolute right-4 top-4 flex gap-2">
              <button
                onClick={handleShare}
                className="rounded-full bg-white p-2.5 shadow-sm"
                style={{ border: '1px solid #e2e8f0' }}
                aria-label="Compartilhar produto"
              >
                <Share2 size={18} color="#334155" />
              </button>
              <button
                onClick={() => toggleFavorite(product.id)}
                className="rounded-full bg-white p-2.5 shadow-sm"
                style={{ border: '1px solid #e2e8f0' }}
                aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              >
                <Heart size={18} fill={favorite ? '#ef4444' : 'none'} color={favorite ? '#ef4444' : '#334155'} />
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 md:p-7" style={{ border: '1px solid #e2e8f0' }}>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {product.brand}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {isWeightSale ? 'kg' : product.unit}
              </span>
            </div>

            <h1 className="text-slate-900" style={{ fontSize: 'clamp(21px, 2.1vw, 28px)', fontWeight: 800, lineHeight: 1.25 }}>
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
              <p style={{ fontSize: '30px', fontWeight: 800, lineHeight: 1, color: primaryColor }}>
                R$ {product.price.toFixed(2).replace('.', ',')}
                {isWeightSale && <span style={{ fontSize: '14px', fontWeight: 700 }}>/kg</span>}
              </p>
              {product.originalPrice && (
                <p className="mb-0.5 text-slate-400 line-through" style={{ fontSize: '15px' }}>
                  R$ {product.originalPrice.toFixed(2).replace('.', ',')}
                </p>
              )}
            </div>

            {!isConfigurable && <div className="mt-6 rounded-2xl p-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #eef2f7' }}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center justify-between rounded-xl bg-white p-1 sm:w-[132px]" style={{ border: '1px solid #e2e8f0' }}>
                  <button
                    onClick={handleRemove}
                    disabled={qty === 0}
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-35"
                  >
                    <Minus size={18} color={primaryColor} />
                  </button>
                  <span style={{ fontSize: '17px', fontWeight: 700, color: '#1f2937', minWidth: '32px', textAlign: 'center' }}>
                    {formatCartQuantity(qty, product)}
                  </span>
                  <button
                    onClick={handleAdd}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-all active:scale-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  onClick={qty === 0 ? handleAdd : () => navigate(tenantPath('carrinho'))}
                  className="flex-1 rounded-xl px-4 py-3 text-white transition-all active:scale-[0.98]"
                  style={{ backgroundColor: primaryColor, fontSize: '14px', fontWeight: 750 }}
                >
                  {qty === 0
                    ? 'Adicionar ao carrinho'
                    : `Ver carrinho (${formatCartQuantity(qty, product)}) · R$ ${selectedItemTotal.toFixed(2).replace('.', ',')}`}
                </button>
              </div>
            </div>}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-3" style={{ backgroundColor: '#eff6ff' }}>
                <ShieldCheck size={18} color="#2563eb" />
                <div>
                  <p style={{ fontSize: '12px', color: '#1e40af', fontWeight: 700 }}>Compra protegida</p>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>Qualidade garantida</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-3" style={{ backgroundColor: '#f0fdf4' }}>
                <Store size={18} color="#16a34a" />
                <div className="min-w-0">
                  <p style={{ fontSize: '12px', color: '#166534', fontWeight: 700 }}>Disponível em</p>
                  <p className="truncate" style={{ fontSize: '11px', color: '#64748b' }}>{currentMarket.name}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t pt-5" style={{ borderColor: '#eef2f7' }}>
              <h2 className="mb-2 text-slate-800" style={{ fontSize: '15px', fontWeight: 750 }}>Sobre o produto</h2>
              <p className="text-slate-500" style={{ fontSize: '13px', lineHeight: 1.7 }}>{product.description}</p>
            </div>
          </section>
        </div>

        {isConfigurable && product.configuration && (
          <ProductConfigurator
            product={product}
            primaryColor={primaryColor}
            initialItem={editableItem}
            onConfirm={(configuredItem) => {
              const action = editableItem
                ? updateConfiguredItem(editableItem.lineId, configuredItem)
                : addConfiguredItem(configuredItem);
              void action
                .then(() => navigate(tenantPath('carrinho')))
                .catch(error => {
                  console.error('Erro ao salvar configuração do produto:', error);
                  showSystemNotice('Não foi possível salvar esta configuração.');
                });
            }}
          />
        )}

        {related.length > 0 && (
          <section className="mt-7 rounded-3xl bg-white px-4 py-5 md:px-6" style={{ border: '1px solid #e2e8f0' }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-slate-800" style={{ fontSize: '17px', fontWeight: 750 }}>Produtos relacionados</h2>
              <button
                onClick={() => productsInCategoryPath && navigate(productsInCategoryPath)}
                disabled={!productsInCategoryPath}
                className="flex items-center gap-1 text-sm font-semibold"
                style={{ color: primaryColor }}
              >
                Ver mais
                <ChevronRight size={15} />
              </button>
            </div>
            <div {...relatedDrag} className="flex cursor-grab gap-3 overflow-x-auto scrollbar-hide pb-1">
              {related.map(p => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
