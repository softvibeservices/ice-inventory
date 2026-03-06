// ✅ UPDATED FILE: src/app/api/profile/update-serial/route.ts
// REPURPOSED: Instead of writing to User.lastSerialNumber (removed),
// this now writes directly to the Counter collection so admins can
// manually override the current sequence from the profile page.
//
// The SerialNumberComponent.tsx UI is unchanged — it still sends
// { userId, serialNumber } where serialNumber is a 6-digit string YYMMXXXX.
// We parse out YY, MM, XXXX and upsert the Counter doc accordingly.

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Counter from "@/models/Counter";

export async function PUT(req: Request) {
  await connectDB();

  try {
    const body = await req.json();
    const { userId, serialNumber } = body;

    if (!userId || !serialNumber) {
      return NextResponse.json(
        { error: "userId and serialNumber are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // Validate: must be exactly 8 digits (YYMMXXXX)
    if (!/^\d{8}$/.test(serialNumber)) {
      return NextResponse.json(
        { error: "Serial number must be exactly 8 digits (YYMMXXXX)" },
        { status: 400 }
      );
    }

    const year = parseInt(serialNumber.substring(0, 2), 10);   // YY
    const month = parseInt(serialNumber.substring(2, 4), 10);  // MM
    const seq = parseInt(serialNumber.substring(4), 10);        // XXXX

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

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ✅ Upsert Counter so the NEXT bill after this override gets seq+1
    // We store the value the admin typed as the CURRENT sequence,
    // so getNextSerialNumber() will return seq+1 on the next bill.
    // If admin types 0010, next bill = 0011. This matches old behaviour.
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