// src/types/orders.type.ts

// ✅ Dynamic quantities (not hardcoded units)
export type QuantitySummary = Record<string, number>;

export type OrderStatus = "Unsettled" | "settled" | "Debt";

export type SettlementMethod = "Cash" | "Bank/UPI" | "Debt";

// ✅ unit is now string (not enum)
export type OrderLineItem = {
  productId?: string;
  productName: string;
  quantity: number;
  unit: string; // ✅ Any unit from UserSettings
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
  updatedAt?: string; // ✅ Used to show "last edited" on card and for sort
};

export type CustomerLite = {
  _id: string;
  name: string;
  shopName: string;
  shopAddress?: string;
  area?: string;
  contacts?: string[];
};

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
  | "serial-desc"
  | "updated-desc"   // ✅ NEW: Recently edited first
  | "updated-asc";   // ✅ NEW: Oldest edit first

export type CashBankMethod = "Cash" | "Bank/UPI";