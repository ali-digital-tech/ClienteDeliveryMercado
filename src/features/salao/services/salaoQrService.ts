import { apiRequest } from "@/shared/lib/api";

function unwrap<T = any>(payload: any): T {
  return payload?.data ?? payload;
}

export const salaoQrService = {
  getContext: async (token: string) =>
    unwrap(await apiRequest(`/salao/qr/mesas/${token}`)),

  addItem: async (token: string, data: Record<string, unknown>) =>
    unwrap(await apiRequest(`/salao/qr/mesas/${token}/itens`, {
      method: "POST",
      body: data,
    })),

  callWaiter: async (token: string, observacoes?: string) =>
    unwrap(await apiRequest(`/salao/qr/mesas/${token}/chamar-garcom`, {
      method: "POST",
      body: { observacoes: observacoes || null },
    })),

  requestBill: async (token: string, observacoes?: string) =>
    unwrap(await apiRequest(`/salao/qr/mesas/${token}/solicitar-conta`, {
      method: "POST",
      body: { observacoes: observacoes || null },
    })),
};
