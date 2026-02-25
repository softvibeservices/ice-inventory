// src/app/api/delivery/approve/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import DeliveryPartner from "@/models/DeliveryPartner";
import { transporter } from "@/lib/nodemailer";
import User from "@/models/User";

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { partnerId, userId } = body ?? {};

    if (!partnerId) return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    await connectDB();

    const adminUser = await User.findById(userId).select("email role");
    if (!adminUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (adminUser.role === "manager") {
      return NextResponse.json({ error: "Managers cannot approve delivery partners" }, { status: 403 });
    }

    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

    const adminEmail = adminUser.email ? String(adminUser.email).toLowerCase() : null;
    const partnerAdminEmail = partner.adminEmail ? String(partner.adminEmail).toLowerCase() : null;
    // createdByUser is now ObjectId — compare using toString()
    const partnerCreatedBy = partner.createdByUser ? partner.createdByUser.toString() : null;

    const isAuthorized =
      (userId && partnerCreatedBy && userId === partnerCreatedBy) ||
      (adminEmail && partnerAdminEmail && adminEmail === partnerAdminEmail) ||
      (!partnerCreatedBy && adminEmail && partnerAdminEmail && adminEmail === partnerAdminEmail) ||
      (!partnerAdminEmail && partnerCreatedBy && userId === partnerCreatedBy);

    if (!isAuthorized) {
      console.error("Authorization failed:", { userId, adminEmail, partnerCreatedBy, partnerAdminEmail });
      return NextResponse.json({ error: "Not authorized to approve this partner" }, { status: 403 });
    }

    partner.status = "approved";
    partner.notifiedAt = new Date();

    if (!partner.adminEmail && adminEmail) {
      partner.adminEmail = adminEmail;
    }

    if (!partner.createdByUser && userId && mongoose.Types.ObjectId.isValid(userId)) {
      partner.createdByUser = new mongoose.Types.ObjectId(userId) as any;
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
