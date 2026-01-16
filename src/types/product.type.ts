// icecream-inventory/src/types/product.type.ts

export interface Product {
    _id?: string;
    userId?: string;
    name: string;
    category?: string;
    unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
    packQuantity?: number;
    packUnit?: string;
    sellingPrice: number;
    mrp?: number;
    quantity?: number;
    minStock?: number;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
  }
  
  export type FormState = {
    name: string;
    category: string;
    unit: Product["unit"];
    packQuantity: string;
    packUnit: string;
    sellingPrice: string;
    mrp: string;
    quantity: string;
    minStock: string;
    notes: string;
  };
  
  export type SortMode =
    | "default"
    | "category"
    | "unit"
    | "price-asc"
    | "price-desc"
    | "name-asc"
    | "name-desc";
  