// src/app/api/register/resend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";
import { transporter } from "@/lib/nodemailer";
import { rateLimit } from "@/lib/rateLimit";
import { EMAIL_RE, LIMITS } from "@/lib/registerValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_LENGTH      = 6;
const OTP_TTL_MINUTES = 10;
const COOLDOWN_SECONDS = 60;

/** Rate-limit: max 3 resend attempts per IP per hour */
const RATE_LIMIT_RESEND = { limit: 3, windowSeconds: 3600 };

/** Maximum raw body size we will accept */
const MAX_BODY_BYTES = 1_024; // 1 KB — resend only needs an email

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateNumericOtp(len = OTP_LENGTH): string {
  const max = 10 ** len;
  return crypto.randomInt(0, max).toString().padStart(len, "0");
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function buildResendEmailHtml({
  appName,
  otp,
  expiresMinutes,
  supportEmail,
  userName,
}: {
  appName: string;
  otp: string;
  expiresMinutes: number;
  supportEmail: string;
  userName?: string;
}): string {
  const safeApp     = appName     || "IceCream Inventory";
  const safeSupport = supportEmail || "support@yourdomain.com";

  return `<!doctype html>
<html>
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;background:#f7fafc;margin:0;padding:32px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,0.08);">
      <div style="padding:20px 24px;background:linear-gradient(90deg,#EFF6FF,#A7F3D0);">
        <h2 style="margin:0;color:#0f172a;font-size:18px;">${safeApp}</h2>
      </div>
      <div style="padding:22px;">
        <p>Hello ${userName ?? "there"},</p>
        <p>Here is your new verification code.</p>
        <div style="margin:18px 0;text-align:center;">
          <div style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;font-size:22px;letter-spacing:4px;">
            ${otp}
          </div>
        </div>
        <p>This code will expire in <strong>${expiresMinutes} minutes</strong>. Do not share it with anyone.</p>
        <p>If you did not request this, please ignore this email or contact
          <a href="mailto:${safeSupport}">${safeSupport}</a>.
        </p>
        <hr style="border:none;border-top:1px solid #eef2ff;margin:18px 0;"/>
        <p style="color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ${safeApp}.</p>
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

    // ── 2. Rate limiting (per IP) ───────────────────────────────────────────
    const ip = getClientIp(req);
    const rl = rateLimit(`resend:${ip}`, RATE_LIMIT_RESEND);

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many resend attempts. Please try again later.",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfterSeconds),
            "X-RateLimit-Limit":     String(RATE_LIMIT_RESEND.limit),
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

    // ── 4. Validate email field ─────────────────────────────────────────────
    const emailRaw = raw.email;
    if (!emailRaw || typeof emailRaw !== "string" || emailRaw.trim() === "") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase().slice(0, LIMITS.email);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    // ── 5. DB lookup ────────────────────────────────────────────────────────
    await connectDB();

    const user = await User.findOne({ email });

    // Always return 200-ish to avoid user enumeration — but still rate-limit
    if (!user) {
      // Generic message: don't reveal whether the email exists
      return NextResponse.json(
        { message: "If this email is registered and unverified, a new OTP has been sent." },
        { status: 200 }
      );
    }

    if (user.isVerified) {
      // Don't reveal account details — just redirect them to login
      return NextResponse.json(
        { message: "This account is already verified. Please log in." },
        { status: 200 }
      );
    }

    // ── 6. Per-user cooldown check ──────────────────────────────────────────
    const last = user.otpRequestedAt ? new Date(user.otpRequestedAt) : null;
    if (last) {
      const secondsSince = Math.floor((Date.now() - last.getTime()) / 1000);
      if (secondsSince < COOLDOWN_SECONDS) {
        return NextResponse.json(
          {
            error: "Please wait before requesting another code.",
            waitSeconds: COOLDOWN_SECONDS - secondsSince,
          },
          { status: 429 }
        );
      }
    }

    // ── 7. Generate and persist new OTP ────────────────────────────────────
    const otp = generateNumericOtp();
    user.otp            = otp;
    user.otpExpires     = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.otpRequestedAt = new Date();
    await user.save();

    // ── 8. Send email ───────────────────────────────────────────────────────
    const appName      = process.env.APP_NAME      || "IceCream Inventory";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@yourdomain.com";

    const html = buildResendEmailHtml({
      appName,
      otp,
      expiresMinutes: OTP_TTL_MINUTES,
      supportEmail,
      userName: user.name,
    });

    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      user.email,
      subject: `${appName} — Your new verification code`,
      text:    `Your verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      html,
    });

    return NextResponse.json(
      { message: "If this email is registered and unverified, a new OTP has been sent." },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[register/resend] unhandled error:", err);
    return NextResponse.json({ error: "Unable to resend OTP at the moment." }, { status: 500 });
  }
}