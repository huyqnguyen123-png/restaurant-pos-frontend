import { apiClient } from './client';
import { OrderSummary, OrderDetail, CreateOrderInput, OrderStatus, PaymentMethod } from '../types/order';

export interface PaymentItemInput {
  orderItemId: number;
  quantity: number;
}

export interface UpdateOrderInfoInput {
  tableNumber?: number;
  customerName?: string;
}

export const orderApi = {
  getSummaries: async (status?: OrderStatus, paymentMethod?: PaymentMethod): Promise<OrderSummary[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (paymentMethod) params.paymentMethod = paymentMethod;
    const response = await apiClient.get<OrderSummary[]>('/orders', { params });
    return response.data;
  },

  getOrder: async (orderId: number): Promise<OrderDetail> => {
    const response = await apiClient.get<OrderDetail>(`/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (input: CreateOrderInput): Promise<OrderDetail> => {
    const response = await apiClient.post<OrderDetail>('/orders', input);
    return response.data;
  },

  updateOrderInfo: async (orderId: number, input: UpdateOrderInfoInput): Promise<OrderDetail> => {
    const response = await apiClient.put<OrderDetail>(`/orders/${orderId}`, input);
    return response.data;
  },

  addItem: async (orderId: number, menuItemId: number, quantity: number, note?: string): Promise<OrderDetail> => {
    const response = await apiClient.post<OrderDetail>(`/orders/${orderId}/items`, {
      menuItemId,
      quantity,
      note,
    });
    return response.data;
  },

  addCustomItem: async (
    orderId: number,
    customName: string,
    customPrice: number,
    quantity: number,
    note?: string
  ): Promise<OrderDetail> => {
    const response = await apiClient.post<OrderDetail>(`/orders/${orderId}/items`, {
      customName,
      customPrice,
      quantity,
      note,
    });
    return response.data;
  },

  updateItemQuantity: async (orderId: number, orderItemId: number, quantity: number): Promise<OrderDetail> => {
    const response = await apiClient.put<OrderDetail>(
      `/orders/${orderId}/items/${orderItemId}`,
      { quantity }
    );
    return response.data;
  },

  // Adds or edits the note on a specific line item. Pass an empty string to clear it.
  updateItemNotes: async (orderId: number, orderItemId: number, notes: string): Promise<OrderDetail> => {
    const response = await apiClient.put<OrderDetail>(
      `/orders/${orderId}/items/${orderItemId}/notes`,
      { notes }
    );
    return response.data;
  },

  removeItem: async (orderId: number, orderItemId: number): Promise<OrderDetail> => {
    const response = await apiClient.delete<OrderDetail>(`/orders/${orderId}/items/${orderItemId}`);
    return response.data;
  },

  createPayment: async (
    orderId: number,
    method: PaymentMethod,
    items?: PaymentItemInput[]
  ): Promise<OrderDetail> => {
    const response = await apiClient.post<OrderDetail>(`/orders/${orderId}/payments`, {
      method,
      items: items && items.length > 0 ? items : undefined,
    });
    return response.data;
  },

  updatePaymentMethod: async (orderId: number, method: PaymentMethod): Promise<OrderDetail> => {
    const response = await apiClient.put<OrderDetail>(`/orders/${orderId}/payments/method`, { method });
    return response.data;
  },

 deleteOrder: async (orderId: number): Promise<void> => {
    await apiClient.delete(`/orders/${orderId}`);
  },

  addDivider: async (orderId: number): Promise<OrderDetail> => {
    const response = await apiClient.post<OrderDetail>(`/orders/${orderId}/dividers`);
    return response.data;
  },

  removeDivider: async (orderId: number, dividerId: number): Promise<OrderDetail> => {
    const response = await apiClient.delete<OrderDetail>(`/orders/${orderId}/dividers/${dividerId}`);
    return response.data;
  },
};