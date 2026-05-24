
// src/models/ActivityLog.ts
// ─────────────────────────────────────────────────────────────────────────────
//  ActivityLog — records every significant Manager / Delivery Partner action
//  that the Shop Owner (admin) can review in the Admin Portal.
//
//  Design decisions:
//   • adminId   — always the shop-owner ObjectId so every query is scoped to
//                 exactly one tenant.  Index on (adminId, createdAt) makes the
//                 "show me last N logs" query a single covered-index scan.
//   • actorModel— discriminator that tells the frontend whether actorId refers
//                 to the User collection (manager) or DeliveryPartner collection.
//   • action    — narrow string-literal enum; adding a new action here is the
//                 only schema change required to support a new log point.
//   • category  — broader grouping used for UI filter tabs.
//   • message   — pre-rendered, human-readable sentence stored at write time so
//                 reads are cheap and the formatting logic lives in one place
//                 (the createLog helper, not the UI).
//   • metadata  — schemaless bag for all extra fields listed in the spec.
//                 Typed explicitly in TypeScript (IActivityLogMeta) but stored
//                 as Mixed so we never need a schema migration when we add a
//                 field to an existing action.
//   • TTL index — logs older than LOG_TTL_DAYS are automatically purged by
//                 MongoDB so the collection never grows unbounded.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose, { Schema, Document, models, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Logs older than this many days are automatically deleted by MongoDB TTL. */
export const LOG_TTL_DAYS = 90;

// ─────────────────────────────────────────────────────────────────────────────
//  Action enum
//  Every loggable user-action gets its own string constant.
//  Grouped by role then by feature for readability.
// ─────────────────────────────────────────────────────────────────────────────

export const ActivityAction = {
  // ── Manager · Order ────────────────────────────────────────────────────────
  /** Manager created a brand-new order */
  ORDER_CREATED:                "ORDER_CREATED",
  /** Manager edited an existing order (qty / price / items changed) */
  ORDER_EDITED:                 "ORDER_EDITED",
  /** Manager discarded / cancelled an order */
  ORDER_DISCARDED:              "ORDER_DISCARDED",
  /** Manager settled an order with cash */
  ORDER_SETTLED_CASH:           "ORDER_SETTLED_CASH",
  /** Manager settled an order via bank transfer or UPI */
  ORDER_SETTLED_BANK_UPI:       "ORDER_SETTLED_BANK_UPI",
  /** Manager received a partial/full debt payment on a previously unsettled order */
  ORDER_DEBT_SETTLED:           "ORDER_DEBT_SETTLED",
  /** Manager changed delivery status (Pending → On the Way, etc.) */
  ORDER_DELIVERY_STATUS_CHANGED: "ORDER_DELIVERY_STATUS_CHANGED",

  // ── Manager · Customer ──────────────────────────────────────────────────────
  /** Manager updated a customer's details */
  CUSTOMER_EDITED:              "CUSTOMER_EDITED",
  /** Manager permanently deleted a customer record */
  CUSTOMER_DELETED:             "CUSTOMER_DELETED",

  // ── Manager · Product ───────────────────────────────────────────────────────
  /** Manager updated a product (name / price / unit etc.) */
  PRODUCT_EDITED:               "PRODUCT_EDITED",
  /** Manager permanently deleted a product */
  PRODUCT_DELETED:              "PRODUCT_DELETED",

  // ── Manager · Stock ─────────────────────────────────────────────────────────
  /** Manager restocked a single product */
  PRODUCT_RESTOCKED:            "PRODUCT_RESTOCKED",
  /** Manager ran a bulk-restock across multiple products */
  PRODUCT_BULK_RESTOCKED:       "PRODUCT_BULK_RESTOCKED",

  // ── Manager · Bill ──────────────────────────────────────────────────────────
  /** Manager generated a bill / invoice PDF */
  BILL_GENERATED:               "BILL_GENERATED",

  // ── Manager · Sticky Note ───────────────────────────────────────────────────
  /** Manager created a sticky note (pre-order planning) */
  STICKY_NOTE_CREATED:          "STICKY_NOTE_CREATED",
  /** Manager edited an existing sticky note */
  STICKY_NOTE_EDITED:           "STICKY_NOTE_EDITED",
  /** Manager deleted a sticky note */
  STICKY_NOTE_DELETED:          "STICKY_NOTE_DELETED",

  // ── Delivery Partner · Order ────────────────────────────────────────────────
  /** Delivery partner accepted an order (Pending → On the Way) */
  DELIVERY_ORDER_ACCEPTED:      "DELIVERY_ORDER_ACCEPTED",
  /** Delivery partner marked an order as Delivered */
  DELIVERY_ORDER_DELIVERED:     "DELIVERY_ORDER_DELIVERED",
  /** Delivery partner added a delivery note to an order */
  DELIVERY_NOTE_ADDED:          "DELIVERY_NOTE_ADDED",
  /** Delivery partner opened/viewed order details */
  DELIVERY_ORDER_VIEWED:        "DELIVERY_ORDER_VIEWED",

  // ── Delivery Partner · Sticky Note ──────────────────────────────────────────
  /** Delivery partner created a sticky note */
  DELIVERY_STICKY_NOTE_CREATED: "DELIVERY_STICKY_NOTE_CREATED",
  /** Delivery partner edited a sticky note */
  DELIVERY_STICKY_NOTE_EDITED:  "DELIVERY_STICKY_NOTE_EDITED",
  /** Delivery partner deleted a sticky note */
  DELIVERY_STICKY_NOTE_DELETED: "DELIVERY_STICKY_NOTE_DELETED",
} as const;

