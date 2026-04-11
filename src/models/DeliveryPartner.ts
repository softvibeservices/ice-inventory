// src/models/DeliveryPartner.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IDeliveryPartner extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;

  status: "pending" | "approved" | "rejected";

  otp: string | null;
  otpExpires: Date | null;

  createdByUser: mongoose.Types.ObjectId | null;   // shop owner
  adminId: mongoose.Types.ObjectId | null;          // ✅ ADMIN ID
  adminEmail: string | null;

  notifiedAt: Date | null;
  sessionToken: string | null;
  fcmToken: string | null;    // ← ADD THIS LINE

  lastLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
}

const DeliveryPartnerSchema = new Schema<IDeliveryPartner>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    password: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    createdByUser: { type: Schema.Types.ObjectId, ref: "User", default: null },

    adminId: { type: Schema.Types.ObjectId, ref: "User", default: null }, // ✅ ADMIN ID
    adminEmail: { type: String, default: null },

    notifiedAt: { type: Date, default: null },
    sessionToken: { type: String, default: null },
    fcmToken: { type: String, default: null },

    lastLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

// ✅ Compound indexes for DeliveryPartner
DeliveryPartnerSchema.index({ adminId: 1, isActive: 1 });
DeliveryPartnerSchema.index({ createdByUser: 1, isActive: 1 });

export default mongoose.models.DeliveryPartner ||
  mongoose.model<IDeliveryPartner>("DeliveryPartner", DeliveryPartnerSchema);