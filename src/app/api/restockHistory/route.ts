// icecream-inventory\src\app\api\restockHistory\route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import RestockHistory from "@/models/RestockHistory";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const history = await RestockHistory.create({
      userId: body.userId,
      items: body.items,
    });

    return NextResponse.json(history, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId)
      return NextResponse.json({ error: "userId required" }, { status: 400 });

    const history = await RestockHistory.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json(history, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
