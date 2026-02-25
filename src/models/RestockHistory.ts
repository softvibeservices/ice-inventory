// src/models/RestockHistory.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IRestockHistory extends Document {
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  items: {
    productId: mongoose.Types.ObjectId;
    name: string;
    category?: string;
    unit: string;
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
        name: { type: String, required: true },
        category: { type: String },
        unit: { type: String, required: true },
        quantity: { type: Number, required: true },
        note: { type: String, default: "Restocking" },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.RestockHistory ||
  mongoose.model<IRestockHistory>("RestockHistory", RestockHistorySchema);