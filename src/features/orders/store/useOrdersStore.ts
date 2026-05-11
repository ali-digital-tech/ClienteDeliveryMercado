import { useCallback, useEffect, useState } from 'react';
import type { CartItem } from '@/features/cart';
import { getOrdersByMarketId } from '../services/ordersService';
import type { Order } from '../types/order';

export function useOrdersStore(marketId: string) {
  const [ordersByMarket, setOrdersByMarket] = useState<Record<string, Order[]>>({});

  useEffect(() => {
    let ignore = false;

    getOrdersByMarketId(marketId)
      .then(marketOrders => {
        if (!ignore) setOrdersByMarket(prev => ({ ...prev, [marketId]: marketOrders }));
      })
      .catch(error => {
        console.error('Erro ao carregar pedidos', error);
        if (!ignore) setOrdersByMarket(prev => ({ ...prev, [marketId]: [] }));
      });

    return () => {
      ignore = true;
    };
  }, [marketId]);

  const orders = ordersByMarket[marketId] || [];

  const placeOrder = useCallback((
    items: CartItem[],
    total: number,
    address: string,
    type: 'delivery' | 'pickup'
  ) => {
    const orderId = `#${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: Order = {
      id: orderId,
      marketId,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      items: items.map(item => ({ product: item.product, qty: item.qty })),
      total,
      status: 'recebido',
      address,
      type,
    };

    setOrdersByMarket(prev => ({
      ...prev,
      [marketId]: [newOrder, ...(prev[marketId] || [])],
    }));

    return orderId;
  }, [marketId]);

  return { orders, placeOrder };
}
