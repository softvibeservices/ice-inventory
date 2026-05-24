// src/lib/createLog.ts
// ─────────────────────────────────────────────────────────────────────────────
//  createLog      — writes one ActivityLog document (fire-and-forget safe)
//  getManagerActor — resolves actor fields for a manager from AuthPayload
//  getDeliveryActor — resolves actor fields for a delivery partner by partnerId
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import {connectDB} from "@/lib/mongodb";
import User from "@/models/User";
import DeliveryPartner from "@/models/DeliveryPartner";
import ActivityLog, {
  ActivityAction,
  ActivityCategory,
  ActivityActionType,
  ActivityCategoryType,
  IActivityLogMeta,
} from "@/models/ActivityLog";
import { AuthPayload } from "@/lib/userAuth";

// ─────────────────────────────────────────────────────────────────────────────
//  Input shape
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateLogInput {
  adminId:    mongoose.Types.ObjectId | string;
  actorId:    mongoose.Types.ObjectId | string;
  actorModel: "User" | "DeliveryPartner";
  actorName:  string;
  actorRole:  "manager" | "delivery_partner";
  action:     ActivityActionType;
  metadata:   IActivityLogMeta;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper — resolve manager actor fields from AuthPayload
//
//  Returns null when the caller is an admin (shop owner doing their own work)
//  so callers can simply do:
//
//    const actor = await getManagerActor(auth);
//    if (!actor) return; // admin action — nothing to log
//
//  For managers:
//    auth.userId    = adminId  (shop owner's _id — always, by JWT design)
//    auth.managerId = manager's actual User._id
// ─────────────────────────────────────────────────────────────────────────────

export interface LogActor {
  adminId:    string;
  actorId:    string;
  actorName:  string;
  actorModel: "User" | "DeliveryPartner";
  actorRole:  "manager" | "delivery_partner";
}

export async function getManagerActor(auth: AuthPayload): Promise<LogActor | null> {
  // Only log actions performed by managers, not by the shop owner themselves
  if (auth.role !== "manager" || !auth.managerId) return null;

  try {
    await connectDB();
    const user = await User.findById(auth.managerId).select("name").lean() as { name?: string } | null;
    return {
      adminId:    auth.userId,           // auth.userId is always adminId for managers
      actorId:    auth.managerId,
      actorName:  user?.name ?? "Manager",
      actorModel: "User",
      actorRole:  "manager",
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper — resolve delivery partner actor fields by partnerId
//
//  Usage in delivery routes (verifyDeliveryAuth only gives partnerId):
//
//    const actor = await getDeliveryActor(partnerId);
//    if (!actor) return; // couldn't resolve — skip logging silently
// ─────────────────────────────────────────────────────────────────────────────

export async function getDeliveryActor(partnerId: string): Promise<LogActor | null> {
  try {
    await connectDB();
    const partner = await DeliveryPartner
      .findById(partnerId)
      .select("name adminId")
      .lean() as { name?: string; adminId?: mongoose.Types.ObjectId } | null;

    if (!partner?.adminId) return null;

    return {
      adminId:    partner.adminId.toString(),
      actorId:    partnerId,
      actorName:  partner.name ?? "Partner",
      actorModel: "DeliveryPartner",
      actorRole:  "delivery_partner",
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Action → Category mapping
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_CATEGORY_MAP: Record<ActivityActionType, ActivityCategoryType> = {
  [ActivityAction.ORDER_CREATED]:                  ActivityCategory.ORDER,
  [ActivityAction.ORDER_EDITED]:                   ActivityCategory.ORDER,
  [ActivityAction.ORDER_DISCARDED]:                ActivityCategory.ORDER,
  [ActivityAction.ORDER_SETTLED_CASH]:             ActivityCategory.ORDER,
  [ActivityAction.ORDER_SETTLED_BANK_UPI]:         ActivityCategory.ORDER,
  [ActivityAction.ORDER_DEBT_SETTLED]:             ActivityCategory.ORDER,
  [ActivityAction.ORDER_DELIVERY_STATUS_CHANGED]:  ActivityCategory.ORDER,
  [ActivityAction.CUSTOMER_EDITED]:                ActivityCategory.CUSTOMER,
  [ActivityAction.CUSTOMER_DELETED]:               ActivityCategory.CUSTOMER,
  [ActivityAction.PRODUCT_EDITED]:                 ActivityCategory.PRODUCT,
  [ActivityAction.PRODUCT_DELETED]:                ActivityCategory.PRODUCT,
  [ActivityAction.PRODUCT_RESTOCKED]:              ActivityCategory.STOCK,
  [ActivityAction.PRODUCT_BULK_RESTOCKED]:         ActivityCategory.STOCK,
  [ActivityAction.BILL_GENERATED]:                 ActivityCategory.BILL,
  [ActivityAction.STICKY_NOTE_CREATED]:            ActivityCategory.STICKY_NOTE,
  [ActivityAction.STICKY_NOTE_EDITED]:             ActivityCategory.STICKY_NOTE,
  [ActivityAction.STICKY_NOTE_DELETED]:            ActivityCategory.STICKY_NOTE,
  [ActivityAction.DELIVERY_ORDER_ACCEPTED]:        ActivityCategory.DELIVERY,
  [ActivityAction.DELIVERY_ORDER_DELIVERED]:       ActivityCategory.DELIVERY,
  [ActivityAction.DELIVERY_NOTE_ADDED]:            ActivityCategory.DELIVERY,
  [ActivityAction.DELIVERY_ORDER_VIEWED]:          ActivityCategory.DELIVERY,
  [ActivityAction.DELIVERY_STICKY_NOTE_CREATED]:   ActivityCategory.STICKY_NOTE,
  [ActivityAction.DELIVERY_STICKY_NOTE_EDITED]:    ActivityCategory.STICKY_NOTE,
  [ActivityAction.DELIVERY_STICKY_NOTE_DELETED]:   ActivityCategory.STICKY_NOTE,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Message builder
// ─────────────────────────────────────────────────────────────────────────────

function buildMessage(
  actorName: string,
  actorRole: "manager" | "delivery_partner",
  action:    ActivityActionType,
  m:         IActivityLogMeta
): string {
  const label = actorRole === "manager" ? "Manager" : "Partner";
  const actor = `${label} ${actorName}`;
  const fmt   = (n?: number) => n !== undefined ? `₹${n.toLocaleString("en-IN")}` : "₹?";

  switch (action) {
    case ActivityAction.ORDER_CREATED:
      return `${actor} created order #${m.orderId ?? "?"} for ${fmt(m.orderTotal)}${m.customerName ? ` for ${m.customerName}` : ""}`;
    case ActivityAction.ORDER_EDITED:
      return `${actor} edited order #${m.orderId ?? "?"}${m.customerName ? ` (${m.customerName})` : ""}`;
    case ActivityAction.ORDER_DISCARDED:
      return `${actor} discarded order #${m.orderId ?? "?"} (${fmt(m.orderTotal)})${m.reason ? ` – Reason: ${m.reason}` : ""}`;
    case ActivityAction.ORDER_SETTLED_CASH:
      return `${actor} settled order #${m.orderId ?? "?"} with Cash – ${fmt(m.amountPaid)} received`;
    case ActivityAction.ORDER_SETTLED_BANK_UPI:
      return `${actor} settled order #${m.orderId ?? "?"} via Bank/UPI – ${fmt(m.amountPaid)} received`;
    case ActivityAction.ORDER_DEBT_SETTLED:
      return `${actor} received ${fmt(m.amountPaid)} (${m.settlementMethod ?? "Bank/UPI"}) towards debt of order #${m.orderId ?? "?"}${m.remainingBalance !== undefined ? ` – Remaining: ${fmt(m.remainingBalance)}` : ""}`;
    case ActivityAction.ORDER_DELIVERY_STATUS_CHANGED:
      return `${actor} changed delivery status of #${m.orderId ?? "?"} from ${m.oldDeliveryStatus ?? "?"} → ${m.newDeliveryStatus ?? "?"}`;
    case ActivityAction.CUSTOMER_EDITED:
      return `${actor} updated customer "${m.customerName ?? "?"}"`;
    case ActivityAction.CUSTOMER_DELETED:
      return `${actor} deleted customer "${m.customerName ?? "?"}"${m.shopName ? ` (Shop: ${m.shopName})` : ""}`;
    case ActivityAction.PRODUCT_EDITED:
      return `${actor} updated product "${m.productName ?? "?"}"`;
    case ActivityAction.PRODUCT_DELETED:
      return `${actor} deleted product "${m.productName ?? "?"}"`;
    case ActivityAction.PRODUCT_RESTOCKED:
      return `${actor} restocked "${m.productName ?? "?"}" +${m.quantityAdded ?? 0} units${m.newTotal !== undefined ? ` (total now ${m.newTotal})` : ""}`;
    case ActivityAction.PRODUCT_BULK_RESTOCKED:
      return `${actor} bulk restocked ${m.productCount ?? "?"} products (+${m.totalUnitsAdded ?? 0} total units)`;
    case ActivityAction.BILL_GENERATED:
      return `${actor} generated bill #${m.billSerialNumber ?? "?"} for ${fmt(m.billTotal)}${m.customerName ? ` (${m.customerName})` : ""}`;
    case ActivityAction.STICKY_NOTE_CREATED:
      return `${actor} created sticky note for "${m.customerName ?? "?"}"${m.itemCount !== undefined ? ` (${m.itemCount} items, ${m.totalQuantity ?? 0} boxes total)` : ""}`;
    case ActivityAction.STICKY_NOTE_EDITED:
      return `${actor} edited sticky note for "${m.customerName ?? "?"}"`;
    case ActivityAction.STICKY_NOTE_DELETED:
      return `${actor} deleted sticky note for "${m.customerName ?? "?"}"`;
    case ActivityAction.DELIVERY_ORDER_ACCEPTED:
      return `${actor} accepted order #${m.orderId ?? "?"} (Pending → On the Way)${m.customerName ? ` for ${m.customerName}` : ""}`;
    case ActivityAction.DELIVERY_ORDER_DELIVERED:
      return `${actor} marked order #${m.orderId ?? "?"} as Delivered${m.orderTotal !== undefined ? ` – ${fmt(m.orderTotal)}` : ""}`;
    case ActivityAction.DELIVERY_NOTE_ADDED:
      return `${actor} added note to order #${m.orderId ?? "?"}: "${m.deliveryNote ?? ""}"`;
    case ActivityAction.DELIVERY_ORDER_VIEWED:
      return `${actor} viewed details of order #${m.orderId ?? "?"}`;
    case ActivityAction.DELIVERY_STICKY_NOTE_CREATED:
      return `${actor} created sticky note for "${m.customerName ?? "?"}"${m.itemCount !== undefined ? ` (${m.itemCount} items, ${m.totalQuantity ?? 0} boxes total)` : ""}`;
    case ActivityAction.DELIVERY_STICKY_NOTE_EDITED:
      return `${actor} edited sticky note for "${m.customerName ?? "?"}"`;
    case ActivityAction.DELIVERY_STICKY_NOTE_DELETED:
      return `${actor} deleted sticky note for "${m.customerName ?? "?"}"`;
    default:
      return `${actor} performed action: ${action}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  createLog — public API
//
//  Fire-and-forget safe: catches all errors internally.
//  Await it if you need the write confirmed before responding to the client.
// ─────────────────────────────────────────────────────────────────────────────

export async function createLog(input: CreateLogInput): Promise<void> {
  try {
    await connectDB();
    const category = ACTION_CATEGORY_MAP[input.action];
    const message  = buildMessage(input.actorName, input.actorRole, input.action, input.metadata);

    await ActivityLog.create({
      adminId:    input.adminId,
      actorId:    input.actorId,
      actorModel: input.actorModel,
      actorName:  input.actorName,
      actorRole:  input.actorRole,
      action:     input.action,
      category,
      message,
      metadata:   input.metadata,
    });
  } catch (err) {
    console.error("[ActivityLog] Failed to write log entry:", err);
  }
}