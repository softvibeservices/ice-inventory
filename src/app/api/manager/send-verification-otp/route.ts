// src/app/api/manager/send-verification-otp/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, name, adminId } = await req.json();

    if (!email || !name || !adminId) {
      return NextResponse.json(
        { error: "Email, name, and adminId are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return NextResponse.json({ error: "Invalid adminId" }, { status: 400 });
    }

    const adminObjId = new mongoose.Types.ObjectId(adminId);

    const existingVerifiedManager = await User.findOne({
      adminId: adminObjId,
      email,
      role: "manager",
      isPending: { $ne: true },
    });

    if (existingVerifiedManager) {
      return NextResponse.json(
        { error: "Manager with this email already exists" },
        { status: 409 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const tempData = {
      email,
      name,
      adminId: adminObjId,
      role: "manager",
      otp,
      otpExpires: new Date(Date.now() + 1000 * 60 * 10),
      isPending: true,
      isVerified: false,
      password: "TEMP_PASSWORD",
      contact: "TEMP_CONTACT",
    };

    await User.deleteMany({
      email,
      adminId: adminObjId,
      role: "manager",
      isPending: true,
    });

    await User.create(tempData);

    await transporter.sendMail({
      from: process.env.EMAIL_USER!,
      to: email,
      subject: "Manager Account Verification OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #ffffff; margin: 0; text-align: center;">Manager Account Verification</h2>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px;">Hello <strong>${name}</strong>,</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              You have been invited to join as a manager. Please use the following OTP to verify your email address:
            </p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 2px dashed #667eea;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #666; font-size: 13px; margin-top: 20px;">
              ⏱️ This OTP will expire in <strong>10 minutes</strong>.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "OTP sent to manager's email" });
  } catch (e: any) {
    console.error("Error sending verification OTP:", e);
    return NextResponse.json({ error: e.message || "Failed to send OTP" }, { status: 500 });
  }
}
