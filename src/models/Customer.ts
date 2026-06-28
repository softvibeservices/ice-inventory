// src/models/Customer.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  contacts: string[]; // multiple contact numbers
  shopName: string;
  shopAddress?: string;  // now optional
  area?: string;         // now optional
  location?: {
    latitude?: number;
    longitude?: number;
  };
  credit: number;
  debit: number;
  totalSales: number;
  remarks?: string;
  userId: mongoose.Types.ObjectId; // ✅ To link customer with the logged-in admin/shop
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
    shopAddress: { type: String, default: "" },   // optional — no required: true
    area: { type: String, default: "" },           // optional — no required: true
    location: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    credit: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    remarks: { type: String, default: "" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

// ✅ Compound indexes for Customer
CustomerSchema.index({ userId: 1, shopName: 1 });
CustomerSchema.index({ userId: 1, area: 1 });
CustomerSchema.index({ userId: 1, 'contacts.0': 1 });
CustomerSchema.index({ userId: 1, totalSales: -1 });

export default models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);