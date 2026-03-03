// src/models/LocationHistory.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ILocationHistory extends Document {
  partnerId: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
  speed?: number;    // Speed in m/s
  batteryLevel?: number; // Battery percentage
  timestamp: Date;
  createdAt: Date;
}

const LocationHistorySchema = new Schema<ILocationHistory>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      required: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    speed: {
      type: Number,
      default: null,
    },
    batteryLevel: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    // ❌ REMOVED: expireAfterSeconds here does nothing in Mongoose
    // TTL must be set on a field-level index, not schema options
  }
);

// ✅ FIXED: TTL index on createdAt field (correct Mongoose placement)
LocationHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

// ✅ KEPT: Existing compound index
LocationHistorySchema.index({ partnerId: 1, timestamp: -1 });

// ✅ NEW: Compound index for userId + deliveryPartnerId queries
LocationHistorySchema.index({ userId: 1, deliveryPartnerId: 1, createdAt: -1 });

export default mongoose.models.LocationHistory ||
  mongoose.model<ILocationHistory>("LocationHistory", LocationHistorySchema);