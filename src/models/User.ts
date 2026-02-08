// src/models/User.ts
import mongoose, { Schema, Document, models } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  contact: string;
  password: string;
  shopName: string;
  shopAddress: string;
  gstin: string;
  isVerified: boolean;
  otp?: string;
  otpExpires?: Date;
  otpRequestedAt?: Date; // ✅ Added this field (was missing in your schema)
  role: "admin" | "manager" | "superAdmin";
  adminId?: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected" | "blocked";
  lastSerialNumber?: string; // Store last used serial number (e.g., "020015")
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
    shopName: { type: String, required: true },
    shopAddress: { type: String, required: true },
    gstin: { type: String, required: true, unique: true }, // ✅ Added unique constraint
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    otpRequestedAt: { type: Date }, // ✅ Added this field
    role: { type: String, enum: ["admin", "manager", "superAdmin"], default: "admin" },
    adminId: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "approved", "rejected", "blocked"], default: "approved" },
    lastSerialNumber: { type: String, default: null },
  },
  { timestamps: true }
);

// ✅ Hash password before saving (this prevents double hashing)
UserSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// ✅ Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = models.User || mongoose.model<IUser>("User", UserSchema);

export default User;