// src/models/ProductSalesLog.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface IProductSalesLogItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  category?: string;
  unit: string;
  quantity: number;
}

export interface IProductSalesLog extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;    // ref to Order
  serialNumber: string;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  shopName: string;
  soldDate: Date;          // = deliveryCompletedAt from Order
  items: IProductSalesLogItem[];
  freeItems: IProductSalesLogItem[];
  orderTotal: number;
  createdAt: Date;
}

const ProductSalesLogItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    category: { type: String },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ProductSalesLogSchema = new Schema<IProductSalesLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    serialNumber: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true },
    shopName: { type: String, required: true },
    soldDate: { type: Date, required: true, index: true },
    items: { type: [ProductSalesLogItemSchema], default: [] },
    freeItems: { type: [ProductSalesLogItemSchema], default: [] },
    orderTotal: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound indexes for fast queries
ProductSalesLogSchema.index({ userId: 1, soldDate: -1 });
ProductSalesLogSchema.index({ userId: 1, "items.productId": 1, soldDate: -1 });
ProductSalesLogSchema.index({ userId: 1, customerId: 1, soldDate: -1 });

export default models.ProductSalesLog ||
  mongoose.model<IProductSalesLog>("ProductSalesLog", ProductSalesLogSchema);