// src/types/product-sales.types.ts

export interface ProductSalesRow {
    productId: string;
    productName: string;
    category?: string;
    unit: string;
    date: string;         // "YYYY-MM-DD" or "YYYY-MM"
    totalQuantity: number;
    orderCount: number;
    totalRevenue: number;
  }
  
  export interface ProductSalesSummaryItem {
    productId: string;
    productName: string;
    category?: string;
    unit: string;
    totalQuantity: number;
    orderCount: number;
  }
  
  export interface ProductSalesResponse {
    rows: ProductSalesRow[];
    summary: ProductSalesSummaryItem[];
  }
  
  export type ProductSalesGroupBy = "date" | "month";