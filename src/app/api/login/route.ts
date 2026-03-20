// src/app/api/login/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Find user (admin or manager)
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Check verified
    if (!user.isVerified) {
      return NextResponse.json({ error: "User not verified" }, { status: 401 });
    }

    // 3. Check pending
    if (user.isPending) {
      return NextResponse.json(
        { error: "Account setup incomplete" },
        { status: 401 }
      );
    }

    // 4. Check account status (blocked check — previously missing)
    if (user.status === "blocked") {
      return NextResponse.json(
        { error: "Your account has been blocked. Please contact support." },
        { status: 403 }
      );
    }

    // 5. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 6. Resolve userId and managerId
    //    For admin:   userId = user._id,    no managerId
    //    For manager: userId = user.adminId (so all data queries keep working),
    //                 managerId = user._id  (manager's own identity)
    const isManager = user.role === "manager" && user.adminId;
    const resolvedUserId = isManager
      ? user.adminId!.toString()
      : user._id.toString();

    const managerId = isManager ? user._id.toString() : undefined;

    // 7. Verify JWT_SECRET is configured
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[login] JWT_SECRET is not defined");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 8. Sign JWT
    //    Payload mirrors what verifyUserRequest expects to decode
    const tokenPayload: Record<string, string> = {
      userId: resolvedUserId,
      role: user.role,
    };
    if (managerId) {
      tokenPayload.managerId = managerId;
      tokenPayload.adminId = resolvedUserId;
    }

    const token = jwt.sign(tokenPayload, secret, { expiresIn: "7d" });

    // 9. Build user object for frontend storage (unchanged shape)
    const userObj: Record<string, string | null> = {
      _id: resolvedUserId,
      email: user.email,
      name: user.name,
      role: user.role,
      managerId: managerId ?? null,
    };

    return NextResponse.json({
      message: "Login successful",
      user: userObj,
      token,            // ← NEW: JWT for Authorization header
    });

  } catch (error) {
    console.error("[login] error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}