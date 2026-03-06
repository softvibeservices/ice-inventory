// ✨ NEW FILE: src/models/Counter.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface ICounter extends Document {
  userId: mongoose.Types.ObjectId;
  year: number;
  month: number;
  sequence: number;
}

const CounterSchema = new Schema<ICounter>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  sequence: { type: Number, default: 0 },
});

// ✅ Unique compound index: one counter doc per user per year/month
CounterSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export default models.Counter || mongoose.model<ICounter>("Counter", CounterSchema);
