// src/app/api/products/empty/route.ts
// Empties all product quantities to 0.
// Requires a valid OTP (sent via POST /api/products/empty-otp) in the
// request body to prevent accidental or unauthorized resets.

import { NextResponse } from "next/server";
import mongoose          from "mongoose";
import { connectDB }     from "@/lib/mongodb";
import Product           from "@/models/Product";
import RestockHistory    from "@/models/RestockHistory";
import User              from "@/models/User";
import { verifyUserRequest } from "@/lib/userAuth";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    },
  });
}

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // ── 1. Parse & validate OTP from request body ──────────────────────────
    let body: { otp?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { otp } = body;
    if (!otp || typeof otp !== "string" || otp.trim().length === 0) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(auth.userId);

    // ── 2. Verify OTP ──────────────────────────────────────────────────────
    const user = await User.findById(userObjectId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.otp || user.otp !== otp.trim()) {
      return NextResponse.json({ error: "Invalid OTP. Please check your email." }, { status: 400 });
    }

    if (!user.otpExpires || new Date() > user.otpExpires) {
      // Clear expired OTP
      user.otp        = null;
      user.otpExpires = null;
      await user.save();
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    // ── 3. OTP is valid — clear it immediately (one-time use) ──────────────
    user.otp        = null;
    user.otpExpires = null;
    await user.save();

    // ── 4. Empty stock ─────────────────────────────────────────────────────
    const products = await Product.find({ userId: userObjectId }).lean();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { message: "No products found for user", emptied: false },
        { status: 200 }
      );
    }

    const historyItems = products.map((p: any) => ({
      productId: p._id,
      quantity:  p.quantity ?? 0,
      note:      "Empty Stock",
    }));

    await Product.updateMany(
      { userId: userObjectId },
      { $set: { quantity: 0 } }
    );

    // ── 5. Save history record ─────────────────────────────────────────────
    try {
      await RestockHistory.create({
        userId: userObjectId,
        items:  historyItems,
      });
    } catch (historyErr) {
      return NextResponse.json(
        {
          message:      "All product quantities set to 0, but failed to record history",
          emptied:      true,
          historyError: historyErr instanceof Error ? historyErr.message : String(historyErr),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "All product quantities set to 0", emptied: true },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST to empty products" },
    { status: 405 }
  );
}