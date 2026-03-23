// src/app/api/bills/next-serial/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Counter from "@/models/Counter";
import { verifyUserRequest } from "@/lib/userAuth";

export async function GET(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  try {
    const now = new Date();
    const year  = now.getFullYear() % 100;
    const month = now.getMonth() + 1;

    // userId comes from verified token — never from query params
    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    const existing = await Counter.findOne({ userId: userObjectId, year, month });
    const nextSeq  = existing ? existing.sequence + 1 : 1;

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