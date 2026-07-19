export type OrderType = 'DINE_IN' | 'TAKEAWAY';
export type OrderStatus = 'OPEN' | 'PAID';
export type PaymentMethod = 'CASH' | 'CARD';

export interface OrderItem {
  id: number;
  menuItemId: number | null; // null for custom, one-off items
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  custom: boolean;
}

export interface OrderSummary {
  id: number;
  orderType: OrderType;
  tableNumber: number | null;
  customerName: string | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
}

export interface OrderDetail extends Omit<OrderSummary, never> {
  items: OrderItem[];
}

export interface CreateOrderInput {
  orderType: OrderType;
  tableNumber?: number;
  customerName?: string;
}