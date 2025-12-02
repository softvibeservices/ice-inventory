// src/app/api/register/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { transporter } from "@/lib/nodemailer";
import bcrypt from "bcryptjs";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const CONTACT_REGEX = /^[0-9]{10}$/;

export async function POST(req: Request) {
  try {
    const {
      name,
      email,
      contact,
      shopName,
      shopAddress,
      gstin,
      password,
    } = await req.json();

    // Basic presence validation
    if (
      !name ||
      !email ||
      !contact ||
      !shopName ||
      !shopAddress ||
      !gstin ||
      !password
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Normalize & validate contact (digits only, 10 length)
    const normalizedContact = String(contact).replace(/\D/g, "");
    if (!CONTACT_REGEX.test(normalizedContact)) {
      return NextResponse.json(
        { error: "Invalid contact number (must be 10 digits)" },
        { status: 400 }
      );
    }

    // Validate GSTIN
    if (!GSTIN_REGEX.test(gstin)) {
      return NextResponse.json(
        { error: "Invalid GSTIN format" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check existing user (by email or GSTIN)
    const existing = await User.findOne({ $or: [{ email }, { gstin }] });
    if (existing) {
      return NextResponse.json(
        { error: "User with this email or GSTIN already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Create user (✅ includes contact)
    const newUser = new User({
      name,
      email,
      contact: normalizedContact,
      shopName,
      shopAddress,
      gstin,
      password: hashedPassword,
      otp,
      otpExpires,
    });

    await newUser.save();

    // Send OTP email
    await transporter.sendMail({
      from: `"IceCream Inventory" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "OTP Verification",
      text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
    });

    return NextResponse.json({ message: "OTP sent successfully" });
  } catch  {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
