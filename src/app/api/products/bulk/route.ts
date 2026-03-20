// src/app/api/products/bulk/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import { verifyUserRequest } from "@/lib/userAuth";

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { products } = body;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "Products array is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const validatedProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      if (!product.name || !product.name.trim()) {
        errors.push({ index: i, field: "name", message: "Product name required" });
        continue;
      }
      if (!product.unit) {
        errors.push({ index: i, field: "unit", message: "Unit required" });
        continue;
      }
      if (
        product.sellingPrice === undefined ||
        product.sellingPrice === null ||
        product.sellingPrice <= 0
      ) {
        errors.push({ index: i, field: "sellingPrice", message: "Valid selling price required" });
        continue;
      }
      if (
        product.quantity === undefined ||
        product.quantity === null ||
        product.quantity < 0
      ) {
        errors.push({ index: i, field: "quantity", message: "Valid quantity required" });
        continue;
      }

      validatedProducts.push({
        // Always use auth.userId — never trust userId from the payload
        userId: new mongoose.Types.ObjectId(auth.userId),
        name: product.name.trim(),
        category: product.category?.trim() || undefined,
        unit: product.unit,
        packQuantity: product.packQuantity || undefined,
        packUnit: product.packUnit || undefined,
        sellingPrice: Number(product.sellingPrice),
        mrp: product.mrp ? Number(product.mrp) : undefined,
        quantity: Number(product.quantity),
        minStock: product.minStock ? Number(product.minStock) : undefined,
        notes: product.notes?.trim() || undefined,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors,
          validCount: validatedProducts.length,
          errorCount: errors.length,
        },
        { status: 400 }
      );
    }

    const result = await Product.insertMany(validatedProducts, { ordered: false });

    return NextResponse.json(
      { success: true, inserted: result.length, products: result },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Bulk product insert error:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Duplicate products found", details: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to insert products", details: error.message },
      { status: 500 }
    );
  }
}