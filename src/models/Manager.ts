import mongoose, { Schema, Document } from "mongoose";

export interface IManager extends Document {
  adminId: string;
  name: string;
  email: string;
  contact: string;
  password: string;
  createdAt: Date;
  otp?: string | null;
  otpExpires?: Date | null;
  isPending?: boolean;
}

const ManagerSchema = new Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  contact: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  isPending: { type: Boolean, default: false },
});

export default mongoose.models.Manager ||
  mongoose.model<IManager>("Manager", ManagerSchema);