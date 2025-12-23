// src/app/api/delivery/register/route.ts



import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function generateOtp(len = 6) {
  const max = 10 ** len;
  return crypto.randomInt(0, max).toString().padStart(len, "0");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,

      createdByUser,
      adminId,                      // ✅ NEW FIELD
      adminEmail: adminEmailFromClient,
    } = body ?? {};

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // normalize values
    const partnerEmail = String(email).toLowerCase();
    const createdByUserNormalized = createdByUser ? String(createdByUser) : null;
    const adminIdNormalized = adminId ? String(adminId) : null;

    // determine admin email
    let adminEmail = adminEmailFromClient
      ? String(adminEmailFromClient).toLowerCase()
      : null;

    if (!adminEmail && createdByUser) {
      const owner = await User.findById(String(createdByUser)).select("email");
      if (owner) adminEmail = owner.email.toLowerCase();
    }

    // check existing partner (same shop + email)
    let partner = await DeliveryPartner.findOne({
      email: partnerEmail,
      createdByUser: createdByUserNormalized,
    });

    // CASE 1 — existing partner
    if (partner) {
      const s = String(partner.status).toLowerCase();

      if (s === "pending") {
        return NextResponse.json(
          { error: "Request already pending", partnerId: partner._id },
          { status: 409 }
        );
      }

      if (s === "approved") {
        return NextResponse.json(
          { error: "Partner already approved", partnerId: partner._id },
          { status: 409 }
        );
      }

      if (s === "rejected") {
        partner.name = name;
        partner.phone = phone ?? partner.phone;
        partner.adminEmail = adminEmail ?? partner.adminEmail;
        partner.adminId = adminIdNormalized ?? partner.adminId;   // ✅ STORE adminId
        partner.status = "pending";

        partner.password = await bcrypt.hash(password, 10);

        const otp = generateOtp();
        partner.otp = otp;
        partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

        await partner.save();

        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: partner.email,
            subject: "Delivery Partner Verification Code",
            text: `Your verification OTP is ${otp}`,
          });
        } catch {}

        return NextResponse.json(
          { message: "Re-request submitted", partnerId: partner._id },
          { status: 200 }
        );
      }
    }

    // CASE 2 — new partner
    const hashedPassword = await bcrypt.hash(password, 10);

    partner = new DeliveryPartner({
      name,
      email: partnerEmail,
      phone,
      password: hashedPassword,

      createdByUser: createdByUserNormalized,
      adminId: adminIdNormalized,        // ✅ STORE adminId
      adminEmail: adminEmail ?? null,

      status: "pending",
    });

    const otp = generateOtp();
    partner.otp = otp;
    partner.otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await partner.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Delivery Partner Verification Code",
        text: `Your verification OTP is ${otp}`,
      });
    } catch {}

    return NextResponse.json(
      {
        message: "Delivery partner registered",
        partnerId: partner._id,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return NextResponse.json(
      { error: "Unable to register delivery partner" },
      { status: 500 }
    );
  }
}
