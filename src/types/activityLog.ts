// src/types/activityLog.ts
import { ObjectId } from 'mongoose';

// ═══════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════

export enum ActivityActionType {
  // Inventory Actions (4)
  PRICE_CHANGED = 'price_changed',
  PRODUCT_DELETED = 'product_deleted',
  STOCK_EMPTIED = 'stock_emptied',
  RESTOCK_ADDED = 'restock_added',
  
  // Customer Actions (1)
  CUSTOMER_DELETED = 'customer_deleted',
  
  // Sales/Billing Actions (4)
  BILL_DISCARDED = 'bill_discarded',
  BILL_EDITED = 'bill_edited',
  SETTLEMENT_COMPLETED = 'settlement_completed',
  DEBT_SETTLED = 'debt_settled',
  
  // Delivery Actions - Manager (2)
  DELIVERY_STATUS_CHANGED = 'delivery_status_changed',
  DELIVERY_REVERTED = 'delivery_reverted',
  
  // Delivery Partner Actions (2)
  ORDER_STATUS_UPDATED = 'order_status_updated',
  STICKY_NOTE_CREATED = 'sticky_note_created',
}

export type ActivityCategory = 
  | 'inventory' 
  | 'sales' 
  | 'customer' 
  | 'delivery' 
  | 'finance';

// FIXED: Added 'admin' to support admin role
export type ActorRole = 'admin' | 'manager' | 'delivery_partner';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type PaymentMethod = 'cash' | 'upi' | 'debt';

// ═══════════════════════════════════════════════
// DETAIL TYPES
// ═══════════════════════════════════════════════

interface BaseDetails {
  timestamp: Date;
}

export interface PriceChangedDetails extends BaseDetails {
  productId: string;
  productName: string;
  oldSellingPrice?: number;
  newSellingPrice?: number;
  oldMrp?: number;
  newMrp?: number;
  priceChangePercent: number;
}

export interface ProductDeletedDetails extends BaseDetails {
  productId: string;
  productName: string;
  lastStock: number;
  lastSellingPrice: number;
  category?: string;
}

export interface StockEmptiedDetails extends BaseDetails {
  productId: string;
  productName: string;
  previousStock: number;
  reason?: string;
}

export interface RestockAddedDetails extends BaseDetails {
  productId: string;
  productName: string;
  previousStock: number;
  addedQuantity: number;
  newStock: number;
  totalCost?: number;
}

export interface CustomerDeletedDetails extends BaseDetails {
  customerId: string;
  customerName: string;
  phoneNumber?: string;
  outstandingDebt: number;
  totalOrders: number;
}

export interface BillDiscardedDetails extends BaseDetails {
  billId: string;
  billNumber: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  reason?: string;
}

export interface BillEditedDetails extends BaseDetails {
  billId: string;
  billNumber: string;
  customerName: string;
  oldAmount: number;
  newAmount: number;
  amountDifference: number;
  editReason?: string;
}

export interface SettlementCompletedDetails extends BaseDetails {
  orderId: string;
  serialNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  previousStatus?: string;
}

export interface DebtSettledDetails extends BaseDetails {
  orderId: string;
  serialNumber: string;
  customerName: string;
  debtAmount: number;
  settledAmount: number;
  paymentMethod: 'cash' | 'upi';
  daysInDebt: number;
}

export interface DeliveryStatusChangedDetails extends BaseDetails {
  orderId: string;
  serialNumber: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  orderAmount: number;
}

export interface DeliveryRevertedDetails extends BaseDetails {
  orderId: string;
  serialNumber: string;
  customerName: string;
  orderAmount: number;
  deliveredAt: Date;
  revertReason?: string;
}

export interface OrderStatusUpdatedDetails extends BaseDetails {
  orderId: string;
  serialNumber: string;
  customerName: string;
  customerAddress?: string;
  oldStatus: string;
  newStatus: string;
  orderAmount: number;
  deliveryPartnerNotes?: string;
}

export interface StickyNoteCreatedDetails extends BaseDetails {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  priority?: 'low' | 'medium' | 'high';
  relatedOrderId?: string;
  relatedSerialNumber?: string;
}

export type ActivityDetails =
  | PriceChangedDetails
  | ProductDeletedDetails
  | StockEmptiedDetails
  | RestockAddedDetails
  | CustomerDeletedDetails
  | BillDiscardedDetails
  | BillEditedDetails
  | SettlementCompletedDetails
  | DebtSettledDetails
  | DeliveryStatusChangedDetails
  | DeliveryRevertedDetails
  | OrderStatusUpdatedDetails
  | StickyNoteCreatedDetails;

// ═══════════════════════════════════════════════
// HELPER TYPES
// ═══════════════════════════════════════════════

export interface CreateActivityLogInput {
  actorId: string;
  actorRole: ActorRole;
  actorName: string;
  shopId: string;
  shopName: string;
  actionType: ActivityActionType;
  details: ActivityDetails;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface ActivityLogFilters {
  shopId?: string;
  actorId?: string;
  actionCategory?: ActivityCategory;
  actionType?: ActivityActionType;
  severity?: Severity;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;  // For customer name or serial number
}

export interface PaginatedActivityLogs {
  logs: any[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════════════
// STATISTICS TYPES
// ═══════════════════════════════════════════════

export interface ActivityStats {
  totalLogs: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  topActors: Array<{
    id: string;
    name: string;
    role: ActorRole;
    count: number;
  }>;
  recentCritical: any[];
}

export interface SuperAdminStats {
  totalLogs: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  topShops: Array<{
    shopId: string;
    shopName: string;
    activityCount: number;
  }>;
  criticalAlerts: any[];
}