// src/models/Order.ts
import mongoose, { Schema, Document, models } from "mongoose";

/* =======================
   Interfaces (TypeScript)
======================= */

export interface IOrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: string;
  price?: number;
  total?: number;
}

export interface ISettlementHistory {
  action: string;
  method?: string;
  amountPaid?: number;
  at: Date;
  note?: string;
}

export interface IOrder extends Document {
  userId: string;
  orderId: string;
  serialNumber?: string;
  shopName?: string;

  customerId?: string;
  customerName?: string;
  customerAddress?: string;
  customerContact?: string;
  customerLat?: number | null;
  customerLng?: number | null;

  items: IOrderItem[];
  freeItems?: IOrderItem[];
  quantitySummary?: any;
  subtotal?: number;
  discountPercentage?: number;
  total?: number;
  remarks?: string;

  // Settlement
  status?: "Unsettled" | "settled";
  settlementMethod?: string | null;
  settlementAmount?: number;
  settlementHistory?: ISettlementHistory[];
  discardedAt?: Date | null;

  // Delivery
  deliveryPartnerId?: string | null;
  deliveryStatus?: "Pending" | "On the Way" | "Delivered";
  deliveryAssignedAt?: Date | null;
  deliveryOnTheWayAt?: Date | null;
  deliveryCompletedAt?: Date | null;
  deliveryNotes?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

/* =======================
   Sub Schemas
======================= */

// ✅ NO GENERICS HERE (fixes TS2590)
const OrderItemSchema = new Schema(
  {
    productId: { type: String },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String },
    price: { type: Number },
    total: { type: Number },
  },
  { _id: false }
);

// ✅ NO GENERICS HERE EITHER
const SettlementSchema = new Schema(
  {
    action: { type: String, required: true },
    method: { type: String },
    amountPaid: { type: Number },
    at: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

/* =======================
   Main Order Schema
======================= */

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    serialNumber: { type: String },

    shopName: { type: String },

    customerId: { type: String },
    customerName: { type: String },
    customerAddress: { type: String },
    customerContact: { type: String },
    customerLat: { type: Number, default: null },
    customerLng: { type: Number, default: null },

    items: { type: [OrderItemSchema], default: [] },
    freeItems: { type: [OrderItemSchema], default: [] },
    quantitySummary: { type: Schema.Types.Mixed },

    subtotal: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    remarks: { type: String },

    status: { type: String, default: "Unsettled" },
    settlementMethod: { type: String, default: null },
    settlementAmount: { type: Number, default: 0 },
    settlementHistory: { type: [SettlementSchema], default: [] },

    // ✅ REQUIRED FOR DISCARDED TAB
    discardedAt: { type: Date, default: null, index: true },

    // Delivery fields
    deliveryPartnerId: { type: String, default: null, index: true },
    deliveryStatus: {
      type: String,
      enum: ["Pending", "On the Way", "Delivered"],
      default: "Pending",
      index: true,
    },
    deliveryAssignedAt: { type: Date, default: Date.now },
    deliveryOnTheWayAt: { type: Date, default: null },
    deliveryCompletedAt: { type: Date, default: null },
    deliveryNotes: { type: String },
  },
  { timestamps: true }
);

/* =======================
   Model Export
======================= */

const Order =
  models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
