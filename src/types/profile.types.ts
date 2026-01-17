// src/types/profile.types.ts

export type ActiveTab = "basic" | "password" | "billing" | "bank" | "logout" | "delivery" | "managers";

export type UserProfile = {
  _id: string;
  name: string;
  email: string;
  contact: string;
  shopName: string;
  shopAddress: string;
  role?: string;
};

export type SellerDetails = {
  _id?: string;
  userId?: string;
  sellerName?: string;
  gstNumber?: string;
  fullAddress?: string;
  logoUrl?: string;
  logoPublicId?: string;
  qrCodeUrl?: string;
  qrPublicId?: string;
  signatureUrl?: string;
  signaturePublicId?: string;
  slogan?: string;
};

export type BankDetails = {
  _id?: string;
  sellerId?: string;
  bankName: string;
  ifscCode: string;
  branchName: string;
  bankingName: string;
  accountNumber: string;
};

export type PasswordForm = {
  oldPassword: string;
  newPassword: string;
  otp: string;
};

export type UploadingState = {
  logo: boolean;
  qr: boolean;
  sig: boolean;
};