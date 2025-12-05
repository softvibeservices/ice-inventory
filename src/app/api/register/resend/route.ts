// src/app/api/register/resend/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";
import { transporter } from "@/lib/nodemailer";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const COOLDOWN_SECONDS = 60;

function generateNumericOtp(len = OTP_LENGTH) {
  const max = 10 ** len;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(len, "0");
}

function buildRegisterEmailHtml({
  appName,
  otp,
  expiresMinutes,
  supportEmail,
  frontendUrl,
  shopName,
  userName,
}: {
  appName?: string;
  otp: string;
  expiresMinutes: number;
  supportEmail?: string;
  frontendUrl?: string;
  shopName?: string;
  userName?: string;
}) {
  const safeApp = appName || "IceCream Inventory";
  const safeSupport = supportEmail || process.env.EMAIL_USER || "support@yourdomain.com";
  const safeFrontend = frontendUrl || "";
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial; background:#f7fafc; margin:0; padding:32px;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,0.08);"><div style="padding:20px 24px;background:linear-gradient(90deg,#EFF6FF,#A7F3D0);"><h2 style="margin:0;color:#0f172a;font-size:18px;">${safeApp}</h2></div><div style="padding:22px;"><p>Hello ${userName ?? "there"},</p><p>Use the verification code below to activate your account.</p><div style="margin:18px 0;display:flex;align-items:center;justify-content:center;"><div style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;font-size:22px;letter-spacing:4px;">${otp}</div></div><p>This code will expire in <strong>${expiresMinutes} minutes</strong>.</p><p>If you did not sign up, ignore this email or contact <a href="mailto:${safeSupport}">${safeSupport}</a>.</p><hr style="border:none;border-top:1px solid #eef2ff;margin:18px 0;" /><p style="color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ${safeApp}.</p></div></div></body></html>`;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const emailNorm = String(email).trim().toLowerCase();

    await connectDB();

    const user: any = await User.findOne({ email: emailNorm });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.isVerified) return NextResponse.json({ error: "User already verified" }, { status: 400 });

    // cooldown check using otpRequestedAt
    const last = user.otpRequestedAt ? new Date(user.otpRequestedAt) : null;
    if (last) {
      const secondsSince = Math.floor((Date.now() - last.getTime()) / 1000);
      if (secondsSince < COOLDOWN_SECONDS) {
        return NextResponse.json({
          error: "Too many requests. Please wait.",
          waitSeconds: COOLDOWN_SECONDS - secondsSince,
        }, { status: 429 });
      }
    }

    // generate OTP, store plain in user model
    const otp = generateNumericOtp();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.otpRequestedAt = new Date();
    await user.save();

    // send mail
    const appName = process.env.APP_NAME || "IceCream Inventory";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@yourdomain.com";
    const frontendUrl = process.env.FRONTEND_URL || "";

    const html = buildRegisterEmailHtml({
      appName,
      otp,
      expiresMinutes: OTP_TTL_MINUTES,
      supportEmail,
      frontendUrl,
      shopName: user.shopName,
      userName: user.name,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `${appName} — Your verification code`,
      text: `Your verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      html,
    });

    return NextResponse.json({ message: "OTP resent to registered email" });
  } catch (err: any) {
    console.error("[register/resend] error:", err);
    return NextResponse.json({ error: "Unable to resend OTP" }, { status: 500 });
  }
}
