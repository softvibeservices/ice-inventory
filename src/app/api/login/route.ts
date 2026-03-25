// src/app/api/login/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Device from "@/models/Device";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

/**
 * Parse a user-agent string into a human-readable label + components.
 */
function parseUserAgent(ua: string): {
  browser: string;
  platform: string;
  label: string;
} {
  let browser = "Unknown Browser";
  let platform = "Unknown OS";

  // Browser detection (order matters — check Edge/Opera before Chrome)
  if (ua.includes("Edg/") || ua.includes("Edge/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "Internet Explorer";
  else if (ua.includes("CriOS")) browser = "Chrome (iOS)";
  else if (ua.includes("FxiOS")) browser = "Firefox (iOS)";

  // Platform/OS detection
  if (ua.includes("Android")) platform = "Android";
  else if (ua.includes("iPhone")) platform = "iPhone";
  else if (ua.includes("iPad")) platform = "iPad";
  else if (ua.includes("Windows NT")) platform = "Windows";
  else if (ua.includes("Mac OS X")) platform = "macOS";
  else if (ua.includes("Linux")) platform = "Linux";
  else if (ua.includes("CrOS")) platform = "ChromeOS";

  return {
    browser,
    platform,
    label: `${browser} on ${platform}`,
  };
}

/**
 * Server-side fallback fingerprint — used ONLY when no clientDeviceId is
 * provided (e.g. direct API calls, old clients still in the field before
 * they have cleared their localStorage and triggered a fresh login).
 *
 * NOTE: This is intentionally the same algorithm as before so that existing
 * Device documents in MongoDB remain valid — users who are already logged in
 * will not be forced to re-authenticate on deploy.
 */
function generateFallbackDeviceId(userId: string, userAgent: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${userAgent}`)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Sanitize a client-supplied device fingerprint.
 *
 * The client sends a 16-char hex string from deviceFingerprint.ts.
 * We prefix it with "c_" so Device documents in MongoDB are visually
 * distinguishable from legacy server-generated IDs — useful for debugging
 * and future migrations.
 *
 * Rules:
 *   - Must be a non-empty string
 *   - Strip anything that isn't a hex character (0-9, a-f)
 *   - Clamp to 64 chars max (our hash output is 16, but be generous)
 *   - If after stripping it's empty, return null → fall back to server hash
 */
function sanitizeClientFingerprint(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  // Only keep hex characters, lowercase everything
  const cleaned = raw.toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 64);

  if (cleaned.length < 8) return null; // too short to be meaningful

  return `c_${cleaned}`;
}

// ─────────────────────────────────────────────
//  POST /api/login
// ─────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // ✅ Accept clientDeviceId from the login form alongside the existing fields.
    //    clientDeviceId is the output of getOrCreateDeviceFingerprint() from
    //    src/utils/deviceFingerprint.ts — a 16-char hex string generated from
    //    canvas rendering, CPU cores, screen resolution, timezone, and locale.
    const { email, password, rememberMe, clientDeviceId } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Find user (admin or manager)
    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Check verified
    if (!user.isVerified) {
      return NextResponse.json(
        { error: "User not verified" },
        { status: 401 }
      );
    }

    // 3. Check pending
    if (user.isPending) {
      return NextResponse.json(
        { error: "Account setup incomplete" },
        { status: 401 }
      );
    }

    // 4. Check account status
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

    // 6. Resolve userId and managerId.
    //    For admin:   userId = user._id,    no managerId
    //    For manager: userId = user.adminId (so all data queries keep working),
    //                 managerId = user._id  (manager's own identity)
    const isManager = user.role === "manager" && user.adminId;
    const resolvedUserId = isManager
      ? user.adminId!.toString()
      : user._id.toString();

    // 7. Device fingerprinting
    //    Always keyed on user._id (the real owner), never the adminId alias.
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "Unknown";

    const deviceOwnerId = user._id.toString(); // ALWAYS the real _id

    // ✅ DEVICE ID RESOLUTION — prefer the richer client fingerprint.
    //
    //    Priority:
    //      1. sanitized clientDeviceId (prefixed "c_") — from deviceFingerprint.ts
    //         Uses canvas rendering + CPU cores + screen + timezone + locale.
    //         Distinguishes two identical MacBooks on the same WiFi.
    //
    //      2. server-side UA hash (no prefix) — legacy fallback.
    //         Used for: old sessions already in the DB, direct API calls,
    //         browsers with localStorage blocked (strict private mode).
    //         Two identical devices on the same network → same ID (old bug).
    //         Kept here so existing logged-in sessions don't break on deploy.
    const sanitized = sanitizeClientFingerprint(clientDeviceId);
    const deviceId  = sanitized ?? generateFallbackDeviceId(deviceOwnerId, userAgent);

    const { browser, platform, label } = parseUserAgent(userAgent);

    // Upsert device — create if new, update lastSeen + ip if existing.
    // IMPORTANT: $setOnInsert only sets status:"active" on brand new docs,
    // so existing banned devices retain their status on re-login.
    const existingDevice = await Device.findOneAndUpdate(
      { userId: user._id, deviceId },
      {
        $set: {
          userAgent,
          browser,
          platform,
          label,
          ip,
          lastSeen: new Date(),
        },
        $setOnInsert: {
          status: "active",
          blockedUntil: null,
          revokedAt: null,
        },
      },
      { upsert: true, new: true }
    );

    // 8. Block login if device is banned or actively blocked
    if (existingDevice) {
      if (existingDevice.status === "banned") {
        return NextResponse.json(
          {
            error:
              "This device has been banned from accessing your account. Please contact support.",
            code: "DEVICE_BANNED",
          },
          { status: 403 }
        );
      }

      if (existingDevice.status === "blocked") {
        if (
          existingDevice.blockedUntil &&
          existingDevice.blockedUntil > new Date()
        ) {
          return NextResponse.json(
            {
              error: `This device is blocked until ${existingDevice.blockedUntil.toLocaleDateString()}. Please try again later.`,
              code: "DEVICE_BLOCKED",
            },
            { status: 403 }
          );
        }
        // Block period has expired — auto-restore
        await Device.findOneAndUpdate(
          { userId: user._id, deviceId },
          { status: "active", blockedUntil: null }
        );
      }
    }

    // 9. Include tokenVersion + deviceId in JWT.
    //    rememberMe → 90 days, otherwise 7 days.
    const tokenVersion = user.tokenVersion ?? 0;

    const jwtPayload: Record<string, unknown> = {
      userId: resolvedUserId,
      role: user.role,
      deviceId,        // ✅ now contains the client fingerprint ("c_…") when available
      tokenVersion,
    };

    if (isManager) {
      jwtPayload.managerId = user._id.toString();
      jwtPayload.adminId   = resolvedUserId;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[login] JWT_SECRET is not defined");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const expiresIn = rememberMe ? "90d" : "7d";
    const token = jwt.sign(jwtPayload, secret, { expiresIn });

    return NextResponse.json({
      token,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        contact: user.contact,
        shopName: user.shopName,
        shopAddress: user.shopAddress,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err: any) {
    console.error("[login] error:", err);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}