// icecream-inventory\src\models\User.ts

// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  contact?: string;
  shopName: string;
  shopAddress: string;
  gstin: string;   // ✅ added GSTIN
  password: string;
  otp: string | null;
  otpExpires: Date | null;
  isVerified: boolean;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  contact: { type: String },
  shopName: { type: String, required: true },
  shopAddress: { type: String, required: true },
  gstin: { type: String, required: true, unique: true },  // ✅ required GSTIN
  password: { type: String, required: true },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
});

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
