// src/lib/activityLogHelpers.ts
import { logActivity } from './activityLogger';
import { ActivityActionType, CreateActivityLogInput, ActorRole } from '@/types/activityLog';

/**
 * Helper interface for user session data
 * Adjust based on your session structure
 */
interface UserSession {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'delivery_partner' | 'super_admin';
  ownerId?: string; // For managers/delivery partners, this is the shop owner ID
  shopName?: string;
}

/**
 * Get shop context from user session
 */
function getShopContext(user: UserSession): { shopId: string; shopName: string } {
  // If user is owner (admin), their ID is the shop ID
  if (user.role === 'admin') {
    return {
      shopId: user.id,
      shopName: user.shopName || 'Shop',
    };
  }
  
  // For managers and delivery partners, use ownerId
  return {
    shopId: user.ownerId || user.id,
    shopName: user.shopName || 'Shop',
  };
}

/**
 * Map user role to actor role for logging
 * Excludes super_admin from being logged
 */
function mapToActorRole(userRole: UserSession['role']): ActorRole {
  if (userRole === 'super_admin') {
    // Super admins should not be logged, but if they are, map to admin
    return 'admin';
  }
  return userRole as ActorRole;
}

/**
 * Extract IP address from request
 */
export function getClientIP(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || undefined;
}

/**
 * Extract device info from user agent
 */
