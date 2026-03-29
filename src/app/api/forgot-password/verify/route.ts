// src/app/api/forgot-password/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { rateLimit } from "@/lib/rateLimit";
import { EMAIL_RE, LIMITS } from "@/lib/registerValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 1_024;

/**
 * Rate limit: 10 attempts per IP per 15 minutes.
 * Covers both the OTP-check step and the final password-reset step.
 */
const RATE_LIMIT = { limit: 10, windowSeconds: 900 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    // ── 1. Body size guard ──────────────────────────────────────────────────
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    // ── 2. IP rate limit ────────────────────────────────────────────────────
    const ip = getClientIp(req);
    const rl = rateLimit(`forgot-verify:${ip}`, RATE_LIMIT);

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many attempts. Please wait before trying again.",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSeconds) },
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

    const { email, otp, newPassword } = raw;

    // ── 4. Validate email + OTP ─────────────────────────────────────────────
    if (!email || typeof email !== "string" || email.trim() === "") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!otp || typeof otp !== "string" || otp.trim() === "") {
      return NextResponse.json({ error: "OTP is required." }, { status: 400 });
    }

    const emailNorm = email.trim().toLowerCase().slice(0, LIMITS.email);
    // Strip non-digits, must be exactly 6
    const otpNorm   = String(otp).replace(/\D/g, "").slice(0, 6);

    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
    if (otpNorm.length !== 6) {
      return NextResponse.json({ error: "OTP must be exactly 6 digits." }, { status: 400 });
    }

    // ── 5. DB lookup ────────────────────────────────────────────────────────
    await connectDB();

    const user = await User.findOne({ email: emailNorm });

    if (!user) {
      // Generic — don't reveal account existence on a verify/reset endpoint
      return NextResponse.json({ error: "Invalid OTP or email." }, { status: 400 });
    }

    if (!user.otp || !user.otpExpires) {
      return NextResponse.json(
        { error: "No active OTP found. Please request a new one." },
        { status: 400 }
      );
    }

    // ── 6. Expiry check ─────────────────────────────────────────────────────
    if (new Date(user.otpExpires) < new Date()) {
      user.otp        = null;
      user.otpExpires = null;
      await user.save();
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // ── 7. OTP comparison ───────────────────────────────────────────────────
    if (user.otp !== otpNorm) {
      return NextResponse.json(
        { error: "Invalid OTP. Please check and try again." },
        { status: 400 }
      );
    }

    // ── 8a. OTP-check only (step 2 in the UI flow) ──────────────────────────
    if (newPassword === "__OTP_CHECK__") {
      return NextResponse.json({ otpValid: true });
    }

    // ── 8b. Full password reset ─────────────────────────────────────────────
    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json({ error: "New password is required." }, { status: 400 });
    }

    const passwordNorm = String(newPassword).slice(0, LIMITS.password);

    if (passwordNorm.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Assign plain — pre-save hook in User model hashes it
    user.password   = passwordNorm;
    user.otp        = null;
    user.otpExpires = null;
    // Increment tokenVersion to force-logout all existing sessions
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (err: unknown) {
    console.error("[forgot-password/verify] unhandled error:", err);
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}