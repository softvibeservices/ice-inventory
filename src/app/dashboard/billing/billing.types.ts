// src/app/dashboard/billing/billing.types.ts
// Shared types for all billing sub-components

export type Customer = {
  _id: string;
  name: string;
  contact?: string;
  address?: string;
  contacts?: string[];
  shopName?: string;
  shopAddress?: string;
};

export type Product = {
  _id: string;
  name: string;
  unit?: string;
  sellingPrice?: number;
  price?: number;
  currentStock?: number;
  stock?: number;
  stockQty?: number;
  availableQty?: number;
  quantityInStock?: number;
  quantity?: number;
  packQuantity?: number;
  packUnit?: string;
};

export type SellerDetails = {
  _id?: string;
  sellerName?: string;
  gstNumber?: string;
  fullAddress?: string;
  contact?: string;
  slogan?: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  signatureUrl?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankingName?: string;
  compositionLine?: string;
};

export type BankDetails = {
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankingName?: string;
};

export type BillItem = {
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  free: boolean;
};