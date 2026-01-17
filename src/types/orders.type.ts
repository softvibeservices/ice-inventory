// src/types/orders.type.ts

export type OrderStatus = "Unsettled" | "settled" | "Debt";
export type SettlementMethod = "Cash" | "Bank/UPI" | "Debt";
export type CashBankMethod = "Cash" | "Bank/UPI";
export type TabFilter = "Unsettled" | "Settled" | "Discarded" | "Debt";
export type SortMode =
  | "date-desc"
  | "date-asc"
  | "total-desc"
  | "total-asc"
  | "shop-asc"
  | "shop-desc"
  | "customer-asc"
  | "customer-desc"
  | "area-asc"
  | "area-desc"
  | "serial-asc"
  | "serial-desc";

export type QuantitySummary = {
  piece: number;
  box: number;
  kg: number;
  litre: number;
  gm: number;
  ml: number;
};

export type OrderLineItem = {
  productId?: string;
  productName: string;
  quantity: number;
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
};

export type Order = {
  _id: string;
  userId: string;
  orderId: string;
  serialNumber: string;
  shopName: string;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  customerId?: string;

  items?: OrderLineItem[];
  freeItems?: OrderLineItem[];

  quantitySummary: QuantitySummary;
  subtotal: number;
  discountPercentage: number;
  total: number;
  status: OrderStatus;

  settlementMethod?: SettlementMethod | null;
  settlementAmount?: number;
  settledAt?: string | null;
  discardedAt?: string | null;

  deliveryPartnerId?: string | null;
  deliveryStatus?: "Pending" | "On the Way" | "Delivered";
  deliveryAssignedAt?: string | null;
  deliveryOnTheWayAt?: string | null;
  deliveryCompletedAt?: string | null;

  deliveryNotes?: string;

  remarks?: string;
  createdAt?: string;
};

export type Product = {
  _id: string;
  name: string;
  packUnit?: string;
};

export type CustomerLite = {
  _id: string;
  name: string;
  shopName: string;
  shopAddress?: string;
  area?: string;
  contacts?: string[];
};
