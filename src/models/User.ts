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
  otp?: string;
  otpExpires?: Date;
  otpRequestedAt?: Date;
  role: "admin" | "manager" | "superAdmin";
  adminId?: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected" | "blocked";
  lastSerialNumber?: string;
  isPending?: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    contact: { type: String, required: true },
    password: { type: String, required: true },
    shopName: { type: String },
    shopAddress: { type: String },
    gstin: { type: String }, // Removed sparse from here
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    otpRequestedAt: { type: Date },
    role: { type: String, enum: ["admin", "manager", "superAdmin"], default: "admin" },
    adminId: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "approved", "rejected", "blocked"], default: "approved" },
    lastSerialNumber: { type: String, default: null },
    isPending: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ CREATE SPARSE UNIQUE INDEX (allows multiple nulls)
UserSchema.index({ gstin: 1 }, { unique: true, sparse: true });

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = models.User || mongoose.model<IUser>("User", UserSchema);

export default User;