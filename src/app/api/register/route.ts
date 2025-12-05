// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const COOLDOWN_SECONDS = 60;

// basic validations
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const CONTACT_RE = /^[0-9]{10}$/;
// GSTIN relaxed check (uppercased). Keep previous stricter regex if you want.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;

function generateNumericOtp(len = OTP_LENGTH) {
  const max = 10 ** len;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(len, "0");
}

function hashValue(v: string) {
  return crypto.createHash("sha256").update(v).digest("hex");
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
  appName: string;
  otp: string;
  expiresMinutes: number;
  supportEmail: string;
  frontendUrl?: string;
  shopName?: string;
  userName?: string;
}) {
  const safeApp = appName || "IceCream Inventory";
  const safeSupport = supportEmail || "support@yourdomain.com";
  const safeFrontend = frontendUrl || "";
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${safeApp} — Verify your account</title>
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial; background:#f7fafc; margin:0; padding:32px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,0.08);">
        <div style="padding:20px 24px;background:linear-gradient(90deg,#EFF6FF,#A7F3D0);">
          <a href="${safeFrontend}" style="color:inherit;text-decoration:none;">
            <h2 style="margin:0;color:#0f172a;font-size:18px;">${safeApp}</h2>
          </a>
        </div>
        <div style="padding:22px;">
          <p style="margin:0 0 12px 0;color:#111827;font-size:15px;">
            Hello ${userName ? userName : "there"}, thank you for creating an account${shopName ? ` for ${shopName}` : ""}.
          </p>
          <p style="margin:0 0 12px 0;color:#374151;font-size:13px;">
            Use the verification code below to activate your account.
          </p>

          <div style="margin:18px 0;display:flex;align-items:center;justify-content:center;">
            <div style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;font-size:22px;letter-spacing:4px;">
              ${otp}
            </div>
          </div>

          <p style="margin:0 0 12px 0;color:#6b7280;font-size:13px;">
            This code will expire in <strong>${expiresMinutes} minutes</strong>. Do not share this code with anyone.
          </p>

          <p style="margin:0 0 18px 0;color:#9ca3af;font-size:12px;">
            If you did not sign up, please ignore this email or contact our support at <a href="mailto:${safeSupport}" style="color:#2563eb;text-decoration:underline">${safeSupport}</a>.
          </p>

          <hr style="border:none;border-top:1px solid #eef2ff;margin:18px 0;" />
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            © ${new Date().getFullYear()} ${safeApp}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
  </html>`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      contact,
      shopName,
      shopAddress,
      gstin,
      password,
    } = body ?? {};

    // presence check
    if (
      !name ||
      !email ||
      !contact ||
      !shopName ||
      !shopAddress ||
      !gstin ||
      !password
    ) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    // basic normalization
    const emailNorm = String(email).trim().toLowerCase();
    const contactNorm = String(contact).replace(/\D/g, "").trim();
    const gstinNorm = String(gstin).trim().toUpperCase();
    const shopAddressNorm = String(shopAddress).trim().slice(0, 1000); // limit length

    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    if (!CONTACT_RE.test(contactNorm)) {
      return NextResponse.json({ error: "Contact must be 10 digits." }, { status: 400 });
    }

    if (!GSTIN_RE.test(gstinNorm)) {
      return NextResponse.json({ error: "Invalid GSTIN format." }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    // optional: stronger password checks (uppercase, number, symbol) — can be enabled on demand
    // if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) { ... }

    await connectDB();

    // check duplicates by email or GSTIN
    const exists = await User.findOne({ $or: [{ email: emailNorm }, { gstin: gstinNorm }] });
    if (exists) {
      // avoid revealing which one exists — generic message
      return NextResponse.json({ error: "An account with provided details already exists." }, { status: 400 });
    }

    // create user skeleton
    const hashedPassword = await bcrypt.hash(String(password), 10);

    // generate OTP and store its hash
    const otp = generateNumericOtp();
    const otpHash = hashValue(otp);
    const otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const now = new Date();

    const newUser = new User({
      name: String(name).trim(),
      email: emailNorm,
      contact: contactNorm,
      shopName: String(shopName).trim(),
      shopAddress: shopAddressNorm,
      gstin: gstinNorm,
      password: hashedPassword,
      // verification fields
      isVerified: false,
      otpHash,
      otpExpires,
      otpRequestedAt: now,
      createdAt: now,
    });

    await newUser.save();

    // send verification email
    const appName = process.env.APP_NAME || "IceCream Inventory";
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER || "support@yourdomain.com";
    const frontendUrl = process.env.FRONTEND_URL || "";

    const html = buildRegisterEmailHtml({
      appName,
      otp,
      expiresMinutes: OTP_TTL_MINUTES,
      supportEmail,
      frontendUrl,
      shopName: newUser.shopName,
      userName: newUser.name,
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: newUser.email,
        subject: `${appName} — Verify your account`,
        text: `Welcome to ${appName}. Your verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
        html,
      });
    } catch (mailErr) {
      console.error("[register] failed to send verification email", mailErr);
      // you may choose to delete newUser here or mark it as pending with resend token
      // await User.deleteOne({ _id: newUser._id });
      // but for now respond with created and ask user to request resend
      return NextResponse.json({
        message: "Account created but verification email could not be sent. Please contact support.",
      }, { status: 201 });
    }

    return NextResponse.json({ message: "Account created. A verification code has been sent to the provided email." }, { status: 201 });
  } catch (err: any) {
    console.error("[register] error:", err);
    return NextResponse.json({ error: "Unable to register at the moment." }, { status: 500 });
  }
}
