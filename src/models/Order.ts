// src/models/Order.ts
import mongoose, { Schema, Document, models } from "mongoose";

/* =======================
   Interfaces (TypeScript)
======================= */

export interface IOrderItem {
  productId?: mongoose.Types.ObjectId;
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
  userId: mongoose.Types.ObjectId;
  orderId: string;
  serialNumber?: string;
  shopName?: string;

  customerId?: mongoose.Types.ObjectId;
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
  deliveryPartnerId?: mongoose.Types.ObjectId | null;
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

const OrderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String },
    price: { type: Number },
    total: { type: Number },
  },
  { _id: false }
);

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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: String, required: true },
    serialNumber: { type: String },

    shopName: { type: String },

    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
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
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: "DeliveryPartner", default: null, index: true },
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

// ✅ Compound indexes for Order
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ userId: 1, orderDate: -1 });
OrderSchema.index({ deliveryPartnerId: 1, deliveryStatus: 1 });
OrderSchema.index({ userId: 1, customerId: 1 });
OrderSchema.index({ userId: 1, serialNumber: 1 }, { unique: true });


/* =======================
   Model Export
======================= */

const Order = models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;