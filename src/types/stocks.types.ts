// src/types/stocks.ts
export interface Product {
    _id: string;
    userId: string;
    name: string;
    category?: string;
    unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
    quantity: number;
    minStock?: number;
    packQuantity?: number;
    packUnit?: string;
  }
  
  export interface RestockItem {
    productId: string;
    name: string;
    category?: string;
    unit: string;
    quantity: number;
    note: string;
  }
  
  export interface RestockHistory {
    _id: string;
    createdAt: string;
    items: RestockItem[];
  }
  