// src/app/api/products/empty-otp/route.ts
// Sends a 6-digit OTP to the admin's registered email address.
// Called before emptying all stock — the OTP must then be submitted
// with the POST /api/products/empty request.

import { NextResponse } from "next/server";
import { connectDB }      from "@/lib/mongodb";
import User               from "@/models/User";
import { verifyUserRequest } from "@/lib/userAuth";
import { transporter }    from "@/lib/nodemailer";

export async function POST(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate a 6-digit OTP valid for 10 minutes
    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp           = otp;
    user.otpExpires    = expires;
    user.otpRequestedAt = new Date();
    await user.save();

    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      user.email,
      subject: "⚠️ Empty Stock Confirmation OTP — Ice Saathi",
      text: `Your OTP to confirm EMPTY ALL STOCK is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email. No stock was changed.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
          <div style="background:#dc2626;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:20px;">⚠️ Empty Stock Confirmation</h2>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 16px;color:#374151;">
              A request was made to <strong>empty all product stock quantities</strong> in your
              Ice Saathi inventory. Please use the OTP below to confirm this action.
            </p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:20px;text-align:center;margin-bottom:16px;">
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">Your One-Time Password</p>
              <p style="margin:0;font-size:36px;font-weight:700;color:#dc2626;letter-spacing:8px;">${otp}</p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Valid for 10 minutes</p>
            </div>
            <p style="margin:0;font-size:13px;color:#9ca3af;">
              If you did not request this, please ignore this email — no stock was changed.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ message: "OTP sent to your registered email address" });
  } catch (error) {
    console.error("[empty-otp] error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}