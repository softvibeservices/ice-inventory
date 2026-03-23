// src/app/api/delivery/approve/route.ts

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
      { error: "Managers cannot approve delivery partners" },
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

    // Get admin email for notification/ownership check
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
        { error: "Not authorized to approve this partner" },
        { status: 403 }
      );
    }

    partner.status = "approved";
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
        subject: "Delivery Partner Approved",
        html: `<p>Hello ${partner.name},</p>
               <p>Your registration as a delivery partner has been <strong>approved</strong>. You can now login using OTP.</p>
               <p>— IceCream Inventory</p>`,
      });
    } catch (e) {
      console.error("[delivery/approve] partner notification failed", e);
    }

    return NextResponse.json({ message: "Partner approved", partner });
  } catch (err: any) {
    console.error("PATCH /api/delivery/approve error:", err);
    return NextResponse.json({ error: "Failed to approve partner" }, { status: 500 });
  }
}