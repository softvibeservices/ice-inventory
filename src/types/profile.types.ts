// src/types/profile.types.ts

export type ActiveTab =
  | "basic"
  | "billing"
  | "bank"
  | "product-settings"
  | "delivery"
  | "managers"
  | "sessions"
  | "password"
  | "serial"
  | "subscription"
  | "logout";

export type UserProfile = {
  _id: string;
  name: string;
  email: string;
  contact: string;
  shopName: string;
  shopAddress: string;
  role?: string;
};

export interface SellerDetails {
  _id?: string;
  userId?: string;
  sellerName: string;
  contact: string;
  gstNumber: string;
  fullAddress: string;
  logoUrl?: string;
  logoPublicId?: string;
  qrCodeUrl: string;
  qrPublicId?: string;
  signatureUrl: string;
  signaturePublicId?: string;
  slogan: string;
  compositionLine?: string;
}

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

export type UserSettings = {
  _id?: string;
  userId: string;
  categories: string[];
  units: string[];
};

// ✅ Device-level security types

// Only two statuses: active or banned (no more "blocked" with date pickers)
export type DeviceStatus = "active" | "banned";

export type Device = {
  _id: string;
  deviceId: string;
  label: string;         // e.g. "Chrome on Windows"
  browser: string;
  platform: string;
  ip: string;
  status: DeviceStatus;
  blockedUntil: string | null;   // kept for backward compat, not used in UI
  lastSeen: string;
  createdAt: string;
  isCurrent?: boolean;   // true if this is the currently active session
};

export type ManagerDevice = Omit<Device, "isCurrent">;

export type ManagerWithDevices = {
  _id: string;
  name: string;
  email: string;
  contact: string;
  status: "pending" | "approved" | "rejected" | "blocked";
  tokenVersion?: number;
  devices?: ManagerDevice[];
  devicesLoaded?: boolean;
};