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
    unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
    quantity: number;
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
    unit?: Product["unit"];
  }
  
  export interface StickyNote {
    _id: string;
    userId: string;
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
    unit?: Product["unit"];
  }
  
  export type ModalMode = "create" | "edit";
  