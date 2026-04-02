// src/app/api/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import crypto from "crypto";
import { rateLimit } from "@/lib/rateLimit";
import { sanitiseRegisterBody } from "@/lib/registerValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;

/** Maximum raw body size we will accept (bytes) */
const MAX_BODY_BYTES = 8_192; // 8 KB — far more than any legit register payload

/** Rate-limit: max 5 registration attempts per IP per hour */
const RATE_LIMIT_REGISTER = { limit: 5, windowSeconds: 3600 };

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

function buildRegisterEmailHtml({
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
        <p>Use the verification code below to activate your account.</p>
        <div style="margin:18px 0;text-align:center;">
          <div style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;font-size:22px;letter-spacing:4px;">
            ${otp}
          </div>
        </div>
        <p>This code will expire in <strong>${expiresMinutes} minutes</strong>. Do not share it with anyone.</p>
        <p>If you did not sign up, please ignore this email or contact
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
    const ip  = getClientIp(req);
    const rl  = rateLimit(`register:${ip}`, RATE_LIMIT_REGISTER);

    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "Too many registration attempts. Please try again later.",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfterSeconds),
            "X-RateLimit-Limit": String(RATE_LIMIT_REGISTER.limit),
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

    // ── 4. Honeypot check (bot trap — hidden field must be empty) ───────────
    //    The frontend sends `_hp: ""`. Bots often fill every field.
    if (raw._hp !== "" && raw._hp !== undefined) {
      // Silently appear to succeed — don't tell bots they were caught
      return NextResponse.json(
        { message: "Account created. A verification code has been sent to the provided email." },
        { status: 201 }
      );
    }

    // ── 5. Validate & sanitise ──────────────────────────────────────────────
    const result = sanitiseRegisterBody(raw);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { name, email, contact, password } = result.data;

    // ── 6. DB: duplicate check ──────────────────────────────────────────────
    await connectDB();

    const exists = await User.findOne({
      email,
      role: { $ne: "manager" },
    }).lean();

    if (exists) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // ── 7. Create user + OTP ────────────────────────────────────────────────
    const otp        = generateNumericOtp();
    const otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const now        = new Date();

    const newUser = new User({
      name,
      email,
      contact,
      password,
      role: "admin",
      isVerified: false,
      isPending: false,
      otp,
      otpExpires,
      otpRequestedAt: now,
      createdAt: now,
    });

    await newUser.save();

    // ── 8. Send verification email ──────────────────────────────────────────
    const appName     = process.env.APP_NAME     || "IceCream Inventory";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@yourdomain.com";

    const html = buildRegisterEmailHtml({
      appName,
      otp,
      expiresMinutes: OTP_TTL_MINUTES,
      supportEmail,
      userName: newUser.name,
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to:   newUser.email,
        subject: `${appName} — Verify your account`,
        text: `Your verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
        html,
      });
    } catch (mailErr) {
      console.error("[register] sendMail failed:", mailErr);
      // User is created but mail failed — don't expose internal error
      return NextResponse.json(
        { message: "Account created. Verification email could not be sent. Please contact support." },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { message: "Account created. A verification code has been sent to the provided email." },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[register] unhandled error:", err);
    return NextResponse.json({ error: "Unable to register at the moment." }, { status: 500 });
  }
}