// src/models/DeliveryPartner.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface IDeliveryPartner extends Document {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  status: "pending" | "approved" | "rejected";
  otp?: string | null;
  otpExpires?: Date | null;
  createdByUser?: string | null; // owner/shop user id (string)
  adminEmail?: string | null; // owner's email for notifications
  assignedOrders?: string[]; // list of order _id
  notifiedAt?: Date | null; // when admin was notified of this request
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const DeliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    avatar: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    createdByUser: { type: String, default: null, index: true },
    adminEmail: { type: String, default: null, index: true },
    assignedOrders: { type: [String], default: [] },
    notifiedAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound unique index to avoid duplicate partner emails per shop (but allow same email across shops)
DeliveryPartnerSchema.index(
  { email: 1, createdByUser: 1 },
  { unique: true, partialFilterExpression: { createdByUser: { $type: "string" } } }
);

const DeliveryPartner = (models.DeliveryPartner as mongoose.Model<IDeliveryPartner>) ||
  mongoose.model<IDeliveryPartner>("DeliveryPartner", DeliveryPartnerSchema);
export default DeliveryPartner;
