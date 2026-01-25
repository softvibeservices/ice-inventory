// src/app/dashboard/types.ts

export interface Order {
  _id: string;
  serialNumber?: string;
  shopName?: string;
  customerName?: string;
  total?: number;
  status?: "Unsettled" | "settled";
  settlementMethod?: string | null;
  deliveryStatus?: "Pending" | "On the Way" | "Delivered";
  createdAt?: string;
}

export interface Product {
  _id: string;
  userId: string;
  name: string;
  category?: string;
  unit: string; // ✅ Changed from enum to string for dynamic units
  quantity: number;
  packQuantity?: number;
  packUnit?: string;
}

export interface Customer {
  _id: string;
  name: string;
  shopName: string;
  shopAddress: string;
  area?: string;
}

export interface StickyNoteItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: string; // ✅ Changed from Product["unit"] to string for dynamic units
}

export interface StickyNote {
  _id: string;
  userId: string;
  deliveryPartnerId?: string;
  customerId?: string;
  customerName: string;
  shopName: string;
  items: StickyNoteItem[];
  totalQuantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StickyRow {
  productId?: string;
  productName: string;
  quantity: string;
  unit?: string; // ✅ Changed from Product["unit"] to string for dynamic units
}

export type ModalMode = "create" | "edit";