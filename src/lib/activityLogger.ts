// src/lib/activityLogger.ts
import { connectDB } from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';
import {
  ActivityActionType,
  ActivityCategory,
  Severity,
  CreateActivityLogInput,
  ActivityLogFilters,
  PaginatedActivityLogs,
  ActivityStats,
  SuperAdminStats,
} from '@/types/activityLog';

// ═══════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════

/**
 * Get business date (date at 00:00:00)
 * Used for grouping activities by business day
 */
function getBusinessDate(date: Date = new Date()): Date {
  const businessDate = new Date(date);
  businessDate.setHours(0, 0, 0, 0);
  return businessDate;
}

/**
 * Determine action category from action type
 */
function getActionCategory(actionType: ActivityActionType): ActivityCategory {
  const categoryMap: Record<ActivityActionType, ActivityCategory> = {
    // Inventory
    [ActivityActionType.PRICE_CHANGED]: 'inventory',
    [ActivityActionType.PRODUCT_DELETED]: 'inventory',
    [ActivityActionType.STOCK_EMPTIED]: 'inventory',
    [ActivityActionType.RESTOCK_ADDED]: 'inventory',
    
    // Customer
    [ActivityActionType.CUSTOMER_DELETED]: 'customer',
    
    // Sales
    [ActivityActionType.BILL_DISCARDED]: 'sales',
    [ActivityActionType.BILL_EDITED]: 'sales',
    
    // Finance
    [ActivityActionType.SETTLEMENT_COMPLETED]: 'finance',
    [ActivityActionType.DEBT_SETTLED]: 'finance',
    
    // Delivery
    [ActivityActionType.DELIVERY_STATUS_CHANGED]: 'delivery',
    [ActivityActionType.DELIVERY_REVERTED]: 'delivery',
    [ActivityActionType.ORDER_STATUS_UPDATED]: 'delivery',
    [ActivityActionType.STICKY_NOTE_CREATED]: 'delivery',
  };
  
  return categoryMap[actionType];
}

/**
 * Calculate severity based on action type and details
 */
function calculateSeverity(
  actionType: ActivityActionType,
  details: any
): Severity {
  switch (actionType) {
    // CRITICAL - Rare, high-impact actions
    case ActivityActionType.DELIVERY_REVERTED:
      return 'critical';
    
    // HIGH - Data deletion or significant changes
    case ActivityActionType.PRODUCT_DELETED:
    case ActivityActionType.STOCK_EMPTIED:
    case ActivityActionType.BILL_DISCARDED:
      return 'high';
    
    // MEDIUM (with conditional HIGH)
    case ActivityActionType.PRICE_CHANGED:
      // If price change > 20%, escalate to HIGH
      return Math.abs(details.priceChangePercent || 0) > 20 ? 'high' : 'medium';
    
    case ActivityActionType.CUSTOMER_DELETED:
    case ActivityActionType.BILL_EDITED:
    case ActivityActionType.DEBT_SETTLED:
      return 'medium';
    
    case ActivityActionType.SETTLEMENT_COMPLETED:
      // Large transactions are more important
      return (details.amount || 0) > 10000 ? 'medium' : 'low';
    
    // LOW - Regular operations
    case ActivityActionType.RESTOCK_ADDED:
    case ActivityActionType.DELIVERY_STATUS_CHANGED:
    case ActivityActionType.ORDER_STATUS_UPDATED:
    case ActivityActionType.STICKY_NOTE_CREATED:
    default:
      return 'low';
  }
}

// ═══════════════════════════════════════════════
// MAIN LOGGING FUNCTION
// ═══════════════════════════════════════════════

/**
 * Log an activity
 * NON-BLOCKING: Never throws errors to calling code
 */
export async function logActivity(
  input: CreateActivityLogInput
): Promise<void> {
  try {
    await connectDB();
    
    const now = new Date();
    const businessDate = getBusinessDate(now);
    const actionCategory = getActionCategory(input.actionType);
    const severity = calculateSeverity(input.actionType, input.details);
    
    const activityLog = new ActivityLog({
      // Actor
      actorId: input.actorId,
      actorRole: input.actorRole,
      actorName: input.actorName,
      
      // Shop
      shopId: input.shopId,
      shopName: input.shopName,
      
      // Action
      actionType: input.actionType,
      actionCategory,
      
      // Details
      details: {
        ...input.details,
        timestamp: now,
      },
      
      // Temporal
      timestamp: now,
      businessDate,
      
      // Metadata
      severity,
      ipAddress: input.ipAddress,
      deviceInfo: input.deviceInfo,
    });
    
    // Insert asynchronously (fire and forget)
    await activityLog.save();
    
  } catch (error) {
    // Log error but don't throw - logging should never break user operations
    console.error('[ActivityLogger] Failed to log activity:', error);
  }
}

// ═══════════════════════════════════════════════
// QUERY FUNCTIONS
// ═══════════════════════════════════════════════

/**
 * Get paginated activity logs with filters
 */
