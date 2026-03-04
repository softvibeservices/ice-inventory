// src/models/RestockHistory.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IRestockHistory extends Document {
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  items: {
    productId: mongoose.Types.ObjectId;
    quantity: number;
    note: string;
  }[];
}

const RestockHistorySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        note: { type: String, default: "Restocking" },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// ✅ Compound index for RestockHistory
RestockHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.RestockHistory ||
  mongoose.model<IRestockHistory>("RestockHistory", RestockHistorySchema);