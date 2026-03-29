// src/app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Device from "@/models/Device";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { rateLimit } from "@/lib/rateLimit";
import { EMAIL_RE, LIMITS } from "@/lib/registerValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES      = 4_096;
/** IP-level: 20 attempts per 15 min */
const RATE_LIMIT_LOGIN    = { limit: 20, windowSeconds: 900 };
/** Account-level: 5 wrong passwords → blocked for 2 hours */
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS   = 2 * 60 * 60 * 1000; // 2 hours

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function parseUserAgent(ua: string): { browser: string; platform: string; label: string } {
  let browser  = "Unknown Browser";
  let platform = "Unknown OS";

  if      (ua.includes("Edg/") || ua.includes("Edge/"))          browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera"))          browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium"))   browser = "Chrome";
  else if (ua.includes("Firefox/"))                               browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome"))     browser = "Safari";
  else if (ua.includes("MSIE") || ua.includes("Trident/"))       browser = "Internet Explorer";
  else if (ua.includes("CriOS"))                                  browser = "Chrome (iOS)";
  else if (ua.includes("FxiOS"))                                  browser = "Firefox (iOS)";

  if      (ua.includes("Android"))    platform = "Android";
  else if (ua.includes("iPhone"))     platform = "iPhone";
  else if (ua.includes("iPad"))       platform = "iPad";
  else if (ua.includes("Windows NT")) platform = "Windows";
  else if (ua.includes("Mac OS X"))   platform = "macOS";
  else if (ua.includes("Linux"))      platform = "Linux";
  else if (ua.includes("CrOS"))       platform = "ChromeOS";

  return { browser, platform, label: `${browser} on ${platform}` };
}

