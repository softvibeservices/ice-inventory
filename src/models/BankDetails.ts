import mongoose, { Schema, Document, models } from "mongoose";

export interface IBankDetails extends Document {
  sellerId: mongoose.Types.ObjectId; // Reference to Seller
  bankName: string;
  ifscCode: string;
  branchName: string;
  bankingName: string;
  accountNumber: string;
}

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "SellerDetails", required: true, unique: true },
    bankName: { type: String, required: true },
    ifscCode: { type: String, required: true },
    branchName: { type: String, required: true },
    bankingName: { type: String, required: true },
    accountNumber: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.BankDetails || mongoose.model<IBankDetails>("BankDetails", BankDetailsSchema);
