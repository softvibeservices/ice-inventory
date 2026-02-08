// src/app/api/manager/request-password-otp/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Manager from "@/models/Manager";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { managerId, adminId } = await req.json();

    if (!managerId || !adminId) {
      return NextResponse.json(
        { error: "managerId & adminId required" },
        { status: 400 }
      );
    }

    const manager = await Manager.findById(managerId);
    if (!manager) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    // Don't allow password reset for pending managers
    if (manager.isPending) {
      return NextResponse.json({ 
        error: "Cannot reset password for pending manager" 
      }, { status: 400 });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const adminEmail = admin.email ?? admin.userEmail;
    if (!adminEmail) {
      return NextResponse.json(
        { error: "Admin email missing in user record" },
        { status: 500 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    manager.otp = otp;
    manager.otpExpires = new Date(Date.now() + 1000 * 60 * 10);
    await manager.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER!,
      to: adminEmail,
      subject: "Manager Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h2 style="color: #ffffff; margin: 0; text-align: center;">Manager Password Reset</h2>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px;">Hello Admin,</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              A password reset has been requested for manager <strong>${manager.name}</strong>. 
              Please use the following OTP to complete the password reset:
            </p>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 2px dashed #f5576c;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #f5576c; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #666; font-size: 13px; margin-top: 20px;">
              ⏱️ This OTP will expire in <strong>10 minutes</strong>.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              If you didn't request this, please contact your system administrator.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (e: any) {
    console.error("Error sending password reset OTP:", e);
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}