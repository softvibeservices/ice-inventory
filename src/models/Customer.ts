// src/models/Customer.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  contacts: string[]; // multiple contact numbers
  shopName: string;
  shopAddress: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  credit: number;
  debit: number;
  totalSales: number;
  remarks?: string;
  userId: string; // ✅ To link customer with the logged-in admin/shop
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    contacts: {
      type: [String],
      validate: {
        validator: (arr: string[]) => arr.length > 0,
        message: "At least one contact number is required",
      },
    },
    shopName: { type: String, required: true },
    shopAddress: { type: String, required: true },
    location: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    credit: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    userId: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.Customer ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);
