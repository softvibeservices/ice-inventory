// src/models/Bill.ts
import mongoose, { Schema, Document, models } from "mongoose";

/* =======================
   Sub-document interfaces
======================= */

export interface IBillLineItem {
  productId?: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  free: boolean;
}

export interface IBillCustomer {
  customerId?: mongoose.Types.ObjectId;
  name: string;
  shopName: string;
  address: string;
  contact: string;
}

/* =======================
   Main Bill interface
======================= */

export interface IBill extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: string; 
  serialNumber: string;
  billDate: string;
  billingCustomer: IBillCustomer;
  shippingCustomer: IBillCustomer;
  sameAsBilling: boolean;
  items: IBillLineItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  grandTotal: number;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}

/* =======================
   Sub-schemas
======================= */

const BillLineItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    free: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const BillCustomerSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    name: { type: String, required: true },
    shopName: { type: String, required: true },
    address: { type: String, required: true },
    contact: { type: String, default: "" },
  },
  { _id: false }
);

/* =======================
   Main Bill schema
======================= */

const BillSchema = new Schema<IBill>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    serialNumber: { type: String, required: true, index: true },
    billDate: { type: String, required: true },
    billingCustomer: { type: BillCustomerSchema, required: true },
    shippingCustomer: { type: BillCustomerSchema, required: true },
    sameAsBilling: { type: Boolean, default: false },
    items: {
      type: [BillLineItemSchema],
      required: true,
      validate: {
        validator: (arr: IBillLineItem[]) => arr.length > 0,
        message: "At least one line item is required",
      },
    },
    subtotal: { type: Number, required: true, default: 0 },
    discountPercentage: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

/* =======================
   Model export
======================= */

const Bill = models.Bill || mongoose.model<IBill>("Bill", BillSchema);

export default Bill;