export function getDeviceInfo(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

// ═══════════════════════════════════════════════
// INVENTORY LOGGING HELPERS
// ═══════════════════════════════════════════════

export async function logPriceChange(params: {
  user: UserSession;
  productId: string;
  productName: string;
  oldSellingPrice?: number;
  newSellingPrice?: number;
  oldMrp?: number;
  newMrp?: number;
  request?: Request;
}) {
  const { user, productId, productName, oldSellingPrice, newSellingPrice, oldMrp, newMrp, request } = params;
  
  // Calculate percentage change
  let priceChangePercent = 0;
  
  if (oldSellingPrice && newSellingPrice) {
    priceChangePercent = Math.abs(((newSellingPrice - oldSellingPrice) / oldSellingPrice) * 100);
  } else if (oldMrp && newMrp) {
    priceChangePercent = Math.abs(((newMrp - oldMrp) / oldMrp) * 100);
  }
  
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.PRICE_CHANGED,
    details: {
      productId,
      productName,
      oldSellingPrice,
      newSellingPrice,
      oldMrp,
      newMrp,
      priceChangePercent,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

export async function logProductDeletion(params: {
  user: UserSession;
  productId: string;
  productName: string;
  lastStock: number;
  lastSellingPrice: number;
  category?: string;
  request?: Request;
}) {
  const { user, productId, productName, lastStock, lastSellingPrice, category, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.PRODUCT_DELETED,
    details: {
      productId,
      productName,
      lastStock,
      lastSellingPrice,
      category,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

export async function logStockEmptied(params: {
  user: UserSession;
  productId: string;
  productName: string;
  previousStock: number;
  reason?: string;
  request?: Request;
}) {
  const { user, productId, productName, previousStock, reason, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.STOCK_EMPTIED,
    details: {
      productId,
      productName,
      previousStock,
      reason,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

export async function logRestockAdded(params: {
  user: UserSession;
  productId: string;
  productName: string;
  previousStock: number;
  addedQuantity: number;
  newStock: number;
  totalCost?: number;
  request?: Request;
}) {
  const { user, productId, productName, previousStock, addedQuantity, newStock, totalCost, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.RESTOCK_ADDED,
    details: {
      productId,
      productName,
      previousStock,
      addedQuantity,
      newStock,
      totalCost,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

// ═══════════════════════════════════════════════
// CUSTOMER LOGGING HELPERS
// ═══════════════════════════════════════════════

export async function logCustomerDeletion(params: {
  user: UserSession;
  customerId: string;
  customerName: string;
  phoneNumber?: string;
  outstandingDebt: number;
  totalOrders: number;
  request?: Request;
}) {
  const { user, customerId, customerName, phoneNumber, outstandingDebt, totalOrders, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.CUSTOMER_DELETED,
    details: {
      customerId,
      customerName,
      phoneNumber,
      outstandingDebt,
      totalOrders,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

// ═══════════════════════════════════════════════
// SALES/BILLING LOGGING HELPERS
// ═══════════════════════════════════════════════

export async function logBillDiscarded(params: {
  user: UserSession;
  billId: string;
  billNumber: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  reason?: string;
  request?: Request;
}) {
  const { user, billId, billNumber, customerName, totalAmount, itemCount, reason, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.BILL_DISCARDED,
    details: {
      billId,
      billNumber,
      customerName,
      totalAmount,
      itemCount,
      reason,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

export async function logBillEdited(params: {
  user: UserSession;
  billId: string;
  billNumber: string;
  customerName: string;
  oldAmount: number;
  newAmount: number;
  editReason?: string;
  request?: Request;
}) {
  const { user, billId, billNumber, customerName, oldAmount, newAmount, editReason, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.BILL_EDITED,
    details: {
      billId,
      billNumber,
      customerName,
      oldAmount,
      newAmount,
      amountDifference: newAmount - oldAmount,
      editReason,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

// ═══════════════════════════════════════════════
// FINANCE LOGGING HELPERS
// ═══════════════════════════════════════════════

export async function logSettlementCompleted(params: {
  user: UserSession;
  orderId: string;
  serialNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'debt';
  previousStatus?: string;
  request?: Request;
}) {
  const { user, orderId, serialNumber, customerName, amount, paymentMethod, previousStatus, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.SETTLEMENT_COMPLETED,
    details: {
      orderId,
      serialNumber,
      customerName,
      amount,
      paymentMethod,
      previousStatus,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

export async function logDebtSettled(params: {
  user: UserSession;
  orderId: string;
  serialNumber: string;
  customerName: string;
  debtAmount: number;
  settledAmount: number;
  paymentMethod: 'cash' | 'upi';
  daysInDebt: number;
  request?: Request;
}) {
  const { user, orderId, serialNumber, customerName, debtAmount, settledAmount, paymentMethod, daysInDebt, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.DEBT_SETTLED,
    details: {
      orderId,
      serialNumber,
      customerName,
      debtAmount,
      settledAmount,
      paymentMethod,
      daysInDebt,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

// ═══════════════════════════════════════════════
// DELIVERY LOGGING HELPERS (MANAGER)
// ═══════════════════════════════════════════════

export async function logDeliveryStatusChanged(params: {
  user: UserSession;
  orderId: string;
  serialNumber: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  orderAmount: number;
  request?: Request;
}) {
  const { user, orderId, serialNumber, customerName, oldStatus, newStatus, orderAmount, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.DELIVERY_STATUS_CHANGED,
    details: {
      orderId,
      serialNumber,
      customerName,
      oldStatus,
      newStatus,
      orderAmount,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

export async function logDeliveryReverted(params: {
  user: UserSession;
  orderId: string;
  serialNumber: string;
  customerName: string;
  orderAmount: number;
  deliveredAt: Date;
  revertReason?: string;
  request?: Request;
}) {
  const { user, orderId, serialNumber, customerName, orderAmount, deliveredAt, revertReason, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: mapToActorRole(user.role),
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.DELIVERY_REVERTED,
    details: {
      orderId,
      serialNumber,
      customerName,
      orderAmount,
      deliveredAt,
      revertReason,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

// ═══════════════════════════════════════════════
// DELIVERY PARTNER LOGGING HELPERS
// ═══════════════════════════════════════════════

export async function logOrderStatusUpdated(params: {
  user: UserSession;
  orderId: string;
  serialNumber: string;
  customerName: string;
  customerAddress?: string;
  oldStatus: string;
  newStatus: string;
  orderAmount: number;
  deliveryPartnerNotes?: string;
  request?: Request;
}) {
  const { user, orderId, serialNumber, customerName, customerAddress, oldStatus, newStatus, orderAmount, deliveryPartnerNotes, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: 'delivery_partner',
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.ORDER_STATUS_UPDATED,
    details: {
      orderId,
      serialNumber,
      customerName,
      customerAddress,
      oldStatus,
      newStatus,
      orderAmount,
      deliveryPartnerNotes,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}

export async function logStickyNoteCreated(params: {
  user: UserSession;
  noteId: string;
  noteTitle: string;
  noteContent: string;
  priority?: 'low' | 'medium' | 'high';
  relatedOrderId?: string;
  relatedSerialNumber?: string;
  request?: Request;
}) {
  const { user, noteId, noteTitle, noteContent, priority, relatedOrderId, relatedSerialNumber, request } = params;
  const shopContext = getShopContext(user);
  
  return logActivity({
    actorId: user.id,
    actorRole: 'delivery_partner',
    actorName: user.name,
    shopId: shopContext.shopId,
    shopName: shopContext.shopName,
    actionType: ActivityActionType.STICKY_NOTE_CREATED,
    details: {
      noteId,
      noteTitle,
      noteContent: noteContent.substring(0, 100), // First 100 chars
      priority,
      relatedOrderId,
      relatedSerialNumber,
      timestamp: new Date(),
    },
    ipAddress: request ? getClientIP(request) : undefined,
    deviceInfo: request ? getDeviceInfo(request) : undefined,
  });
}