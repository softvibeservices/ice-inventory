import mongoose, { Schema, Document } from "mongoose";

export interface IDeliveryPartner extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;                 // NEW FIELD
  status: "pending" | "approved" | "rejected";
  otp: string | null;
  otpExpires: Date | null;
  createdByUser: string | null;
  adminEmail: string | null;
  notifiedAt: Date | null;

  // For real-time tracking (will be used in later steps)
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

    // NEW PASSWORD FIELD
    password: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    createdByUser: { type: String, default: null },
    adminEmail: { type: String, default: null },

    notifiedAt: { type: Date, default: null },

    // FOR FUTURE REAL-TIME LOCATION
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
