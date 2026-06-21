import { apiRequest } from "@/shared/lib/api";

function unwrap<T = any>(payload: any): T {
  return payload?.data ?? payload;
}

export const salaoQrService = {
  getContext: async (token: string, participantToken?: string) =>
    unwrap(await apiRequest(`/salao/qr/${token}/context`, {
      headers: participantToken ? { "x-salao-participant-token": participantToken } : undefined,
    })),

  validatePin: async (token: string, data: Record<string, unknown>) =>
    unwrap(await apiRequest(`/salao/qr/${token}/validar-pin`, {
      method: "POST",
      body: data,
    })),

  sendOrder: async (token: string, participantToken: string, data: Record<string, unknown>) =>
    unwrap(await apiRequest(`/salao/qr/${token}/pedidos`, {
      method: "POST",
      headers: { "x-salao-participant-token": participantToken },
      body: data,
    })),

  getOrderTracking: async (token: string, participantToken: string) =>
    unwrap(await apiRequest(`/salao/qr/${token}/pedidos`, {
      headers: { "x-salao-participant-token": participantToken },
    })),

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

  requestBill: async (token: string, participantToken: string, data?: Record<string, unknown>) =>
    unwrap(await apiRequest(`/salao/qr/${token}/solicitar-conta`, {
      method: "POST",
      headers: { "x-salao-participant-token": participantToken },
      body: data || {},
    })),
};
