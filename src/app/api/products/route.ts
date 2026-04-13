// src/app/api/products/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";
import { verifyUserRequest } from "@/lib/userAuth";
import { checkProductLimit } from "@/lib/subscriptionGuard";

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { name, unit, sellingPrice, quantity } = body;

    if (!name || unit === undefined || sellingPrice === undefined || quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    // ─── PHASE 3: Product limit guard ─────────────────────────────────────────
    // Count existing products for this user, then check against plan limit.
    const currentCount = await Product.countDocuments({
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    const productCheck = await checkProductLimit(auth.userId, currentCount);
    if (!productCheck.allowed) {
      return NextResponse.json(
        {
          error:
            productCheck.limit === 0
              ? "Your subscription has expired. Please renew your plan to add products."
              : `You have reached your product limit (${productCheck.used}/${productCheck.limit}). Upgrade your plan to add more products.`,
          upgradeRequired: true,
          used: productCheck.used,
          limit: productCheck.limit,
        },
        { status: 403 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    const newProduct = await Product.create({
      userId: new mongoose.Types.ObjectId(auth.userId),
      name,
      unit,
      sellingPrice,
      quantity,
      category: body.category,
      packQuantity: body.packQuantity,
      packUnit: body.packUnit,
      mrp: body.mrp,
      minStock: body.minStock,
      notes: body.notes,
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add product" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const products = await Product.find({
      userId: new mongoose.Types.ObjectId(auth.userId),
    }).sort({ createdAt: -1 });

    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    // Remove userId from updates — never let client override it
    delete updates.userId;

    await connectDB();

    const updated = await Product.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(auth.userId) },
      updates,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Product not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    await connectDB();

    const deleted = await Product.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(auth.userId),
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Product not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}