import mongoose, { Schema } from "mongoose";

const SearchHistorySchema = new Schema(
  {
    partnerId: { type: String, required: true },
    customerId: { type: String, required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.SearchHistory ||
  mongoose.model("SearchHistory", SearchHistorySchema);
