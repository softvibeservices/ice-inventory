// src/types/Customer.ts
export interface Customer {
    _id: string;
    name: string;
    contacts: string[];
    shopName: string;
    shopAddress: string;
    area?: string;
    location?: { latitude?: number; longitude?: number };
    credit: number;
    debit: number;
    totalSales: number;
    remarks?: string;
    createdAt?: string;
  }
  
  export type FormState = { 
    name: string;
    contacts: string[];
    shopName: string;
    shopAddress: string;
    area: string;
    latitude: string;
    longitude: string;
    remarks: string;
    credit: string;
    debit: string;
    totalSales: string;
  };
  
  export type SortMode =
    | "default"
    | "credit-asc"
    | "credit-desc"
    | "debit-asc"
    | "debit-desc"
    | "sales-asc"
    | "sales-desc";
  