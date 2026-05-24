// src/app/api/auth/check-email/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/check-email
//
//  Checks if an email address is registered in the system.
//  Used by PricingSection.tsx to determine whether to redirect to /login or /register.
//
//  Request body:
//    { email: string }
//
//  Response:
//    { exists: boolean }
//
//  This is a public endpoint (no auth required) because it's called before login.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Check if user exists
    const user = await User.findOne({ email: trimmedEmail }).select("_id");
    
    return NextResponse.json({
      exists: !!user,
    });
  } catch (error) {
    console.error("Error in check-email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}