function generateFallbackDeviceId(userId: string, userAgent: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${userAgent}`)
    .digest("hex")
    .substring(0, 32);
}

function sanitizeClientFingerprint(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const cleaned = raw.toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 64);
  if (cleaned.length < 8) return null;
  return `c_${cleaned}`;
}

function formatTimeRemaining(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes >= 60) {
    const hours   = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0
      ? `${hours} hour${hours > 1 ? "s" : ""} ${minutes} minute${minutes > 1 ? "s" : ""}`
      : `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return `${totalMinutes} minute${totalMinutes > 1 ? "s" : ""}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Body size guard ──────────────────────────────────────────────────
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    // ── 2. IP-level rate limit ──────────────────────────────────────────────
    const ip = getClientIp(req);
    const rl = rateLimit(`login:${ip}`, RATE_LIMIT_LOGIN);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many login attempts from this network. Please wait before trying again.",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After":          String(rl.retryAfterSeconds),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // ── 3. Parse body ───────────────────────────────────────────────────────
    let raw: Record<string, unknown>;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { email, password, rememberMe, clientDeviceId } = raw;

    // ── 4. Input validation ─────────────────────────────────────────────────
    if (!email || typeof email !== "string" || email.trim() === "") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.trim() === "") {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    const emailNorm    = email.trim().toLowerCase().slice(0, LIMITS.email);
    const passwordNorm = String(password).slice(0, LIMITS.password);

    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    // ── 5. DB lookup ────────────────────────────────────────────────────────
    await connectDB();

    const user = await User.findOne({ email: emailNorm });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // ── 6. Verified & pending checks ────────────────────────────────────────
    if (!user.isVerified) {
      return NextResponse.json(
        { error: "Account not verified. Please verify your email first." },
        { status: 401 }
      );
    }

    if (user.isPending) {
      return NextResponse.json(
        { error: "Account setup is incomplete. Please contact support." },
        { status: 401 }
      );
    }

    // ── 7. Account status check ─────────────────────────────────────────────
    if (user.status === "blocked") {
      const unblockAt: Date | null = user.blockedUntil ?? null;

      if (unblockAt && unblockAt > new Date()) {
        // Still within the temporary lockout window
        const remaining = unblockAt.getTime() - Date.now();
        return NextResponse.json(
          {
            error:    `Your account is temporarily locked due to too many failed login attempts. Try again in ${formatTimeRemaining(remaining)}.`,
            code:     "ACCOUNT_LOCKED",
            unblockAt: unblockAt.toISOString(),
          },
          { status: 403 }
        );
      }

      if (unblockAt && unblockAt <= new Date()) {
        // Temporary block has expired — auto-restore
        await User.updateOne(
          { _id: user._id },
          { $set: { status: "approved", failedAttempts: 0, blockedUntil: null } }
        );
        user.status         = "approved";
        user.failedAttempts = 0;
        user.blockedUntil   = null;
      } else {
        // Permanent admin block (blockedUntil is null)
        return NextResponse.json(
          { error: "Your account has been blocked. Please contact support." },
          { status: 403 }
        );
      }
    }

    if (user.status === "rejected") {
      return NextResponse.json(
        { error: "Your account has been rejected. Please contact support." },
        { status: 403 }
      );
    }

    // ── 8. Password check ───────────────────────────────────────────────────
    const isMatch = await bcrypt.compare(passwordNorm, user.password);

    if (!isMatch) {
      // ── Atomic increment ──────────────────────────────────────────────────
      // Using findOneAndUpdate with $inc instead of read-modify-write prevents
      // the race condition where concurrent requests all read failedAttempts=0
      // and all save 1, making the counter perpetually stuck at 1.
      const updated = await User.findOneAndUpdate(
        { _id: user._id },
        { $inc: { failedAttempts: 1 } },
        { new: true }          // return the document AFTER the increment
      );

      const attempts = updated?.failedAttempts ?? 1;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        // Lock the account for 2 hours and reset the counter atomically
        const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS);
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              status:         "blocked",
              blockedUntil,
              failedAttempts: 0,   // reset so next attempt after unblock starts fresh
            },
          }
        );

        return NextResponse.json(
          {
            error:    "Too many failed attempts. Your account has been locked for 2 hours.",
            code:     "ACCOUNT_LOCKED",
            unblockAt: blockedUntil.toISOString(),
          },
          { status: 403 }
        );
      }

      const attemptsLeft = MAX_FAILED_ATTEMPTS - attempts;
      return NextResponse.json(
        {
          error: `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} remaining before your account is locked.`,
        },
        { status: 401 }
      );
    }

    // ── 9. Successful login — reset failed attempts ─────────────────────────
    if ((user.failedAttempts ?? 0) > 0) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedAttempts: 0 } }
      );
    }

    // ── 10. Resolve userId (admin vs manager) ────────────────────────────────
    const isManager      = user.role === "manager" && user.adminId;
    const resolvedUserId = isManager
      ? user.adminId!.toString()
      : user._id.toString();

    // ── 11. Device fingerprinting ─────────────────────────────────────────────
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const sanitized = sanitizeClientFingerprint(clientDeviceId);
    const deviceId  = sanitized ?? generateFallbackDeviceId(user._id.toString(), userAgent);

    const { browser, platform, label } = parseUserAgent(userAgent);

    const existingDevice = await Device.findOneAndUpdate(
      { userId: user._id, deviceId },
      {
        $set:       { userAgent, browser, platform, label, ip, lastSeen: new Date() },
        $setOnInsert: { status: "active", blockedUntil: null, revokedAt: null },
      },
      { upsert: true, new: true }
    );

    // ── 12. Device-level block checks ────────────────────────────────────────
    if (existingDevice?.status === "banned") {
      return NextResponse.json(
        {
          error: "This device has been banned from accessing your account. Please contact support.",
          code:  "DEVICE_BANNED",
        },
        { status: 403 }
      );
    }

    if (existingDevice?.status === "blocked") {
      if (existingDevice.blockedUntil && existingDevice.blockedUntil > new Date()) {
        return NextResponse.json(
          {
            error: `This device is blocked until ${existingDevice.blockedUntil.toLocaleDateString()}.`,
            code:  "DEVICE_BLOCKED",
          },
          { status: 403 }
        );
      }
      // Block expired — auto-restore
      await Device.findOneAndUpdate(
        { userId: user._id, deviceId },
        { status: "active", blockedUntil: null }
      );
    }

    // ── 13. Sign JWT ──────────────────────────────────────────────────────────
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[login] JWT_SECRET is not defined");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const tokenVersion = user.tokenVersion ?? 0;
    const jwtPayload: Record<string, unknown> = {
      userId: resolvedUserId,
      role:   user.role,
      deviceId,
      tokenVersion,
    };

    if (isManager) {
      jwtPayload.managerId = user._id.toString();
      jwtPayload.adminId   = resolvedUserId;
    }

    const expiresIn = rememberMe ? "90d" : "7d";
    const token     = jwt.sign(jwtPayload, secret, { expiresIn });

    return NextResponse.json({
      token,
      user: {
        _id:         user._id.toString(),
        name:        user.name,
        email:       user.email,
        contact:     user.contact,
        shopName:    user.shopName,
        shopAddress: user.shopAddress,
        role:        user.role,
        isVerified:  user.isVerified,
      },
    });

  } catch (err: unknown) {
    console.error("[login] unhandled error:", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}