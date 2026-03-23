// src/app/api/delivery/reject/route.ts

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { transporter } from "@/lib/nodemailer";
import { verifyUserRequest } from "@/lib/userAuth";

export async function PATCH(req: Request) {
  const auth = await verifyUserRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (auth.role === "manager") {
    return NextResponse.json(
      { error: "Managers cannot reject delivery partners" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId } = body ?? {};

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    await connectDB();

    const { default: User } = await import("@/models/User");
    const adminUser = await User.findById(auth.userId).select("email");
    const adminEmail = adminUser?.email ? String(adminUser.email).toLowerCase() : null;

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partnerAdminEmail = partner.adminEmail ? String(partner.adminEmail).toLowerCase() : null;
    const partnerCreatedBy = partner.createdByUser ? partner.createdByUser.toString() : null;

    const isAuthorized =
      (partnerCreatedBy && auth.userId === partnerCreatedBy) ||
      (adminEmail && partnerAdminEmail && adminEmail === partnerAdminEmail) ||
      (!partnerCreatedBy && adminEmail && partnerAdminEmail && adminEmail === partnerAdminEmail) ||
      (!partnerAdminEmail && partnerCreatedBy && auth.userId === partnerCreatedBy);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Not authorized to reject this partner" },
        { status: 403 }
      );
    }

    partner.status = "rejected";
    partner.notifiedAt = new Date();

    if (!partner.adminEmail && adminEmail) {
      partner.adminEmail = adminEmail;
    }

    if (!partner.createdByUser && mongoose.Types.ObjectId.isValid(auth.userId)) {
      partner.createdByUser = new mongoose.Types.ObjectId(auth.userId) as any;
    }

    await partner.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: partner.email,
        subject: "Delivery Partner Request — Rejected",
        html: `<p>Hello ${partner.name},</p>
               <p>We're sorry — your delivery partner request has been <strong>rejected</strong>. Contact the shop owner for details.</p>
               <p>— IceCream Inventory</p>`,
      });
    } catch (e) {
      console.error("[delivery/reject] partner notification failed", e);
    }

    return NextResponse.json({ message: "Partner rejected", partner });
  } catch (err: any) {
    console.error("PATCH /api/delivery/reject error:", err);
    return NextResponse.json({ error: "Failed to reject partner" }, { status: 500 });
  }
}