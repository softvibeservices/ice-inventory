// src/lib/userAuth.ts

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface AuthPayload {
  userId: string;       // For admin: own _id. For manager: adminId (so all data queries work unchanged)
  role: "admin" | "manager" | "superAdmin";
  managerId?: string;   // Only present for managers — their actual User._id
  adminId?: string;     // Only present for managers — same as userId, kept for clarity
}

interface JwtDecoded {
  userId: string;
  role: "admin" | "manager" | "superAdmin";
  managerId?: string;
  adminId?: string;
  iat: number;
  exp: number;
}

// ─────────────────────────────────────────────
//  Main verifier — call this at the top of
//  every protected API route handler
// ─────────────────────────────────────────────

export async function verifyUserRequest(
  req: Request
): Promise<AuthPayload | NextResponse> {
  try {
    // 1. Extract Bearer token from Authorization header
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization token missing" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Authorization token missing" },
        { status: 401 }
      );
    }

    // 2. Verify JWT signature + expiry
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[userAuth] JWT_SECRET is not defined in environment");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let decoded: JwtDecoded;
    try {
      decoded = jwt.verify(token, secret) as JwtDecoded;
    } catch (err: any) {
      // Distinguish expired vs tampered
      if (err?.name === "TokenExpiredError") {
        return NextResponse.json(
          { error: "Session expired. Please login again." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Invalid token. Please login again." },
        { status: 401 }
      );
    }

    // 3. Confirm the user still exists in DB and is in good standing
    //    This also catches: deleted accounts, blocked accounts, pending accounts
    await connectDB();

    const user = await User.findById(decoded.userId).select(
      "_id role adminId status isPending isVerified"
    );

    if (!user) {
      return NextResponse.json(
        { error: "Account not found. Please login again." },
        { status: 401 }
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { error: "Account not verified." },
        { status: 401 }
      );
    }

    if (user.isPending) {
      return NextResponse.json(
        { error: "Account setup is incomplete." },
        { status: 401 }
      );
    }

    if (user.status === "blocked") {
      return NextResponse.json(
        { error: "Your account has been blocked. Please contact support." },
        { status: 403 }
      );
    }

    // 4. For managers: verify the admin they belong to still exists
    //    and is not blocked/deleted
    if (user.role === "manager") {
      if (!user.adminId) {
        return NextResponse.json(
          { error: "Manager account is misconfigured. Please contact support." },
          { status: 403 }
        );
      }

      const admin = await User.findById(user.adminId).select(
        "_id status isVerified"
      );

      if (!admin) {
        return NextResponse.json(
          { error: "Associated admin account not found." },
          { status: 403 }
        );
      }

      if (admin.status === "blocked") {
        return NextResponse.json(
          { error: "The associated admin account has been blocked." },
          { status: 403 }
        );
      }
    }

    // 5. Build and return the verified auth payload
    //    userId is always the adminId (the owner of all data)
    //    This keeps every existing DB query working without any change —
    //    they all filter by userId which is the admin's _id
    const payload: AuthPayload = {
      userId: decoded.userId,             // admin's _id for both admin and manager
      role: user.role as AuthPayload["role"],
      ...(user.role === "manager" && {
        managerId: user._id.toString(),   // manager's actual User._id
        adminId: decoded.userId,          // same as userId, kept for clarity
      }),
    };

    return payload;

  } catch (err) {
    console.error("[verifyUserRequest] Unexpected error:", err);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}