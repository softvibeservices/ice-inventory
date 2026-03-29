// src/app/api/forgot-password/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import crypto from "crypto";
import { rateLimit } from "@/lib/rateLimit";
import { EMAIL_RE, LIMITS } from "@/lib/registerValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES   = 512;
const OTP_LENGTH       = 6;
const OTP_TTL_MINUTES  = 10;
const COOLDOWN_SECONDS = 60;

/** IP rate limit: 5 requests per hour */
const RATE_LIMIT = { limit: 5, windowSeconds: 3600 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function generateNumericOtp(len = OTP_LENGTH): string {
  return crypto.randomInt(0, 10 ** len).toString().padStart(len, "0");
}

/** Human-readable time remaining, e.g. "1 hour 43 minutes" or "52 minutes" */
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

function buildEmailHtml({
  appName,
  otp,
  expiresMinutes,
  supportEmail,
}: {
  appName: string;
  otp: string;
  expiresMinutes: number;
  supportEmail: string;
}): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;background:#f7fafc;margin:0;padding:32px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,0.08);">
      <div style="padding:20px 24px;background:linear-gradient(90deg,#EFF6FF,#A7F3D0);">
        <h2 style="margin:0;color:#0f172a;font-size:18px;">${appName}</h2>
      </div>
      <div style="padding:22px;">
        <p>You requested to reset your password. Use the one-time code below:</p>
        <div style="margin:18px 0;text-align:center;">
          <div style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;font-size:22px;letter-spacing:4px;">${otp}</div>
        </div>
        <p>This code expires in <strong>${expiresMinutes} minutes</strong>. Do not share it with anyone.</p>
        <p>If you did not request this, safely ignore this email or contact <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
        <hr style="border:none;border-top:1px solid #eef2ff;margin:18px 0;"/>
        <p style="color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ${appName}.</p>
      </div>
    </div>
  </body>
</html>`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Body size guard ──────────────────────────────────────────────────
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    // ── 2. IP rate limit ────────────────────────────────────────────────────
    const ip = getClientIp(req);
    const rl = rateLimit(`forgot-request:${ip}`, RATE_LIMIT);

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
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
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase().slice(0, LIMITS.email);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    // ── 5. DB lookup ────────────────────────────────────────────────────────
    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Please create an account first." },
        { status: 404 }
      );
    }

    // ── 6. Account status checks ────────────────────────────────────────────
    //
    // TEMPORARY LOCKOUT (too many wrong passwords):
    // Block the reset entirely while the lockout is active — otherwise an
    // attacker who triggered the lockout could immediately bypass it by
    // resetting their password. Tell them exactly when they can try again.
    //
    if (user.status === "blocked") {
      const unblockAt: Date | null = user.blockedUntil ?? null;

      if (unblockAt && unblockAt > new Date()) {
        // Active temporary lockout — deny the reset and surface the wait time
        const remaining = unblockAt.getTime() - Date.now();
        return NextResponse.json(
          {
            error: `Your account is temporarily locked due to too many failed login attempts. You can reset your password in ${formatTimeRemaining(remaining)}.`,
            code:  "ACCOUNT_LOCKED",
            unblockAt: unblockAt.toISOString(),
          },
          { status: 403 }
        );
      }

      // Lockout window has expired — auto-restore and allow the reset to proceed
      if (unblockAt && unblockAt <= new Date()) {
        await User.updateOne(
          { _id: user._id },
          { $set: { status: "approved", failedAttempts: 0, blockedUntil: null } }
        );
        user.status         = "approved";
        user.failedAttempts = 0;
        user.blockedUntil   = null;
      } else {
        // Permanent admin block (blockedUntil is null) — deny completely
        return NextResponse.json(
          { error: "Your account has been blocked. Please contact support." },
          { status: 403 }
        );
      }
    }

    // Rejected accounts cannot reset their password
    if (user.status === "rejected") {
      return NextResponse.json(
        { error: "Your account has been rejected. Please contact support." },
        { status: 403 }
      );
    }

    // ── 7. Per-user cooldown ────────────────────────────────────────────────
    const last = user.otpRequestedAt ? new Date(user.otpRequestedAt) : null;
    if (last) {
      const secondsSince = Math.floor((Date.now() - last.getTime()) / 1000);
      if (secondsSince < COOLDOWN_SECONDS) {
        const waitSeconds = COOLDOWN_SECONDS - secondsSince;
        return NextResponse.json(
          {
            error: `Please wait ${waitSeconds}s before requesting another OTP.`,
            waitSeconds,
          },
          { status: 429 }
        );
      }
    }

    // ── 8. Generate and save OTP ────────────────────────────────────────────
    const otp = generateNumericOtp();
    user.otp            = otp;
    user.otpExpires     = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.otpRequestedAt = new Date();
    await user.save();

    // ── 9. Send email ───────────────────────────────────────────────────────
    const appName      = process.env.APP_NAME      || "IceCream Inventory";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@yourdomain.com";

    const html = buildEmailHtml({ appName, otp, expiresMinutes: OTP_TTL_MINUTES, supportEmail });

    try {
      await transporter.sendMail({
        from:    process.env.EMAIL_USER,
        to:      user.email,
        subject: `${appName} — Password Reset Code`,
        text:    `Your password reset code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
        html,
      });
    } catch (mailErr) {
      console.error("[forgot-password/request] sendMail failed:", mailErr);
      return NextResponse.json(
        { error: "Failed to send reset email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "If this email is registered, you will receive a password reset OTP shortly." },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[forgot-password/request] unhandled error:", err);
    return NextResponse.json({ error: "Unable to process request at this time." }, { status: 500 });
  }
}