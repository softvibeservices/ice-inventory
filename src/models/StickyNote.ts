// src/models/StickyNote.ts

import mongoose, { Schema, Document, models, Model } from "mongoose";

export interface IStickyNoteItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: string;
}

export interface IStickyNote extends Document {
  userId: string;
  customerId?: string;
  customerName: string;
  shopName: string;
  items: IStickyNoteItem[];
  totalQuantity: number;
  deliveryPartnerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const StickyNoteItemSchema = new Schema(
  {
    productId: { type: String },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true },
  },
  { _id: false }
);

const StickyNoteSchema = new Schema(
  {
    userId: { type: String, required: true },
    deliveryPartnerId: { type: String, index: true },
    customerId: { type: String },
    customerName: { type: String, required: true, trim: true },
    shopName: { type: String, required: true, trim: true },
    items: { type: [StickyNoteItemSchema], default: [] },
    totalQuantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

const StickyNote: Model<IStickyNote> =
  (models.StickyNote as Model<IStickyNote>) ||
  mongoose.model<IStickyNote>("StickyNote", StickyNoteSchema);

export default StickyNote;