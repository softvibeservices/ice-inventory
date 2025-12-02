// icecream-inventory\src\models\RestockHistory.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IRestockHistory extends Document {
  userId: string;
  createdAt: Date;
  items: {
    productId: string;
    name: string;
    category?: string;
    unit: string;
    quantity: number; 
    note: string;
  }[];
}

const RestockHistorySchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    items: [
      {
        productId: { type: String, required: true },
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
