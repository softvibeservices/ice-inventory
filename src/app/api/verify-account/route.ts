// src/app/api/verify-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import crypto from "crypto";
import { rateLimit } from "@/lib/rateLimit";
import { EMAIL_RE, LIMITS } from "@/lib/registerValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES    = 512;
const OTP_LENGTH        = 6;
const OTP_TTL_MINUTES   = 10;
const COOLDOWN_SECONDS  = 60;

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

function buildEmailHtml({
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
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;background:#f7fafc;margin:0;padding:32px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,0.08);">
      <div style="padding:20px 24px;background:linear-gradient(90deg,#EFF6FF,#A7F3D0);">
        <h2 style="margin:0;color:#0f172a;font-size:18px;">${appName}</h2>
      </div>
      <div style="padding:22px;">
        <p>Hello ${userName ?? "there"},</p>
        <p>Use the code below to verify your account.</p>
        <div style="margin:18px 0;text-align:center;">
          <div style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;font-size:22px;letter-spacing:4px;">${otp}</div>
        </div>
        <p>This code expires in <strong>${expiresMinutes} minutes</strong>. Do not share it.</p>
        <p>If you did not request this, contact <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
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
    const rl = rateLimit(`verify-account:${ip}`, RATE_LIMIT);

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
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase().slice(0, LIMITS.email);

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    // ── 5. DB lookup ────────────────────────────────────────────────────────
    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Please register first." },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: "This account is already verified. Please log in." },
        { status: 400 }
      );
    }

    // ── 6. Per-user cooldown ────────────────────────────────────────────────
    const last = user.otpRequestedAt ? new Date(user.otpRequestedAt) : null;
    if (last) {
      const secondsSince = Math.floor((Date.now() - last.getTime()) / 1000);
      if (secondsSince < COOLDOWN_SECONDS) {
        return NextResponse.json(
          {
            error: "Please wait before requesting another OTP.",
            waitSeconds: COOLDOWN_SECONDS - secondsSince,
          },
          { status: 429 }
        );
      }
    }

    // ── 7. Generate and save OTP ────────────────────────────────────────────
    const otp        = generateNumericOtp();
    user.otp         = otp;
    user.otpExpires  = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.otpRequestedAt = new Date();
    await user.save();

    // ── 8. Send email ───────────────────────────────────────────────────────
    const appName      = process.env.APP_NAME      || "Ice Saathi";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@yourdomain.com";

    const html = buildEmailHtml({ appName, otp, expiresMinutes: OTP_TTL_MINUTES, supportEmail, userName: user.name });

    try {
      await transporter.sendMail({
        from:    process.env.EMAIL_USER,
        to:      user.email,
        subject: `${appName} — Verify your account`,
        text:    `Your verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
        html,
      });
    } catch (mailErr) {
      console.error("[verify-account] sendMail failed:", mailErr);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Verification OTP sent to your registered email." },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[verify-account] unhandled error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}