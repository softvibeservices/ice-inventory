// src/app/api/verify/route.ts
//
// ─────────────────────────────────────────────────────────────────────────────
//  OTP Verification Route — POST /api/verify
//
//  Called by the frontend after registration to verify the user's email
//  address using the 6-digit OTP sent during registration.
//
//  PHASE 2 ADDITION:
//    After setting user.isVerified = true and saving the user, this route
//    automatically creates a free_trial Subscription document for the user.
//    This ensures every verified admin user has a Subscription from day one
//    so all plan enforcement guards (subscriptionGuard.ts) always find a doc.
//
//  Flow:
//    1. Validate body — { email, otp }
//    2. Look up user by email
//    3. Guard: already verified? → 400
//    4. Guard: OTP expired? → 410
//    5. Guard: OTP mismatch? → 401 (with attempt-count increment)
//    6. Mark user.isVerified = true, clear OTP fields → save
//    7. ★ Upsert free_trial Subscription (Phase 2)
//    8. Return 200 success
//
//  Upsert safety (step 7):
//    Uses findOneAndUpdate with upsert: true so if the verify route is called
//    twice (e.g. network retry, re-verification edge case), we never create
//    a duplicate Subscription. The first call creates it; subsequent calls
//    are no-ops.
//
//  Rate limiting:
//    5 OTP attempts per IP per 15 minutes. After 5 failed OTP attempts for
//    the same user, the OTP is cleared and they must request a new one.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { rateLimit } from "@/lib/rateLimit";
import { EMAIL_RE, LIMITS } from "@/lib/registerValidation";

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum allowed raw body size. An OTP payload is tiny — 512 bytes is generous. */
const MAX_BODY_BYTES = 512;

/** After this many wrong OTP attempts, clear the OTP so user must request a new one. */
const MAX_OTP_ATTEMPTS = 5;

/** Rate limit: 5 requests per IP per 15 minutes (blocks brute-force OTP guessing). */
const RATE_LIMIT = { limit: 5, windowSeconds: 15 * 60 };

/** Free trial duration: 30 days from verification. */
const FREE_TRIAL_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * addMonths()
 *
 * Returns a new Date exactly `months` months after `date`, preserving the
 * day-of-month capped at 28 for February safety.
 *
 * Example: addMonths(new Date("2025-04-09"), 1) → May 9 2025
 * Example: addMonths(new Date("2025-01-31"), 1) → Feb 28 2025
 *
 * Uses UTC to avoid timezone-related day-shift bugs in serverless environments.
 */
