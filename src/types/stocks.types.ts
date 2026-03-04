// src/types/stocks.types.ts

export interface Product {
  _id: string;
  userId: string;
  name: string;
  category?: string;
  unit: string;
  quantity: number;
  minStock?: number;
  packQuantity?: number;
  packUnit?: string;
}

// productId is a plain string when writing (POST),
// but a populated object when reading (GET with populate)
export interface RestockItem {
  productId: string | { _id: string; name: string; category?: string; unit: string };
  quantity: number;
  note: string;
}

export interface RestockHistory {
  _id: string;
  createdAt: string;
  items: RestockItem[];
}

// Helper to safely read product fields from a RestockItem after populate
export function getRestockItemProduct(item: RestockItem): {
  name: string;
  category?: string;
  unit: string;
} {
  if (typeof item.productId === "object" && item.productId !== null) {
    return {
      name: item.productId.name,
      category: item.productId.category,
      unit: item.productId.unit,
    };
  }
  // Fallback if product was deleted
  return { name: "Deleted Product", category: undefined, unit: "-" };
}