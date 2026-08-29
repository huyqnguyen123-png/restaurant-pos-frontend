export type OrderType = 'DINE_IN' | 'TAKEAWAY';
export type OrderStatus = 'OPEN' | 'PAID';
export type PaymentMethod = 'CASH' | 'CARD';

export interface OrderItem {
  id: number;
  menuItemId: number | null;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  custom: boolean;
  notes: string | null;
}

// One row in the order's visual timeline — either a real item, or a
// divider marking where one person's order ends and the next begins.
export interface OrderLine {
  type: 'ITEM' | 'DIVIDER';
  item: OrderItem | null;
  dividerId: number | null;
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
  timeline: OrderLine[];
}

export interface CreateOrderInput {
  orderType: OrderType;
  tableNumber?: number;
  customerName?: string;
}