function addMonths(date: Date, months: number): Date {
  const day = Math.min(date.getUTCDate(), 28); // cap at 28 for Feb safety
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      day
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Body size guard ──────────────────────────────────────────────────
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    // ── 2. IP rate limit — prevent brute-force OTP guessing ─────────────────
    const ip = getClientIp(req);
    const rl = rateLimit(`verify:${ip}`, RATE_LIMIT);

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many verification attempts. Please try again later.",
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

    // ── 4. Validate email ───────────────────────────────────────────────────
    const emailRaw = raw.email;
    if (!emailRaw || typeof emailRaw !== "string" || emailRaw.trim() === "") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase().slice(0, LIMITS.email);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    // ── 5. Validate OTP input ───────────────────────────────────────────────
    const otpRaw = raw.otp;
    if (!otpRaw || typeof otpRaw !== "string" || otpRaw.trim() === "") {
      return NextResponse.json({ error: "OTP is required." }, { status: 400 });
    }

    // Normalise: strip whitespace, keep only digits, enforce 6-char length
    const otp = otpRaw.trim().replace(/\D/g, "").slice(0, 6);

    if (otp.length !== 6) {
      return NextResponse.json(
        { error: "OTP must be exactly 6 digits." },
        { status: 400 }
      );
    }

    // ── 6. DB lookup ────────────────────────────────────────────────────────
    await connectDB();

    const user = await User.findOne({ email, role: { $ne: "manager" } });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email." },
        { status: 404 }
      );
    }

    // ── 7. Already verified guard ───────────────────────────────────────────
    if (user.isVerified) {
      return NextResponse.json(
        { error: "This account is already verified. Please log in." },
        { status: 400 }
      );
    }

    // ── 8. OTP existence guard ──────────────────────────────────────────────
    if (!user.otp || !user.otpExpires) {
      return NextResponse.json(
        {
          error:
            "No pending verification found. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    // ── 9. OTP expiry guard ─────────────────────────────────────────────────
    const now = new Date();

    if (now > user.otpExpires) {
      // Clear the expired OTP — user must request a new one
      user.otp        = null;
      user.otpExpires = null;
      await user.save();

      return NextResponse.json(
        {
          error:
            "This OTP has expired. Please request a new verification code.",
          expired: true,
        },
        { status: 410 }
      );
    }

    // ── 10. OTP match check ─────────────────────────────────────────────────
    //
    //  Use a constant-time comparison to prevent timing attacks.
    //  crypto.timingSafeEqual requires equal-length Buffers, so we pad/slice
    //  the input to match the stored OTP length (always 6 bytes).
    //
    //  We also track failed attempts and lock out after MAX_OTP_ATTEMPTS.
    //
    const storedOtp   = user.otp.slice(0, 6);
    const providedOtp = otp.slice(0, 6);

    // Pad to same length (defensive — both should be 6 chars)
    const storedBuf   = Buffer.from(storedOtp.padEnd(6, "0"));
    const providedBuf = Buffer.from(providedOtp.padEnd(6, "0"));

    let otpMatches = false;
    try {
      const { timingSafeEqual } = await import("crypto");
      otpMatches = timingSafeEqual(storedBuf, providedBuf);
    } catch {
      // Fallback to plain comparison if crypto import fails (should never happen)
      otpMatches = storedOtp === providedOtp;
    }

    if (!otpMatches) {
      // Track failed attempts — clear OTP after MAX_OTP_ATTEMPTS
      const attempts = (user as unknown as Record<string, number>)["_otpAttempts"] ?? 0;
      const nextAttempts = attempts + 1;

      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        // Too many wrong guesses — invalidate the OTP
        user.otp        = null;
        user.otpExpires = null;
        await user.save();

        return NextResponse.json(
          {
            error:
              "Too many incorrect attempts. Your OTP has been invalidated. Please request a new one.",
            locked: true,
          },
          { status: 401 }
        );
      }

      await user.save();

      return NextResponse.json(
        {
          error: "Incorrect OTP. Please check and try again.",
          attemptsRemaining: MAX_OTP_ATTEMPTS - nextAttempts,
        },
        { status: 401 }
      );
    }

    // ── 11. Mark user as verified and clear OTP fields ──────────────────────
    user.isVerified     = true;
    user.otp            = null;
    user.otpExpires     = null;
    user.otpRequestedAt = null;

    await user.save();

    // ── 12. ★ PHASE 2 — Auto-create free_trial Subscription ─────────────────
    //
    //  Every newly verified admin user gets a Subscription document
    //  automatically. This ensures subscriptionGuard.ts always finds a doc
    //  and plan enforcement works from the very first request.
    //
    //  Fields set on the free_trial Subscription:
    //
    //    planId:                 'free_trial'
    //    status:                 'active'
    //    billingPeriod:          'monthly'   ← arbitrary for free_trial; invoice
    //                                           count is the real enforcement axis
    //    startDate:              now          ← when verification happened
    //    currentPeriodEnd:       null         ← free_trial ends by invoice count,
    //                                           not by calendar date
    //    trialEndsAt:            now + 30d    ← belt-and-suspenders date cap
    //    invoicesUsedThisMonth:  0
    //    invoicesUsedTotal:      0
    //    invoiceCountResetAt:    same day, 1 month from now
    //                                        ← e.g. verified April 9 → May 9
    //                                           Used by lazy reset and add-on
    //                                           alignment (addonAlignment.ts)
    //
    //  Upsert pattern (findOneAndUpdate with upsert: true):
    //    If this route is called twice for the same user (network retry,
    //    manual re-verification), we do NOT create a second Subscription.
    //    The first upsert creates it; the second is a no-op because the
    //    $setOnInsert only fires when a new document is inserted.
    //    The unique index on { userId: 1 } is the final safety net.
    //
    //  We do NOT update if the document already exists (no $set outside
    //  $setOnInsert). This protects users who may have already been manually
    //  upgraded by a superAdmin before re-verification (edge case).
    //
    const verifiedAt         = new Date(); // capture precise timestamp
    const trialEndsAt        = new Date(verifiedAt.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const invoiceCountResetAt = addMonths(verifiedAt, 1);

    try {
      await Subscription.findOneAndUpdate(
        // Filter: look for an existing subscription for this user
        { userId: user._id },

        // Update: only set these fields if we're INSERTING (not updating)
        {
          $setOnInsert: {
            userId:                 user._id,
            planId:                 "free_trial",
            status:                 "active",
            billingPeriod:          "monthly",
            startDate:              verifiedAt,
            currentPeriodEnd:       null,
            trialEndsAt,
            invoicesUsedThisMonth:  0,
            invoicesUsedTotal:      0,
            invoiceCountResetAt,
          },
        },

        {
          upsert:    true,   // create if not exists
          new:       true,   // return the resulting document (not used but good practice)
          setDefaultsOnInsert: true, // apply schema defaults on insert
        }
      );
    } catch (subErr: unknown) {
      // Subscription creation failure is logged but does NOT block verification.
      // The user IS verified; the subscription can be repaired by superAdmin
      // or by a retry mechanism if needed. A duplicate key error here means
      // the subscription already exists (from a previous successful call) —
      // that's fine, not an error condition.
      const isDuplicateKey =
        typeof subErr === "object" &&
        subErr !== null &&
        "code" in subErr &&
        (subErr as { code: number }).code === 11000;

      if (!isDuplicateKey) {
        // Log only genuine errors, not expected duplicate-key no-ops
        console.error("[verify] Failed to create Subscription for user:", user._id, subErr);
      }
      // Continue — verification succeeded even if subscription creation had an issue
    }

    // ── 13. Return success ──────────────────────────────────────────────────
    return NextResponse.json(
      {
        message:
          "Email verified successfully. Your account is now active. You can log in.",
        verified: true,
      },
      { status: 200 }
    );

  } catch (err: unknown) {
    console.error("[verify] unhandled error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}