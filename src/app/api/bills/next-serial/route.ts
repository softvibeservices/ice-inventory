// ✨ NEW FILE: src/app/api/bills/next-serial/route.ts
// Returns a PREVIEW of the next serial number without consuming a slot.
// The billing page calls this on mount so it can display the upcoming serial.
// The actual serial is assigned atomically inside POST /api/bills.

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Counter from "@/models/Counter";

export async function GET(req: Request) {
  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const now = new Date();
    const year = now.getFullYear() % 100;
    const month = now.getMonth() + 1;

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ✅ Read-only peek: find current counter doc without incrementing
    const existing = await Counter.findOne({ userId: userObjectId, year, month });
    const nextSeq = existing ? existing.sequence + 1 : 1;

    const nextSerial =
      year.toString().padStart(2, "0") +
      month.toString().padStart(2, "0") +
      nextSeq.toString().padStart(4, "0");

    return NextResponse.json({ nextSerial }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/bills/next-serial error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch next serial" },
      { status: 500 }
    );
  }
}