export async function getActivityLogs(
  filters: ActivityLogFilters,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedActivityLogs> {
  await connectDB();
  
  // Build query
  const query: any = {};
  
  if (filters.shopId) {
    query.shopId = filters.shopId;
  }
  
  if (filters.actorId) {
    query.actorId = filters.actorId;
  }
  
  if (filters.actionCategory) {
    query.actionCategory = filters.actionCategory;
  }
  
  if (filters.actionType) {
    query.actionType = filters.actionType;
  }
  
  if (filters.severity) {
    query.severity = filters.severity;
  }
  
  if (filters.startDate || filters.endDate) {
    query.businessDate = {};
    if (filters.startDate) {
      query.businessDate.$gte = getBusinessDate(filters.startDate);
    }
    if (filters.endDate) {
      query.businessDate.$lte = getBusinessDate(filters.endDate);
    }
  }
  
  if (filters.searchTerm) {
    // Search in customer name or serial number
    query.$or = [
      { 'details.customerName': { $regex: filters.searchTerm, $options: 'i' } },
      { 'details.serialNumber': { $regex: filters.searchTerm, $options: 'i' } },
    ];
  }
  
  // Exclude super_admin activities - only show admin, manager and delivery_partner
  query.actorRole = { $in: ['admin', 'manager', 'delivery_partner'] };
  
  // Execute query
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    ActivityLog
      .find(query)
      .sort({ businessDate: -1, timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(query),
  ]);
  
  return {
    logs,
    total,
    page,
    limit,
    hasMore: skip + logs.length < total,
  };
}

/**
 * Get activity statistics for dashboard
 */
export async function getActivityStats(
  shopId: string,
  days: number = 7
): Promise<ActivityStats> {
  await connectDB();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const matchQuery = {
    shopId,
    businessDate: { $gte: getBusinessDate(startDate) },
    actorRole: { $in: ['admin', 'manager', 'delivery_partner'] },
  };
  
  const [bySeverity, byCategory, topActors, recentCritical, total] = await Promise.all([
    // Group by severity
    ActivityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
    ]),
    
    // Group by category
    ActivityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$actionCategory',
          count: { $sum: 1 },
        },
      },
    ]),
    
    // Top actors
    ActivityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { 
            id: '$actorId', 
            name: '$actorName', 
            role: '$actorRole' 
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    
    // Recent critical actions
    ActivityLog
      .find({
        shopId,
        severity: 'critical',
        actorRole: { $in: ['admin', 'manager', 'delivery_partner'] },
      })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean(),
    
    // Total count
    ActivityLog.countDocuments(matchQuery),
  ]);
  
  return {
    totalLogs: total,
    bySeverity: Object.fromEntries(
      bySeverity.map((s: any) => [s._id, s.count])
    ),
    byCategory: Object.fromEntries(
      byCategory.map((c: any) => [c._id, c.count])
    ),
    topActors: topActors.map((a: any) => ({
      id: a._id.id.toString(),
      name: a._id.name,
      role: a._id.role,
      count: a.count,
    })),
    recentCritical,
  };
}

/**
 * Get super admin platform-wide statistics
 */
export async function getSuperAdminStats(days: number = 7): Promise<SuperAdminStats> {
  await connectDB();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const matchQuery = {
    businessDate: { $gte: getBusinessDate(startDate) },
    actorRole: { $in: ['admin', 'manager', 'delivery_partner'] },
  };
  
  const [totalLogs, bySeverity, byCategory, topShops, criticalAlerts] = await Promise.all([
    // Total logs
    ActivityLog.countDocuments(matchQuery),
    
    // By severity
    ActivityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
    ]),
    
    // By category
    ActivityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$actionCategory',
          count: { $sum: 1 },
        },
      },
    ]),
    
    // Top shops by activity
    ActivityLog.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { shopId: '$shopId', shopName: '$shopName' },
          activityCount: { $sum: 1 },
        },
      },
      { $sort: { activityCount: -1 } },
      { $limit: 10 },
    ]),
    
    // Recent critical alerts
    ActivityLog
      .find({
        severity: 'critical',
        businessDate: { $gte: getBusinessDate(startDate) },
        actorRole: { $in: ['admin', 'manager', 'delivery_partner'] },
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean(),
  ]);
  
  return {
    totalLogs,
    bySeverity: Object.fromEntries(
      bySeverity.map((s: any) => [s._id, s.count])
    ),
    byCategory: Object.fromEntries(
      byCategory.map((c: any) => [c._id, c.count])
    ),
    topShops: topShops.map((s: any) => ({
      shopId: s._id.shopId.toString(),
      shopName: s._id.shopName,
      activityCount: s.activityCount,
    })),
    criticalAlerts,
  };
}

/**
 * Search activity logs by serial number
 */
export async function searchBySerialNumber(
  serialNumber: string,
  shopId?: string
): Promise<any[]> {
  await connectDB();
  
  const query: any = {
    'details.serialNumber': { $regex: serialNumber, $options: 'i' },
    actorRole: { $in: ['admin', 'manager', 'delivery_partner'] },
  };
  
  if (shopId) {
    query.shopId = shopId;
  }
  
  const logs = await ActivityLog
    .find(query)
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();
  
  return logs;
}

/**
 * Search activity logs by customer name
 */
export async function searchByCustomerName(
  customerName: string,
  shopId?: string
): Promise<any[]> {
  await connectDB();
  
  const query: any = {
    'details.customerName': { $regex: customerName, $options: 'i' },
    actorRole: { $in: ['admin', 'manager', 'delivery_partner'] },
  };
  
  if (shopId) {
    query.shopId = shopId;
  }
  
  const logs = await ActivityLog
    .find(query)
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();
  
  return logs;
}