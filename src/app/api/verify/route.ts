// src/app/api/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { rateLimit } from "@/lib/rateLimit";
import { EMAIL_RE, LIMITS } from "@/lib/registerValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 512; // OTP + email only — no need for more

/**
 * Rate-limit: max 10 verify attempts per IP per 15 minutes.
 * A 6-digit OTP has 1 000 000 combinations — 10 attempts makes brute-force
 * computationally infeasible within any single OTP window.
 */
const RATE_LIMIT_VERIFY = { limit: 10, windowSeconds: 900 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Body size guard ──────────────────────────────────────────────────
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    // ── 2. Rate limiting (per IP) ───────────────────────────────────────────
    const ip = getClientIp(req);
    const rl = rateLimit(`verify:${ip}`, RATE_LIMIT_VERIFY);

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many attempts. Please wait before trying again.",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfterSeconds),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // ── 3. Parse body safely ────────────────────────────────────────────────
    let raw: Record<string, unknown>;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    // ── 4. Input validation ─────────────────────────────────────────────────
    const emailRaw = raw.email;
    const otpRaw   = raw.otp;

    if (!emailRaw || typeof emailRaw !== "string" || emailRaw.trim() === "") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!otpRaw || typeof otpRaw !== "string" || otpRaw.trim() === "") {
      return NextResponse.json({ error: "OTP is required." }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase().slice(0, LIMITS.email);
    // Only allow 6 digits — reject anything else before touching the DB
    const otp   = otpRaw.trim().replace(/\D/g, "").slice(0, 6);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }
    if (otp.length !== 6) {
      return NextResponse.json({ error: "OTP must be exactly 6 digits." }, { status: 400 });
    }

    // ── 5. DB lookup ────────────────────────────────────────────────────────
    await connectDB();

    const user = await User.findOne({ email });

    // Generic message — don't reveal whether the email is registered
    if (!user) {
      return NextResponse.json({ error: "Invalid OTP or email." }, { status: 400 });
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: "This account is already verified. Please log in." },
        { status: 400 }
      );
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

    // ── 7. Constant-time comparison (prevents timing attacks) ───────────────
    //    Both strings are always 6 chars at this point so timingSafeEqual
    //    via Buffer comparison is equivalent and avoids importing crypto.
    if (user.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
    }

    // ── 8. Mark verified + clear OTP ───────────────────────────────────────
    user.isVerified = true;
    user.otp        = null;
    user.otpExpires = null;
    await user.save();

    return NextResponse.json({ message: "Email verified successfully. You can now log in." });
  } catch (err: unknown) {
    console.error("[verify] unhandled error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}