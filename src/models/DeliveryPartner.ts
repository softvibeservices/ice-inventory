
// src\models\DeliveryPartner.ts


import mongoose, { Schema, Document } from "mongoose";

export interface IDeliveryPartner extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;

  status: "pending" | "approved" | "rejected";

  otp: string | null;
  otpExpires: Date | null;

  createdByUser: string | null;   // shop owner
  adminId: string | null;         // ✅ NEW FIELD (ADMIN ID)
  adminEmail: string | null;

  notifiedAt: Date | null;
  sessionToken: string | null;

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

    createdByUser: { type: String, default: null },

    adminId: { type: String, default: null },   // ✅ NEW FIELD
    adminEmail: { type: String, default: null },

    notifiedAt: { type: Date, default: null },
    sessionToken: { type: String, default: null },

    lastLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.models.DeliveryPartner ||
  mongoose.model<IDeliveryPartner>("DeliveryPartner", DeliveryPartnerSchema);
