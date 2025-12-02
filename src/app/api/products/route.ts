
// icecream-inventory\src\app\api\products\route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

// CREATE PRODUCT
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, name, unit, purchasePrice, sellingPrice, quantity } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }
    if (!name || !unit || purchasePrice === undefined || sellingPrice === undefined || quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const newProduct = await Product.create(body);
    return NextResponse.json(newProduct, { status: 201 });
  } catch  {
    return NextResponse.json({ error: "Failed to add product" }, { status: 500 });
  }
}

// GET PRODUCTS BY USER
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    await connectDB();
    const products = await Product.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(products);
  } catch  {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// UPDATE PRODUCT
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, userId, ...updates } = body;

    if (!id || !userId) {
      return NextResponse.json({ error: "Product ID and User ID required" }, { status: 400 });
    }

    await connectDB();
    const updated = await Product.findOneAndUpdate({ _id: id, userId }, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Product not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch  {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE PRODUCT
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id, userId } = body;

    if (!id || !userId) {
      return NextResponse.json({ error: "Product ID and User ID required" }, { status: 400 });
    }

    await connectDB();
    const deleted = await Product.findOneAndDelete({ _id: id, userId });

    if (!deleted) {
      return NextResponse.json({ error: "Product not found or not authorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch  {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
