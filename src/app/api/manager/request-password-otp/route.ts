// src/app/api/manager/request-password-otp/route.ts


import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Manager from "@/models/Manager";
import User from "@/models/User";
import nodemailer from "nodemailer";

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

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER!,
      to: adminEmail,
      subject: "Manager Password Reset OTP",
      text: `Your OTP for manager password reset: ${otp}`,
    });

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
