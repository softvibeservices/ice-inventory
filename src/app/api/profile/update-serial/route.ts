// src/app/api/profile/update-serial/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function PUT(req: Request) {
  await connectDB();

  try {
    const body = await req.json();
    const { userId, serialNumber } = body;

    // Validate inputs
    if (!userId || !serialNumber) {
      return NextResponse.json(
        { error: "userId and serialNumber are required" },
        { status: 400 }
      );
    }

    // Validate serial number format (must be 6 digits)
    if (!/^\d{6}$/.test(serialNumber)) {
      return NextResponse.json(
        { error: "Serial number must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Extract the last 4 digits
    const lastFourDigits = serialNumber.substring(2);
    const serialValue = parseInt(lastFourDigits, 10);

    // Validate range (0001 to 9999)
    if (serialValue < 1 || serialValue > 9999) {
      return NextResponse.json(
        { error: "Last 4 digits must be between 0001 and 9999" },
        { status: 400 }
      );
    }

    // Find user and update serial number
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update the user's lastSerialNumber field
    user.lastSerialNumber = serialNumber;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Serial number updated successfully",
      serialNumber: serialNumber,
    });
  } catch (err: any) {
    console.error("PUT /api/profile/update-serial error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update serial number" },
      { status: 500 }
    );
  }
}