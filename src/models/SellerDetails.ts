// src/models/SellerDetails.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISellerDetails extends Document {
  userId: string; // linked with User
  sellerName: string;
  gstNumber: string;
  fullAddress: string;
  logoUrl?: string; // optional
  logoPublicId?: string;
  qrCodeUrl: string; // compulsory
  qrPublicId?: string;
  signatureUrl: string; // compulsory
  signaturePublicId?: string;
  slogan: string;
}

const SellerDetailsSchema = new Schema<ISellerDetails>(
  {
    userId: { type: String, required: true, unique: true },
    sellerName: { type: String, required: true },
    gstNumber: { type: String, required: true },
    fullAddress: { type: String, required: true },
    logoUrl: { type: String },
    logoPublicId: { type: String },
    qrCodeUrl: { type: String, required: true },
    qrPublicId: { type: String },
    signatureUrl: { type: String, required: true },
    signaturePublicId: { type: String },
    slogan: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.SellerDetails ||
  mongoose.model<ISellerDetails>("SellerDetails", SellerDetailsSchema);
