// icecream-inventory/src/models/Product.ts


import { Schema, model, models, Document } from "mongoose";

export interface IProduct extends Document {
  userId: string;             // Reference to User
  name: string;
  
  category?: string;          // e.g., Cups, Family Pack, Cone, Candybar etc.
  unit: "piece" | "box" | "kg" | "litre" | "gm" | "ml";
  packQuantity?: number;      // e.g., 6, 24
  packUnit?: string;          // e.g., "1L", "90ml", "500g"
  purchasePrice: number;      // buy price
  sellingPrice: number;       // sell price
  mrp?: number;               // optional
  quantity: number;           // stock
  minStock?: number;          // low stock threshold
  notes?: string;             // optional notes
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    userId: { type: String, required: true }, // link to user
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    unit: {
      type: String,
      enum: ["piece", "box", "kg", "litre", "gm", "ml"],
      default: "piece",
      required: true,
    },
    packQuantity: { type: Number, min: 0 },
    packUnit: { type: String, trim: true },
    purchasePrice: { type: Number, required: true, min: 0 },
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
