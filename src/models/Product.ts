// icecream-inventory/src/models/Product.ts

import { Schema, model, models, Document } from "mongoose";

export interface IProduct extends Document {
  userId: string;
  name: string;
  category?: string;
  unit: string;
  packQuantity?: number;
  packUnit?: string;
  sellingPrice: number;
  mrp?: number;
  quantity: number;
  minStock?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    packQuantity: { type: Number, min: 0 },
    packUnit: { type: String, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    minStock: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const Product = models.Product || model<IProduct>("Product", ProductSchema);

export default Product;