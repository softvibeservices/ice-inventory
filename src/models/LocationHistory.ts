// src/models/LocationHistory.ts

import mongoose, { Schema, Document } from "mongoose";

export interface ILocationHistory extends Document {
  partnerId: string;
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
  speed?: number; // Speed in m/s
  batteryLevel?: number; // Battery percentage
  timestamp: Date;
  createdAt: Date;
}

const LocationHistorySchema = new Schema<ILocationHistory>(
  {
    partnerId: { 
      type: String, 
      required: true, 
      index: true // ✅ Index for faster queries
    },
    latitude: { 
      type: Number, 
      required: true 
    },
    longitude: { 
      type: Number, 
      required: true 
    },
    accuracy: { 
      type: Number, 
      default: null 
    },
    speed: { 
      type: Number, 
      default: null 
    },
    batteryLevel: { 
      type: Number, 
      default: null 
    },
    timestamp: { 
      type: Date, 
      required: true,
      index: true // ✅ Index for time-based queries
    },
  },
  { 
    timestamps: true,
    // ✅ Auto-delete old location data after 7 days
    expireAfterSeconds: 7 * 24 * 60 * 60 // 7 days in seconds
  }
);

// ✅ Compound index for efficient queries (partnerId + timestamp)
LocationHistorySchema.index({ partnerId: 1, timestamp: -1 });

export default mongoose.models.LocationHistory ||
  mongoose.model<ILocationHistory>("LocationHistory", LocationHistorySchema);