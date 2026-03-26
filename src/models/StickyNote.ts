// src/models/StickyNote.ts
// src/models/StickyNote.ts
import mongoose, { Schema, Document, models, Model } from "mongoose";

export interface IStickyNoteItem {
  productId?: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unit?: string;
}

export interface IStickyNote extends Document {
  userId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  shopName: string;
  items: IStickyNoteItem[];
  totalQuantity: number;
  deliveryPartnerId?: mongoose.Types.ObjectId;
  // ✅ NEW: Creator info for color-coded display
  creatorName?: string;
  creatorRole?: "admin" | "manager" | "delivery";
  createdAt?: Date;
  updatedAt?: Date;
}

const StickyNoteItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true },
  },
  { _id: false }
);

const StickyNoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deliveryPartnerId: { type: Schema.Types.ObjectId, ref: "DeliveryPartner", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true, trim: true },
    shopName: { type: String, required: true, trim: true },
    items: { type: [StickyNoteItemSchema], default: [] },
    totalQuantity: { type: Number, required: true, min: 0, default: 0 },
    // ✅ NEW: Who created this note and in what role
    creatorName: { type: String, trim: true, default: "" },
    creatorRole: {
      type: String,
      enum: ["admin", "manager", "delivery"],
      default: "admin",
    },
  },
  { timestamps: true }
);

const StickyNote: Model<IStickyNote> =
  (models.StickyNote as Model<IStickyNote>) ||
  mongoose.model<IStickyNote>("StickyNote", StickyNoteSchema);

// ✅ Compound index for StickyNote
StickyNoteSchema.index({ userId: 1, deliveryPartnerId: 1 });

export default StickyNote;