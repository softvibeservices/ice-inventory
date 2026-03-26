// src/app/api/verify-account/route.ts
//
// POST — accepts { email }
//   • If the account does not exist → 404
//   • If the account is already verified → 400
//   • If the request comes in within the 60 s cool-down → 429 + waitSeconds
//   • Otherwise: generate a fresh OTP, persist it, send it, return 200
//
// The OTP verification itself is done by the existing POST /api/verify route,
// which already sets isVerified = true on success.
// Resend during the OTP step is handled by the existing POST /api/register/resend route.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import crypto from "crypto";

// ─── Constants ───────────────────────────────────────────────────────────────
const OTP_LENGTH       = 6;
const OTP_TTL_MINUTES  = 10;
const COOLDOWN_SECONDS = 60;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateNumericOtp(len = OTP_LENGTH): string {
  const max = 10 ** len;
  return crypto.randomInt(0, max).toString().padStart(len, "0");
}

function buildVerifyEmailHtml({
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
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
  </head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;background:#f7fafc;margin:0;padding:32px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,0.08);">
      <div style="padding:20px 24px;background:linear-gradient(90deg,#EFF6FF,#A7F3D0);">
        <h2 style="margin:0;color:#0f172a;font-size:18px;">${appName}</h2>
      </div>
      <div style="padding:22px;">
        <p>Hello ${userName ?? "there"},</p>
        <p>You requested to verify your account. Use the code below:</p>
        <div style="margin:18px 0;display:flex;align-items:center;justify-content:center;">
          <div style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;font-size:22px;letter-spacing:4px;">
            ${otp}
          </div>
        </div>
        <p>This code will expire in <strong>${expiresMinutes} minutes</strong>. Do not share it with anyone.</p>
        <p>If you did not request this, please ignore this email or contact
          <a href="mailto:${supportEmail}">${supportEmail}</a>.
        </p>
        <hr style="border:none;border-top:1px solid #eef2ff;margin:18px 0;" />
        <p style="color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ${appName}.</p>
      </div>
    </div>
  </body>
</html>`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body ?? {};

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const emailNorm = email.trim().toLowerCase();

    await connectDB();

    // 1. Find the user
    const user: any = await User.findOne({ email: emailNorm });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email. Please register first." },
        { status: 404 }
      );
    }

    // 2. Already verified — nothing to do
    if (user.isVerified) {
      return NextResponse.json(
        { error: "This account is already verified. Please login." },
        { status: 400 }
      );
    }

    // 3. Cool-down check — prevent OTP spam
    const last = user.otpRequestedAt ? new Date(user.otpRequestedAt) : null;
    if (last) {
      const secondsSince = Math.floor((Date.now() - last.getTime()) / 1000);
      if (secondsSince < COOLDOWN_SECONDS) {
        return NextResponse.json(
          {
            error: "Too many requests. Please wait before requesting another OTP.",
            waitSeconds: COOLDOWN_SECONDS - secondsSince,
          },
          { status: 429 }
        );
      }
    }

    // 4. Generate OTP and persist
    const otp         = generateNumericOtp();
    const otpExpires  = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    user.otp            = otp;
    user.otpExpires     = otpExpires;
    user.otpRequestedAt = new Date();
    await user.save();

    // 5. Send email
    const appName      = process.env.APP_NAME      || "IceCream Inventory";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@yourdomain.com";

    const html = buildVerifyEmailHtml({
      appName,
      otp,
      expiresMinutes: OTP_TTL_MINUTES,
      supportEmail,
      userName: user.name,
    });

    try {
      await transporter.sendMail({
        from:    process.env.EMAIL_USER,
        to:      user.email,
        subject: `${appName} — Verify your account`,
        text:    `Your account verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
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
  } catch (err: any) {
    console.error("[verify-account] error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
