// src/lib/userAuth.ts

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Device from "@/models/Device";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface AuthPayload {
  userId: string;       // For admin: own _id. For manager: adminId (so all data queries work unchanged)
  role: "admin" | "manager" | "superAdmin";
  managerId?: string;   // Only present for managers — their actual User._id
  adminId?: string;     // Only present for managers — same as userId, kept for clarity
  deviceId?: string;    // ✅ NEW: fingerprint of the device
}

interface JwtDecoded {
  userId: string;
  role: "admin" | "manager" | "superAdmin";
  managerId?: string;
  adminId?: string;
  deviceId?: string;    // ✅ NEW
  tokenVersion?: number; // ✅ NEW
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

    // 3. Determine the ACTUAL user (_id) this token belongs to.
    //    - For admin:   decoded.userId = admin._id   → actualUserId = decoded.userId
    //    - For manager: decoded.userId = adminId     → actualUserId = decoded.managerId
    const isManagerToken = decoded.role === "manager" && !!decoded.managerId;
    const actualUserId = isManagerToken ? decoded.managerId! : decoded.userId;

    await connectDB();

    // 4. Fetch the actual user (admin's own doc, or manager's own doc)
    const actualUser = await User.findById(actualUserId).select(
      "_id role adminId status isPending isVerified tokenVersion"
    );

    if (!actualUser) {
      return NextResponse.json(
        { error: "Account not found. Please login again." },
        { status: 401 }
      );
    }

    if (!actualUser.isVerified) {
      return NextResponse.json(
        { error: "Account not verified." },
        { status: 401 }
      );
    }

    if (actualUser.isPending) {
      return NextResponse.json(
        { error: "Account setup is incomplete." },
        { status: 401 }
      );
    }

    if (actualUser.status === "blocked") {
      return NextResponse.json(
        { error: "Your account has been blocked. Please contact support." },
        { status: 403 }
      );
    }

    // ✅ NEW — 5. Token version check (force-logout on block/delete/ban)
    //    If the stored tokenVersion is higher than what's in the JWT,
    //    the token has been explicitly invalidated.
    const dbTokenVersion = actualUser.tokenVersion ?? 0;
    const jwtTokenVersion = decoded.tokenVersion ?? 0;

    if (dbTokenVersion > jwtTokenVersion) {
      return NextResponse.json(
        { error: "Session invalidated. Please login again.", code: "TOKEN_REVOKED" },
        { status: 401 }
      );
    }

    // ✅ NEW — 6. Device-level security check
    if (decoded.deviceId) {
      const device = await Device.findOne({
        userId: actualUserId,
        deviceId: decoded.deviceId,
      }).select("status blockedUntil");

      if (device) {
        if (device.status === "banned") {
          return NextResponse.json(
            { error: "This device has been banned. Please contact support.", code: "DEVICE_BANNED" },
            { status: 403 }
          );
        }

        if (device.status === "blocked") {
          if (device.blockedUntil && device.blockedUntil > new Date()) {
            return NextResponse.json(
              {
                error: `This device is blocked until ${device.blockedUntil.toLocaleDateString()}.`,
                code: "DEVICE_BLOCKED",
              },
              { status: 403 }
            );
          }
          // Block period expired — auto-restore to active
          await Device.findOneAndUpdate(
            { userId: actualUserId, deviceId: decoded.deviceId },
            { status: "active", blockedUntil: null }
          );
        }

        // Update lastSeen on every verified request (debounced — only if older than 5 min)
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (!device.lastSeen || device.lastSeen < fiveMinAgo) {
          Device.findOneAndUpdate(
            { userId: actualUserId, deviceId: decoded.deviceId },
            { lastSeen: new Date() }
          ).exec(); // fire-and-forget, do not await
        }
      }
    }

    // 7. For managers: verify the admin they belong to still exists and is not blocked
    if (isManagerToken) {
      const adminId = decoded.userId; // decoded.userId is always adminId for managers
      const admin = await User.findById(adminId).select("_id status isVerified");

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

    // 8. Build and return the verified auth payload
    const payload: AuthPayload = {
      userId: decoded.userId,
      role: decoded.role,           // ✅ use role from JWT (not from admin doc)
      deviceId: decoded.deviceId,
      ...(isManagerToken && {
        managerId: decoded.managerId,
        adminId: decoded.userId,
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