// src/models/SearchHistory.ts
import mongoose, { Schema } from "mongoose";

const SearchHistorySchema = new Schema(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: "DeliveryPartner", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

// ✅ Compound index for efficient partner history queries
SearchHistorySchema.index({ partnerId: 1, createdAt: -1 });

export default mongoose.models.SearchHistory ||
  mongoose.model("SearchHistory", SearchHistorySchema);