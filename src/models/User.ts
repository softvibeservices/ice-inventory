// src/models/User.ts
import mongoose, { Schema, Document, models } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  contact: string;
  password: string;
  shopName?: string;
  shopAddress?: string;
  gstin?: string;
  isVerified: boolean;
  otp?: string | null;
  otpExpires?: Date | null;
  otpRequestedAt?: Date | null;
  role: "admin" | "manager" | "superAdmin";
  adminId?: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected" | "blocked";
  isPending?: boolean;
  /** Incremented on password reset to force-logout all existing sessions */
  tokenVersion: number;
  /** Counts consecutive wrong-password attempts; reset to 0 on success */
  failedAttempts: number;
  /** Set to now + 2 h when failedAttempts reaches the cap; null otherwise */
  blockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name:        { type: String, required: true },
    email:       { type: String, required: true, unique: true, lowercase: true },
    contact:     { type: String, required: true },
    password:    { type: String, required: true },
    shopName:    { type: String },
    shopAddress: { type: String },
    gstin:       { type: String },
    isVerified:  { type: Boolean, default: false },
    otp:             { type: String,  default: null },
    otpExpires:      { type: Date,    default: null },
    otpRequestedAt:  { type: Date,    default: null },
    role: {
      type: String,
      enum: ["admin", "manager", "superAdmin"],
      default: "admin",
    },
    adminId: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "blocked"],
      default: "approved",
    },
    isPending: { type: Boolean, default: false },

    // ── Session invalidation ──────────────────────────────────────────────
    // Increment this whenever a password is reset; all JWTs carrying an older
    // tokenVersion are rejected by the auth middleware automatically.
    tokenVersion: { type: Number, default: 0 },

    // ── Login lockout ─────────────────────────────────────────────────────
    // Incremented on each wrong password; reset to 0 on successful login.
    // When it reaches MAX_FAILED_ATTEMPTS the account is temporarily blocked.
    failedAttempts: { type: Number, default: 0 },

    // Null  → no active temporary block (or permanent admin block with no expiry)
    // Date  → locked until this timestamp; auto-cleared on first login after expiry
    blockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

// Sparse unique index — allows multiple documents with gstin: null/undefined
UserSchema.index({ gstin: 1 }, { unique: true, sparse: true });

// ── Hash password before saving ───────────────────────────────────────────────
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt   = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: unknown) {
    next(err as Error);
  }
});

// ── Instance method ───────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = models.User || mongoose.model<IUser>("User", UserSchema);

export default User;