// src/app/api/delivery/register/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      password,
      createdByUser,
      adminId,
      adminEmail: adminEmailFromClient,
    } = body ?? {};

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const partnerEmail = String(email).toLowerCase().trim();
    const createdByUserNormalized = createdByUser ? String(createdByUser) : null;
    const adminIdNormalized = adminId ? String(adminId) : null;

    // determine admin email
    let adminEmail = adminEmailFromClient
      ? String(adminEmailFromClient).toLowerCase()
      : null;

    if (!adminEmail && createdByUserNormalized) {
      const owner = await User.findById(createdByUserNormalized).select("email");
      if (owner?.email) adminEmail = owner.email.toLowerCase();
    }

    // 🔒 STRONG DUPLICATE CHECK (email + shop)
    const existingPartner = await DeliveryPartner.findOne({
      email: partnerEmail,
      createdByUser: createdByUserNormalized,
    });

    // -------------------------------
    // CASE 1 — PARTNER ALREADY EXISTS
    // -------------------------------
    if (existingPartner) {
      const status = String(existingPartner.status).toLowerCase();

      if (status === "pending") {
        return NextResponse.json(
          { error: "Registration already pending approval" },
          { status: 409 }
        );
      }

      if (status === "approved") {
        return NextResponse.json(
          { error: "Delivery partner already approved" },
          { status: 409 }
        );
      }

      if (status === "rejected") {
        // ♻️ Re-request using SAME RECORD
        existingPartner.name = name;
        existingPartner.phone = phone ?? existingPartner.phone;
        existingPartner.password = await bcrypt.hash(password, 10);
        existingPartner.adminId = adminIdNormalized ?? existingPartner.adminId;
        existingPartner.adminEmail = adminEmail ?? existingPartner.adminEmail;
        existingPartner.status = "pending";

        await existingPartner.save();

        return NextResponse.json(
          {
            message: "Re-registration request submitted",
            partnerId: existingPartner._id,
          },
          { status: 200 }
        );
      }
    }

    // -------------------------------
    // CASE 2 — NEW PARTNER
    // -------------------------------
    const hashedPassword = await bcrypt.hash(password, 10);

    const partner = new DeliveryPartner({
      name,
      email: partnerEmail,
      phone,
      password: hashedPassword,
      createdByUser: createdByUserNormalized,
      adminId: adminIdNormalized,
      adminEmail,
      status: "pending",
    });

    await partner.save();

    return NextResponse.json(
      {
        message: "Delivery partner registered successfully",
        partnerId: partner._id,
        status: "pending",
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