// src/app/api/delivery/search-customers/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";

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

    const customers = await Customer.find({
      userId,
      name: { $regex: query, $options: "i" },
    })
      .limit(10)
      .select("name shopName shopAddress contacts")
      .lean();

    return NextResponse.json({ customers }, { status: 200 });
  } catch (err) {
    console.error("search customers error:", err);
    return NextResponse.json(
      { error: "Failed to fetch customer suggestions" },
      { status: 500 }
    );
  }
}
