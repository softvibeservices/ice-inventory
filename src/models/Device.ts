// src/models/Device.ts
import mongoose, { Schema, Document, models } from "mongoose";

export type DeviceStatus = "active" | "banned";

export interface IDevice extends Document {
  userId: mongoose.Types.ObjectId;   // actual _id of the user (admin or manager's own _id)
  deviceId: string;                  // sha256(userId:userAgent) — stable fingerprint
  label: string;                     // e.g. "Chrome on Windows"
  userAgent: string;
  platform: string;
  browser: string;
  ip: string;
  status: DeviceStatus;
  blockedUntil: Date | null;         // reserved for future use
  revokedAt: Date | null;            // ✅ per-device logout: JWT issued before this time is rejected
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceId: { type: String, required: true },
    label: { type: String, default: "Unknown Device" },
    userAgent: { type: String, default: "" },
    platform: { type: String, default: "" },
    browser: { type: String, default: "" },
    ip: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "banned"],
      default: "active",
    },
    blockedUntil: { type: Date, default: null },
    // ✅ NEW: Per-device session revocation timestamp.
    // Any JWT issued (iat) BEFORE this timestamp is considered invalid for this device.
    // This lets us log out a single device without touching User.tokenVersion
    // (which would log out ALL devices).
    revokedAt: { type: Date, default: null },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One device entry per user per fingerprint
DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

const Device = models.Device || mongoose.model<IDevice>("Device", DeviceSchema);
export default Device;