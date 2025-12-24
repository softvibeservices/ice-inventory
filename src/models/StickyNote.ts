// src/models/StickyNote.ts

import mongoose, { Schema, Document, models } from "mongoose";

export interface IStickyNoteItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
}

export interface IStickyNote extends Document {
  userId: string;                  // existing (dashboard depends on this)
  customerId?: string;
  customerName: string;
  shopName: string;
  items: IStickyNoteItem[];
  totalQuantity: number;

  // ✅ NEW (OPTIONAL — does NOT break anything)
  deliveryPartnerId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const StickyNoteItemSchema = new Schema<IStickyNoteItem>(
  {
    productId: { type: String },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["piece", "box", "kg", "litre", "gm", "ml"],
    },
  },
  { _id: false }
);

const StickyNoteSchema = new Schema<IStickyNote>(
  {
    userId: { type: String, required: true },

    // ✅ SAFE ADDITION
    deliveryPartnerId: { type: String, index: true },

    customerId: { type: String },
    customerName: { type: String, required: true, trim: true },
    shopName: { type: String, required: true, trim: true },

    items: { type: [StickyNoteItemSchema], default: [] },

    totalQuantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

const StickyNote =
  models.StickyNote ||
  mongoose.model<IStickyNote>("StickyNote", StickyNoteSchema);

export default StickyNote;