export type ActivityActionType = typeof ActivityAction[keyof typeof ActivityAction];

// ─────────────────────────────────────────────────────────────────────────────
//  Category enum  (used for tab/filter grouping in the UI)
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
//  Explicitly typed so call-sites get IntelliSense, but stored as Mixed
//  in MongoDB so we never need a migration to add a sub-field.
// ─────────────────────────────────────────────────────────────────────────────

export interface IActivityLogMeta {
  // ── Order fields ─────────────────────────────────────────────────────────
  orderId?:          string;              // e.g. "ORD001"
  serialNumber?:     string;              // bill serial, e.g. "2504001"
  orderTotal?:       number;              // ₹ value
  customerId?:       string;
  customerName?:     string;
  settlementMethod?: string;              // "Cash" | "Bank/UPI"
  amountPaid?:       number;
  remainingBalance?: number;
  oldDeliveryStatus?: string;
  newDeliveryStatus?: string;
  reason?:           string;              // discard reason

  // ── Customer fields ───────────────────────────────────────────────────────
  shopName?:         string;
  changedFields?:    Record<string, { before: unknown; after: unknown }>;

  // ── Product fields ────────────────────────────────────────────────────────
  productId?:        string;
  productName?:      string;

  // ── Stock fields ──────────────────────────────────────────────────────────
  quantityAdded?:    number;
  newTotal?:         number;
  note?:             string;
  productCount?:     number;              // bulk restock — number of SKUs
  totalUnitsAdded?:  number;              // bulk restock — grand total units

  // ── Bill fields ───────────────────────────────────────────────────────────
  billSerialNumber?: string;
  billTotal?:        number;

  // ── Sticky note fields ────────────────────────────────────────────────────
  noteId?:           string;
  itemCount?:        number;
  totalQuantity?:    number;

  // ── Delivery note ─────────────────────────────────────────────────────────
  deliveryNote?:     string;

  /** Anything else a future action might need */
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Document interface
// ─────────────────────────────────────────────────────────────────────────────

export interface IActivityLog extends Document {
  /** The shop-owner (admin) this log belongs to — primary partition key */
  adminId:    mongoose.Types.ObjectId;

  /** Who performed the action */
  actorId:    mongoose.Types.ObjectId;
  /** Mongoose collection the actor lives in */
  actorModel: "User" | "DeliveryPartner";
  /** Display name of the actor — denormalised so logs survive actor deletion */
  actorName:  string;
  /** Fine-grained role label */
  actorRole:  "manager" | "delivery_partner";

  /** What happened */
  action:     ActivityActionType;

  /** UI filter group */
  category:   ActivityCategoryType;

  /**
   * Pre-rendered, human-readable sentence.
   * Stored at write time so reads are O(1) and the UI never needs to
   * reconstruct the message from raw fields.
   * Example: "Manager Amit created order #ORD042 for ₹3,200"
   */
  message:    string;

  /** Schemaless bag of supporting data for drill-down views */
  metadata:   IActivityLogMeta;

  createdAt:  Date;
  updatedAt:  Date;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Schema
// ─────────────────────────────────────────────────────────────────────────────

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    // ── Tenant scoping ──────────────────────────────────────────────────────
    adminId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },

    // ── Actor ───────────────────────────────────────────────────────────────
    actorId: {
      type:     Schema.Types.ObjectId,
      required: true,
    },
    actorModel: {
      type:     String,
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
      enum:     ["manager", "delivery_partner"],
      required: true,
    },

    // ── What happened ───────────────────────────────────────────────────────
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

    // ── Extra data ──────────────────────────────────────────────────────────
    metadata: {
      type:    Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    // Keeps write concern light — we never need to update a log entry
    versionKey: false,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
//  Indexes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Primary query pattern: "show me the latest N logs for shop-owner X"
 * Covered by (adminId, createdAt DESC).
 */
ActivityLogSchema.index({ adminId: 1, createdAt: -1 });

/**
 * Filter by actor: "show me only Manager Amit's actions"
 */
ActivityLogSchema.index({ adminId: 1, actorId: 1, createdAt: -1 });

/**
 * Filter by category tab (order / product / delivery …)
 */
ActivityLogSchema.index({ adminId: 1, category: 1, createdAt: -1 });

/**
 * Filter by role: manager-only or delivery-partner-only logs
 */
ActivityLogSchema.index({ adminId: 1, actorRole: 1, createdAt: -1 });

/**
 * TTL index — MongoDB automatically removes documents once
 * createdAt is older than LOG_TTL_DAYS days.
 * Change LOG_TTL_DAYS above if you want a different retention window.
 */
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