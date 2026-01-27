// src/models/SellerDetails.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISellerDetails extends Document {
  userId: string; // linked with User
  sellerName: string;
  contact: string; // contact number
  gstNumber: string;
  fullAddress: string;
  logoUrl?: string; // optional
  logoPublicId?: string;
  qrCodeUrl: string; // compulsory
  qrPublicId?: string;
  signatureUrl: string; // compulsory
  signaturePublicId?: string;
  slogan: string;
  compositionLine?: string; // ✅ NEW: User-configurable composition line
}

const SellerDetailsSchema = new Schema<ISellerDetails>(
  {
    userId: { type: String, required: true, unique: true },
    sellerName: { type: String, required: true },
    contact: { type: String, required: true },
    gstNumber: { type: String, required: true },
    fullAddress: { type: String, required: true },
    logoUrl: { type: String },
    logoPublicId: { type: String },
    qrCodeUrl: { type: String, required: true },
    qrPublicId: { type: String },
    signatureUrl: { type: String, required: true },
    signaturePublicId: { type: String },
    slogan: { type: String, required: true },
    compositionLine: { 
      type: String, 
      default: "composition taxable person not eligible to collect taxes on supplies" // ✅ Default value
    },
  },
  { timestamps: true }
);

export default mongoose.models.SellerDetails ||
  mongoose.model<ISellerDetails>("SellerDetails", SellerDetailsSchema);