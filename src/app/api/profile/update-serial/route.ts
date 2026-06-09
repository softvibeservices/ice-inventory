// src/app/api/profile/update-serial/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Counter from "@/models/Counter";
import Bill from "@/models/Bill";
import Order from "@/models/Order";
import { verifyUserRequest } from "@/lib/userAuth";
import mongoose from "mongoose";

export async function PUT(req: Request) {
  // 1. Verify JWT
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  // 2. Only admins can update serial numbers
  if (auth.role === "manager") {
    return NextResponse.json(
      { error: "Access denied: Managers cannot update serial numbers" },
      { status: 403 }
    );
  }

  await connectDB();

  try {
    const body = await req.json();
    const { serialNumber } = body;

    if (!serialNumber) {
      return NextResponse.json(
        { error: "serialNumber is required" },
        { status: 400 }
      );
    }

    // 3. Validate: must be exactly 8 digits (YYMMXXXX)
    if (!/^\d{8}$/.test(serialNumber)) {
      return NextResponse.json(
        { error: "Serial number must be exactly 8 digits (YYMMXXXX)" },
        { status: 400 }
      );
    }

    const year  = parseInt(serialNumber.substring(0, 2), 10);
    const month = parseInt(serialNumber.substring(2, 4), 10);
    const seq   = parseInt(serialNumber.substring(4),    10);

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Month digits must be between 01 and 12" },
        { status: 400 }
      );
    }

    if (seq < 1 || seq > 9999) {
      return NextResponse.json(
        { error: "Last 4 digits must be between 0001 and 9999" },
        { status: 400 }
      );
    }

    // 4. Use auth.userId — never trust userId from body
    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    // 5. ─── DUPLICATE CHECK ──────────────────────────────────────────────────
    //    The user wants to set the counter to `serialNumber`, meaning the NEXT
    //    bill will get `serialNumber + 1`.  However, we must also block setting
    //    the counter to `serialNumber` itself if that exact serial already
    //    exists in a Bill or Order — because the counter value IS the last-used
    //    serial (the next bill will be seq+1), so if `serialNumber` is already
    //    taken the counter would wrongly imply it is free.
    //
    //    More critically: when seq is set to N, the NEXT bill becomes N+1.
    //    But we must prevent the user from setting seq to N where N itself
    //    already exists as a bill serial (they'd be re-using a taken number as
    //    the "current" pointer, which corrupts the sequence display).
    //
    //    Rule applied here:
    //      - If `serialNumber` (the value the user typed) already exists in
    //        Bill.serialNumber or Order.serialNumber for this user → BLOCK.
    //    ─────────────────────────────────────────────────────────────────────

    const [billExists, orderExists] = await Promise.all([
      Bill.exists({ userId: userObjectId, serialNumber }),
      Order.exists({ userId: userObjectId, serialNumber }),
    ]);

    if (billExists || orderExists) {
      const source = billExists ? "a settled/unsettled bill" : "an order (settled, unsettled, or debt)";
      return NextResponse.json(
        {
          error: `Serial number ${serialNumber} already exists in ${source}. Please choose a different serial number.`,
          conflictingSerial: serialNumber,
          conflict: true,
        },
        { status: 409 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────

    await Counter.findOneAndUpdate(
      { userId: userObjectId, year, month },
      { $set: { sequence: seq } },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Serial number updated successfully",
      serialNumber,
    });

  } catch (err: any) {
    console.error("PUT /api/profile/update-serial error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update serial number" },
      { status: 500 }
    );
  }
}