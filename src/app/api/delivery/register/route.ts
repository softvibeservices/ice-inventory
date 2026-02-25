// src/app/api/delivery/register/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
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

    // Normalize createdByUser to ObjectId
    let createdByUserObjId: mongoose.Types.ObjectId | null = null;
    if (createdByUser && mongoose.Types.ObjectId.isValid(createdByUser)) {
      createdByUserObjId = new mongoose.Types.ObjectId(createdByUser);
    }

    // Normalize adminId to ObjectId
    let adminIdObjId: mongoose.Types.ObjectId | null = null;
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      adminIdObjId = new mongoose.Types.ObjectId(adminId);
    }

    let adminEmail = adminEmailFromClient
      ? String(adminEmailFromClient).toLowerCase()
      : null;

    // ✅ Auto-populate createdByUser from adminEmail
    if (adminEmail && !createdByUserObjId) {
      const manager = await User.findOne({ email: adminEmail }).select("_id");
      if (manager) {
        createdByUserObjId = manager._id as mongoose.Types.ObjectId;
        adminIdObjId = manager._id as mongoose.Types.ObjectId;
      }
    }

    // Fallback: get email from user if no adminEmail
    if (!adminEmail && createdByUserObjId) {
      const owner = await User.findById(createdByUserObjId).select("email");
      if (owner?.email) adminEmail = owner.email.toLowerCase();
    }

    // 🔒 DUPLICATE CHECK
    const existingPartner = await DeliveryPartner.findOne({
      email: partnerEmail,
      createdByUser: createdByUserObjId,
    });

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
        existingPartner.name = name;
        existingPartner.phone = phone ?? existingPartner.phone;
        existingPartner.password = await bcrypt.hash(password, 10);
        existingPartner.createdByUser = createdByUserObjId as any;
        existingPartner.adminId = adminIdObjId as any;
        existingPartner.adminEmail = adminEmail ?? existingPartner.adminEmail;
        existingPartner.status = "pending";
        await existingPartner.save();

        return NextResponse.json(
          { message: "Re-registration request submitted", partnerId: existingPartner._id },
          { status: 200 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const partner = new DeliveryPartner({
      name,
      email: partnerEmail,
      phone,
      password: hashedPassword,
      createdByUser: createdByUserObjId,
      adminId: adminIdObjId,
      adminEmail,
      status: "pending",
    });
    await partner.save();

    return NextResponse.json(
      { message: "Delivery partner registered successfully", partnerId: partner._id, status: "pending" },
      { status: 201 }
    );
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return NextResponse.json({ error: "Unable to register delivery partner" }, { status: 500 });
  }
}
