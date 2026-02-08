// src/app/api/delivery/login-otp/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { transporter } from "@/lib/nodemailer";

function generateOtp(len = 6) {
  const max = 10 ** len;
  return crypto.randomInt(0, max).toString().padStart(len, "0");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    const partner = await DeliveryPartner.findOne({
      email: String(email).toLowerCase(),
    });
    
    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }
    
    // ✅ FIRST: Check password validity
    const match = await bcrypt.compare(password, partner.password);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 403 }
      );
    }
    
    // ✅ NEW: Return status info for pending/rejected users AFTER password check
    if (partner.status === "pending") {
      return NextResponse.json({
        message: "Account pending approval",
        partnerId: String(partner._id),
        status: "pending",
        email: partner.email,
      }, { status: 200 }); // ✅ Return 200, not 403!
    }
    
    if (partner.status === "rejected") {
      return NextResponse.json({
        message: "Account has been rejected",
        partnerId: String(partner._id),
        status: "rejected",
        email: partner.email,
      }, { status: 200 }); // ✅ Return 200, not 403!
    }
    
    // ✅ Only approved users get OTP
    if (partner.status !== "approved") {
      return NextResponse.json(
        { error: "Invalid account status" },
        { status: 403 }
      );
    }
    
    // Generate and send OTP for approved users
    const otp = generateOtp();
    partner.otp = otp;
    partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await partner.save();
    
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Delivery Partner Login OTP",
        text: `Your login OTP is ${otp}`,
      });
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr);
    }
    
    return NextResponse.json({
      message: "OTP sent",
      partnerId: String(partner._id),
      status: "approved", // ✅ Include status
      email: partner.email,
    });
    
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}