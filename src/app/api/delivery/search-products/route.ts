// src/app/api/delivery/search-products/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Product from "@/models/Product";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get("userId");
    const query = searchParams.get("q")?.toLowerCase() || "";

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    await connectDB();

    const products = await Product.find({
      userId,
      name: { $regex: query, $options: "i" },
    })
      .limit(10)
      .select("name price category")
      .lean();

    return NextResponse.json({ products }, { status: 200 });
  } catch (err) {
    console.error("search products error:", err);
    return NextResponse.json(
      { error: "Failed to fetch product suggestions" },
      { status: 500 }
    );
  }
}
