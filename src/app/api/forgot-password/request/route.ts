// src/app/api/forgot-password/request/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const COOLDOWN_SECONDS = 60; // don't resend within 60s to the same account

function isValidEmail(email?: string) {
  if (!email || typeof email !== "string") return false;
  // simple but effective RFC-like regex (not exhaustive)
  const re =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(email.trim());
}

function generateNumericOtp(len = OTP_LENGTH) {
  // Secure numeric OTP
  const max = 10 ** len;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(len, "0");
}

function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function buildHtmlEmail({
  appName,
  otp,
  expiresMinutes,
  supportEmail,
  frontendUrl,
}: {
  appName: string;
  otp: string;
  expiresMinutes: number;
  supportEmail: string;
  frontendUrl?: string;
}) {
  const safeApp = appName || "IceCream Inventory";
  const safeSupport = supportEmail || "support@example.com";
  const safeFrontend = frontendUrl || "";

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${safeApp} — Password Reset</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background: #f7fafc; margin:0; padding:32px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 10px 30px rgba(2,6,23,0.08);">
        <div style="padding:24px; background: linear-gradient(90deg,#EFF6FF,#A7F3D0);">
          <a href="${safeFrontend}" style="text-decoration:none; color: inherit;">
            <h2 style="margin:0; color:#0f172a; font-size:20px;">${safeApp}</h2>
          </a>
        </div>

        <div style="padding:24px;">
          <p style="margin:0 0 12px 0; color:#111827; font-size:16px;">
            You requested to reset your password. Use the one-time code below to continue.
          </p>

          <div style="margin:18px 0; display:flex; align-items:center; justify-content:center;">
            <div style="background:#0f172a; color:#fff; padding:14px 22px; border-radius:10px; font-size:22px; letter-spacing:4px;">
              ${otp}
            </div>
          </div>

          <p style="margin:0 0 12px 0; color:#374151; font-size:13px;">
            This code will expire in <strong>${expiresMinutes} minutes</strong>. For your security, do not share it with anyone.
          </p>

          <p style="margin:0 0 20px 0; color:#6b7280; font-size:13px;">
            If you didn't request this, you can safely ignore this email — no changes were made to your account.
          </p>

          <hr style="border:none; border-top:1px solid #eef2ff; margin:18px 0;" />

          <p style="margin:0; font-size:12px; color:#9ca3af;">
            If you need help, contact <a href="mailto:${safeSupport}" style="color:#2563eb; text-decoration:underline;">${safeSupport}</a>
          </p>
        </div>

        <div style="padding:12px 16px; background:#f8fafc; color:#9ca3af; font-size:12px;">
          <div style="display:flex; justify-content:space-between;">
            <div>${safeApp}</div>
            <div>© ${new Date().getFullYear()}</div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emailRaw = (body?.email ?? "").toString().trim().toLowerCase();

    if (!isValidEmail(emailRaw)) {
      // Don't reveal whether email exists — but reject obviously invalid input
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: emailRaw });

    // Always respond with a generic success message to avoid account enumeration.
    // If user is not present, we do NOT send an email — but we return 200 to the client.
    if (!user) {
      console.info(`[ForgotPassword] request for non-existing email: ${emailRaw}`);
      return NextResponse.json(
        { message: "If this email is registered, you will receive an OTP shortly." },
        { status: 200 }
      );
    }

    // Rate-limit: prevent requesting OTP too frequently
    const now = new Date();
    if (user.otpRequestedAt && (now.getTime() - new Date(user.otpRequestedAt).getTime()) / 1000 < COOLDOWN_SECONDS) {
      console.info(`[ForgotPassword] cooldown hit for ${emailRaw}`);
      return NextResponse.json(
        { message: "If this email is registered, you will receive an OTP shortly." },
        { status: 200 }
      );
    }

    // Generate OTP, hash it and store expiry
    const otp = generateNumericOtp();
    const otpHash = hashOtp(otp);
    const otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // update fields on user document (ensure schema allows these keys)
    user.otpHash = otpHash;
    user.otpExpires = otpExpires;
    user.otpRequestedAt = now;
    // optional: reset failed attempts counter
    user.otpAttempts = 0;

    await user.save();

    // Build a professional HTML email
    const appName = process.env.APP_NAME || "IceCream Inventory";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@yourdomain.com";
    const frontendUrl = process.env.FRONTEND_URL || "";

    const html = buildHtmlEmail({
      appName,
      otp,
      expiresMinutes: OTP_TTL_MINUTES,
      supportEmail,
      frontendUrl,
    });

    // send email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `${appName} — Password Reset Code`,
        text: `Your password reset code is ${otp}. It will expire in ${OTP_TTL_MINUTES} minutes.`,
        html,
      });

      console.info(`[ForgotPassword] OTP sent to ${emailRaw}`);
    } catch (sendErr) {
      // Log send error server-side, but still return the generic message to the client
      console.error(`[ForgotPassword] failed sending OTP to ${emailRaw}`, sendErr);
      // optionally clear otp fields on persistent failure to avoid orphan OTPs
      // user.otpHash = undefined; user.otpExpires = undefined; await user.save();
    }

    return NextResponse.json(
      { message: "If this email is registered, you will receive an OTP shortly." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Forgot password request error:", err);
    return NextResponse.json(
      { error: "Unable to process request at this time." },
      { status: 500 }
    );
  }
}
