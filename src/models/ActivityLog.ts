// src/models/ActivityLog.ts

import mongoose, { Schema, Document, models, Model } from "mongoose";

export const LOG_TTL_DAYS = 90;

// ─────────────────────────────────────────────────────────────────────────────
//  Action enum
// ─────────────────────────────────────────────────────────────────────────────

export const ActivityAction = {
  // ── Manager · Order ────────────────────────────────────────────────────────
  ORDER_CREATED:                 "ORDER_CREATED",
  ORDER_EDITED:                  "ORDER_EDITED",
  ORDER_DISCARDED:               "ORDER_DISCARDED",
  ORDER_SETTLED_CASH:            "ORDER_SETTLED_CASH",
  ORDER_SETTLED_BANK_UPI:        "ORDER_SETTLED_BANK_UPI",
  ORDER_DEBT_SETTLED:            "ORDER_DEBT_SETTLED",
  ORDER_DELIVERY_STATUS_CHANGED: "ORDER_DELIVERY_STATUS_CHANGED",

  // ── Manager · Customer ──────────────────────────────────────────────────────
  CUSTOMER_EDITED:               "CUSTOMER_EDITED",
  CUSTOMER_DELETED:              "CUSTOMER_DELETED",

  // ── Manager · Product ───────────────────────────────────────────────────────
  PRODUCT_EDITED:                "PRODUCT_EDITED",
  PRODUCT_DELETED:               "PRODUCT_DELETED",

  // ── Manager · Stock ─────────────────────────────────────────────────────────
  PRODUCT_RESTOCKED:             "PRODUCT_RESTOCKED",
  PRODUCT_BULK_RESTOCKED:        "PRODUCT_BULK_RESTOCKED",

  // ── Manager · Bill ──────────────────────────────────────────────────────────
  BILL_GENERATED:                "BILL_GENERATED",

  // ── Manager · Sticky Note ───────────────────────────────────────────────────
  STICKY_NOTE_CREATED:           "STICKY_NOTE_CREATED",
  STICKY_NOTE_EDITED:            "STICKY_NOTE_EDITED",
  STICKY_NOTE_DELETED:           "STICKY_NOTE_DELETED",

  // ── Delivery Partner · Order ────────────────────────────────────────────────
  DELIVERY_ORDER_ACCEPTED:       "DELIVERY_ORDER_ACCEPTED",
  DELIVERY_ORDER_DELIVERED:      "DELIVERY_ORDER_DELIVERED",
  DELIVERY_NOTE_ADDED:           "DELIVERY_NOTE_ADDED",
  DELIVERY_ORDER_VIEWED:         "DELIVERY_ORDER_VIEWED",

  // ── Delivery Partner · Sticky Note ──────────────────────────────────────────
  DELIVERY_STICKY_NOTE_CREATED:  "DELIVERY_STICKY_NOTE_CREATED",
  DELIVERY_STICKY_NOTE_EDITED:   "DELIVERY_STICKY_NOTE_EDITED",
  DELIVERY_STICKY_NOTE_DELETED:  "DELIVERY_STICKY_NOTE_DELETED",
} as const;

export type ActivityActionType = typeof ActivityAction[keyof typeof ActivityAction];

// ─────────────────────────────────────────────────────────────────────────────
//  Category enum
// ─────────────────────────────────────────────────────────────────────────────

export const ActivityCategory = {
  ORDER:       "order",
  CUSTOMER:    "customer",
  PRODUCT:     "product",
  STOCK:       "stock",
  BILL:        "bill",
  STICKY_NOTE: "sticky_note",
  DELIVERY:    "delivery",
} as const;

export type ActivityCategoryType = typeof ActivityCategory[keyof typeof ActivityCategory];

// ─────────────────────────────────────────────────────────────────────────────
//  Metadata shape
// ─────────────────────────────────────────────────────────────────────────────

export interface IActivityLogMeta {
  orderId?:           string;
  serialNumber?:      string;
  orderTotal?:        number;
  customerId?:        string;
  customerName?:      string;
  settlementMethod?:  string;
  amountPaid?:        number;
  remainingBalance?:  number;
  oldDeliveryStatus?: string;
  newDeliveryStatus?: string;
  reason?:            string;
  shopName?:          string;
  changedFields?:     Record<string, { before: unknown; after: unknown }>;
  productId?:         string;
  productName?:       string;
  quantityAdded?:     number;
  newTotal?:          number;
  note?:              string;
  productCount?:      number;
  totalUnitsAdded?:   number;
  billSerialNumber?:  string;
  billTotal?:         number;
  noteId?:            string;
  itemCount?:         number;
  totalQuantity?:     number;
  deliveryNote?:      string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Document interface
// ─────────────────────────────────────────────────────────────────────────────

export interface IActivityLog extends Document {
  adminId:    mongoose.Types.ObjectId;
  actorId:    mongoose.Types.ObjectId;
  actorModel: "User" | "DeliveryPartner";
  actorName:  string;

  // ─── FIX 1: "admin" added to actorRole ───────────────────────────────────
  actorRole:  "admin" | "manager" | "delivery_partner";

  action:     ActivityActionType;
  category:   ActivityCategoryType;
  message:    string;
  metadata:   IActivityLogMeta;
  createdAt:  Date;
  updatedAt:  Date;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Schema
// ─────────────────────────────────────────────────────────────────────────────

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    adminId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    actorId: {
      type:     Schema.Types.ObjectId,
      required: true,
    },
    actorModel: {
      type:     String,
      // ─── FIX: admin actors live in the User collection too ───────────────
      enum:     ["User", "DeliveryPartner"],
      required: true,
    },
    actorName: {
      type:     String,
      required: true,
      trim:     true,
    },
    actorRole: {
      type:     String,
      // ─── FIX 1: Added "admin" to the enum so MongoDB accepts admin writes ─
      enum:     ["admin", "manager", "delivery_partner"],
      required: true,
    },
    action: {
      type:     String,
      enum:     Object.values(ActivityAction),
      required: true,
    },
    category: {
      type:     String,
      enum:     Object.values(ActivityCategory),
      required: true,
    },
    message: {
      type:     String,
      required: true,
      trim:     true,
    },
    metadata: {
      type:    Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
//  Indexes
// ─────────────────────────────────────────────────────────────────────────────

ActivityLogSchema.index({ adminId: 1, createdAt: -1 });
ActivityLogSchema.index({ adminId: 1, actorId: 1, createdAt: -1 });
ActivityLogSchema.index({ adminId: 1, category: 1, createdAt: -1 });
ActivityLogSchema.index({ adminId: 1, actorRole: 1, createdAt: -1 });
ActivityLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: LOG_TTL_DAYS * 24 * 60 * 60 }
);

// ─────────────────────────────────────────────────────────────────────────────
//  Model (Next.js hot-reload safe)
// ─────────────────────────────────────────────────────────────────────────────

const ActivityLog: Model<IActivityLog> =
  (models.ActivityLog as Model<IActivityLog>) ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;